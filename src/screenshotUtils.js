/**
 * Athena Proctoring — Webcam Screenshot Utilities
 * Handles periodic still capture from active webcam stream,
 * in-memory Blob management, and lifecycle cleanup.
 */

export const DEFAULT_SCREENSHOT_INTERVAL_SECONDS = 30;

/**
 * Formats a Date or timestamp into a readable HH:MM:SS string.
 * @param {Date|number} dateOrTimestamp
 * @returns {string} Formatted time string
 */
export function formatTimestamp(dateOrTimestamp) {
  const date = dateOrTimestamp instanceof Date ? dateOrTimestamp : new Date(dateOrTimestamp);
  if (isNaN(date.getTime())) {
    return '--:--:--';
  }
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Checks if a MediaStream is active and has at least one live video track.
 * @param {MediaStream|null} stream
 * @returns {boolean}
 */
export function isStreamLive(stream) {
  if (!stream || !stream.active) return false;
  const tracks = typeof stream.getVideoTracks === 'function' ? stream.getVideoTracks() : stream.tracks;
  if (!Array.isArray(tracks) || tracks.length === 0) return false;
  return tracks.some((track) => track && track.readyState === 'live');
}

/**
 * Validates whether screenshot capture can proceed.
 * @param {Object} params
 * @param {boolean} params.isExamActive - Whether test has started and is not completed
 * @param {boolean} params.hasConsent - Whether candidate gave explicit acknowledgement
 * @param {MediaStream|null} params.stream - Active webcam stream
 * @returns {{ allowed: boolean, reason: string|null }}
 */
export function validateCapturePreconditions({ isExamActive, hasConsent, stream }) {
  if (!hasConsent) {
    return { allowed: false, reason: 'Screenshot consent has not been granted.' };
  }
  if (!isExamActive) {
    return { allowed: false, reason: 'Examination is not active.' };
  }
  if (!isStreamLive(stream)) {
    return { allowed: false, reason: 'Active camera stream is not available or disconnected.' };
  }
  return { allowed: true, reason: null };
}

/**
 * Captures a single still frame from an HTMLVideoElement and returns an image Blob.
 * Uses HTMLCanvasElement and canvas.toBlob.
 * @param {HTMLVideoElement} videoElement
 * @param {string} [mimeType='image/jpeg']
 * @param {number} [quality=0.85]
 * @returns {Promise<Blob>}
 */
export async function captureVideoFrameToBlob(videoElement, mimeType = 'image/jpeg', quality = 0.85) {
  if (!videoElement) {
    throw new Error('Video element is not available for capture.');
  }

  const width = videoElement.videoWidth || (videoElement.getBoundingClientRect ? videoElement.getBoundingClientRect().width : 0) || 640;
  const height = videoElement.videoHeight || (videoElement.getBoundingClientRect ? videoElement.getBoundingClientRect().height : 0) || 480;

  if (width <= 0 || height <= 0) {
    throw new Error('Video dimensions are invalid or feed has not yet started rendering.');
  }

  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (!canvas || typeof canvas.getContext !== 'function') {
    throw new Error('Canvas rendering context is not supported in this environment.');
  }

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to acquire 2D canvas context.');
  }

  // Draw current video frame to canvas
  ctx.drawImage(videoElement, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    if (typeof canvas.toBlob === 'function') {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas toBlob returned null.'));
          }
        },
        mimeType,
        quality
      );
    } else if (typeof canvas.toDataURL === 'function') {
      // Fallback for environments lacking toBlob
      try {
        const dataUrl = canvas.toDataURL(mimeType, quality);
        const parts = dataUrl.split(',');
        const binary = atob(parts[1]);
        const array = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          array[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([array], { type: mimeType });
        resolve(blob);
      } catch (err) {
        reject(err);
      }
    } else {
      reject(new Error('Canvas blob export not supported in this environment.'));
    }
  });
}

/**
 * Creates an in-memory screenshot item from a Blob.
 * @param {Blob} blob
 * @returns {{ id: string, blob: Blob, objectUrl: string, timestamp: number, displayTime: string }}
 */
export function createScreenshotRecord(blob) {
  const timestamp = Date.now();
  const id = `snap_${timestamp}_${Math.random().toString(36).slice(2, 8)}`;
  const objectUrl = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
    ? URL.createObjectURL(blob)
    : '';

  return {
    id,
    blob,
    objectUrl,
    timestamp,
    displayTime: formatTimestamp(timestamp)
  };
}

/**
 * Revokes a single screenshot's object URL from browser memory.
 * @param {Object} screenshot
 */
export function revokeScreenshotUrl(screenshot) {
  if (screenshot && screenshot.objectUrl && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
    try {
      URL.revokeObjectURL(screenshot.objectUrl);
    } catch {
      // Ignore URL revocation errors
    }
    screenshot.objectUrl = '';
  }
}

/**
 * Revokes all screenshot object URLs in an array.
 * @param {Array<Object>} screenshots
 */
export function revokeAllScreenshotUrls(screenshots) {
  if (!Array.isArray(screenshots)) return;
  screenshots.forEach((s) => revokeScreenshotUrl(s));
}

/**
 * Controller class to manage periodic capture lifecycle without overlapping executions
 * and without crashing or resetting the examination timer.
 */
export class ScreenshotCaptureController {
  constructor(options = {}) {
    this.intervalSeconds = options.intervalSeconds || DEFAULT_SCREENSHOT_INTERVAL_SECONDS;
    this.timerId = null;
    this.isCapturing = false;
    this.status = 'idle'; // 'idle' | 'active' | 'capturing' | 'stopped' | 'error'
    this.lastError = null;
    this.onCapture = options.onCapture || (() => {});
    this.onError = options.onError || (() => {});
    this.onStatusChange = options.onStatusChange || (() => {});
    this.getVideoElement = options.getVideoElement || (() => null);
    this.getStream = options.getStream || (() => null);
    this.getConsent = options.getConsent || (() => false);
    this.getIsExamActive = options.getIsExamActive || (() => false);
  }

  setIntervalSeconds(seconds) {
    const val = Math.max(1, Math.floor(Number(seconds) || DEFAULT_SCREENSHOT_INTERVAL_SECONDS));
    this.intervalSeconds = val;
    // If already active, restart interval with new timing
    if (this.timerId) {
      this.stop();
      this.start();
    }
  }

  setStatus(newStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.onStatusChange(newStatus);
    }
  }

  async executeSingleCapture() {
    // Prevent overlapping capture operations
    if (this.isCapturing) {
      return null;
    }

    const preconditions = validateCapturePreconditions({
      isExamActive: this.getIsExamActive(),
      hasConsent: this.getConsent(),
      stream: this.getStream()
    });

    if (!preconditions.allowed) {
      this.lastError = preconditions.reason;
      if (!this.getIsExamActive()) {
        this.stop();
      }
      return null;
    }

    this.isCapturing = true;
    this.setStatus('capturing');

    try {
      const videoEl = this.getVideoElement();
      if (!videoEl) {
        throw new Error('Camera video element not located.');
      }

      const blob = await captureVideoFrameToBlob(videoEl);
      const record = createScreenshotRecord(blob);
      this.setStatus('active');
      this.onCapture(record);
      return record;
    } catch (err) {
      this.lastError = err.message || 'Capture failed';
      this.setStatus('active'); // Return to active state so interval continues without crashing
      this.onError(err);
      return null;
    } finally {
      this.isCapturing = false;
    }
  }

  start() {
    // Prevent duplicate intervals
    this.stop();

    const preconditions = validateCapturePreconditions({
      isExamActive: this.getIsExamActive(),
      hasConsent: this.getConsent(),
      stream: this.getStream()
    });

    if (!preconditions.allowed) {
      this.setStatus('idle');
      return false;
    }

    this.setStatus('active');

    // Schedule periodic captures
    this.timerId = setInterval(() => {
      // Ensure exam has not completed
      if (!this.getIsExamActive()) {
        this.stop();
        return;
      }
      this.executeSingleCapture();
    }, this.intervalSeconds * 1000);

    return true;
  }

  stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isCapturing = false;
    this.setStatus('stopped');
  }
}
