import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SCREENSHOT_INTERVAL_SECONDS,
  formatTimestamp,
  isStreamLive,
  validateCapturePreconditions,
  createScreenshotRecord,
  saveScreenshotRecord,
  revokeScreenshotUrl,
  revokeAllScreenshotUrls,
  ScreenshotCaptureController
} from '../src/screenshotUtils.js';

describe('Webcam Screenshot — Consent & Preconditions', () => {
  const mockLiveStream = {
    active: true,
    getVideoTracks: () => [{ readyState: 'live' }]
  };

  it('rejects capture when candidate consent has not been provided', () => {
    const result = validateCapturePreconditions({
      isExamActive: true,
      hasConsent: false,
      stream: mockLiveStream
    });
    assert.equal(result.allowed, false);
    assert.match(result.reason, /consent has not been granted/i);
  });

  it('rejects capture when examination is not active (before start)', () => {
    const result = validateCapturePreconditions({
      isExamActive: false,
      hasConsent: true,
      stream: mockLiveStream
    });
    assert.equal(result.allowed, false);
    assert.match(result.reason, /examination is not active/i);
  });

  it('rejects capture when active stream is missing or null', () => {
    const result = validateCapturePreconditions({
      isExamActive: true,
      hasConsent: true,
      stream: null
    });
    assert.equal(result.allowed, false);
    assert.match(result.reason, /camera stream is not available/i);
  });

  it('rejects capture when camera track has ended or disconnected', () => {
    const endedStream = {
      active: true,
      getVideoTracks: () => [{ readyState: 'ended' }]
    };
    const result = validateCapturePreconditions({
      isExamActive: true,
      hasConsent: true,
      stream: endedStream
    });
    assert.equal(result.allowed, false);
  });

  it('allows capture when exam is active, consent is given, and camera is live', () => {
    const result = validateCapturePreconditions({
      isExamActive: true,
      hasConsent: true,
      stream: mockLiveStream
    });
    assert.equal(result.allowed, true);
    assert.equal(result.reason, null);
  });

  it('correctly evaluates stream live status with isStreamLive', () => {
    assert.equal(isStreamLive(null), false);
    assert.equal(isStreamLive({ active: false }), false);
    assert.equal(isStreamLive({ active: true, tracks: [] }), false);
    assert.equal(isStreamLive(mockLiveStream), true);
  });
});

describe('Webcam Screenshot — Scheduling & Configurable Interval', () => {
  it('default interval is configured to exactly 5 seconds', () => {
    assert.equal(DEFAULT_SCREENSHOT_INTERVAL_SECONDS, 5);
  });

  it('accepts configurable custom intervals', () => {
    const controller = new ScreenshotCaptureController({
      intervalSeconds: 15
    });
    assert.equal(controller.intervalSeconds, 15);

    controller.setIntervalSeconds(45);
    assert.equal(controller.intervalSeconds, 45);

    // Negative or non-number falls back safely
    controller.setIntervalSeconds(-5);
    assert.equal(controller.intervalSeconds, 5);
  });

  it('prevents duplicate capture intervals when start() is called repeatedly', () => {
    let timerClears = 0;
    const origClearInterval = globalThis.clearInterval;
    globalThis.clearInterval = (...args) => {
      timerClears++;
      return origClearInterval(...args);
    };

    try {
      const controller = new ScreenshotCaptureController({
        intervalSeconds: 10,
        getIsExamActive: () => true,
        getConsent: () => true,
        getStream: () => ({ active: true, getVideoTracks: () => [{ readyState: 'live' }] })
      });

      controller.start();
      const firstTimerId = controller.timerId;
      assert.ok(firstTimerId !== null);

      // Call start again
      controller.start();
      const secondTimerId = controller.timerId;
      assert.ok(secondTimerId !== null);
      assert.ok(timerClears >= 1, 'Previous interval was cleared before creating a new one');

      controller.stop();
    } finally {
      globalThis.clearInterval = origClearInterval;
    }
  });
});

describe('Webcam Screenshot — Overlapping Prevention & Error Safety', () => {
  it('prevents overlapping capture operations when a capture is already in progress', async () => {
    const controller = new ScreenshotCaptureController({
      getIsExamActive: () => true,
      getConsent: () => true,
      getStream: () => ({ active: true, getVideoTracks: () => [{ readyState: 'live' }] })
    });

    // Simulate in-flight capture
    controller.isCapturing = true;
    const result = await controller.executeSingleCapture();
    assert.equal(result, null, 'Should immediately return null and not proceed when capture is already active');
  });

  it('safely catches capture errors without throwing or crashing caller', async () => {
    let capturedError = null;
    const controller = new ScreenshotCaptureController({
      getIsExamActive: () => true,
      getConsent: () => true,
      getStream: () => ({ active: true, getVideoTracks: () => [{ readyState: 'live' }] }),
      getVideoElement: () => null, // Trigger missing video element error
      onError: (err) => {
        capturedError = err;
      }
    });

    // Must not throw uncaught error
    const result = await controller.executeSingleCapture();
    assert.equal(result, null);
    assert.ok(capturedError !== null);
    assert.match(capturedError.message, /video element/i);
    assert.equal(controller.isCapturing, false, 'isCapturing flag is reset even after failure');
  });

  it('never captures frames after examination has ended', async () => {
    let captured = false;
    let examActive = true;

    const controller = new ScreenshotCaptureController({
      getIsExamActive: () => examActive,
      getConsent: () => true,
      getStream: () => ({ active: true, getVideoTracks: () => [{ readyState: 'live' }] }),
      onCapture: () => {
        captured = true;
      }
    });

    // Examination ends
    examActive = false;
    const result = await controller.executeSingleCapture();
    assert.equal(result, null);
    assert.equal(captured, false);
    assert.equal(controller.status, 'stopped');
  });
});

describe('Webcam Screenshot — Deletion & Object URL Revocation', () => {
  it('formats timestamps cleanly into HH:MM:SS format', () => {
    const fixedDate = new Date(2026, 9, 25, 14, 5, 9);
    assert.equal(formatTimestamp(fixedDate), '14:05:09');
    assert.equal(formatTimestamp('invalid'), '--:--:--');
  });

  it('revokes single object URL and clears reference', () => {
    let revokedUrl = null;
    const origRevoke = globalThis.URL?.revokeObjectURL;
    if (!globalThis.URL) globalThis.URL = {};
    globalThis.URL.revokeObjectURL = (url) => {
      revokedUrl = url;
    };

    try {
      const shot = {
        id: 'test_1',
        objectUrl: 'blob:http://localhost/test-uuid',
        displayTime: '12:00:00'
      };

      revokeScreenshotUrl(shot);
      assert.equal(revokedUrl, 'blob:http://localhost/test-uuid');
      assert.equal(shot.objectUrl, '');
    } finally {
      if (origRevoke) globalThis.URL.revokeObjectURL = origRevoke;
    }
  });

  it('revokes all object URLs when clearing gallery', () => {
    const revokedUrls = [];
    const origRevoke = globalThis.URL?.revokeObjectURL;
    if (!globalThis.URL) globalThis.URL = {};
    globalThis.URL.revokeObjectURL = (url) => {
      revokedUrls.push(url);
    };

    try {
      const screenshots = [
        { id: '1', objectUrl: 'blob:http://localhost/1' },
        { id: '2', objectUrl: 'blob:http://localhost/2' },
        { id: '3', objectUrl: 'blob:http://localhost/3' }
      ];

      revokeAllScreenshotUrls(screenshots);
      assert.equal(revokedUrls.length, 3);
      assert.deepEqual(revokedUrls, [
        'blob:http://localhost/1',
        'blob:http://localhost/2',
        'blob:http://localhost/3'
      ]);
      assert.equal(screenshots[0].objectUrl, '');
      assert.equal(screenshots[1].objectUrl, '');
      assert.equal(screenshots[2].objectUrl, '');
    } finally {
      if (origRevoke) globalThis.URL.revokeObjectURL = origRevoke;
    }
  });

  it('creates screenshot record with unique ID and timestamp', () => {
    const origCreate = globalThis.URL?.createObjectURL;
    if (!globalThis.URL) globalThis.URL = {};
    globalThis.URL.createObjectURL = () => 'blob:http://localhost/mock-url';

    try {
      const mockBlob = { size: 1024, type: 'image/jpeg' };
      const record = createScreenshotRecord(mockBlob);
      assert.ok(record.id.startsWith('snap_'));
      assert.equal(record.blob, mockBlob);
      assert.equal(record.objectUrl, 'blob:http://localhost/mock-url');
      assert.ok(typeof record.timestamp === 'number');
      assert.match(record.displayTime, /^\d{2}:\d{2}:\d{2}$/);
    } finally {
      if (origCreate) globalThis.URL.createObjectURL = origCreate;
    }
  });
});

describe('Webcam Screenshot — Storage to screenshots directory', () => {
  it('saves screenshot record to disk using storageApi', async () => {
    let savedPayload = null;
    const mockStorageApi = {
      saveScreenshot: async (payload) => {
        savedPayload = payload;
        return {
          success: true,
          filePath: `/Users/app/screenshots/${payload.filename}`,
          filename: payload.filename
        };
      }
    };

    const mockBlob = new Blob([new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0])], { type: 'image/jpeg' });
    const record = {
      id: 'snap_123',
      filename: 'snap_123.jpg',
      blob: mockBlob,
      savedPath: null
    };

    const res = await saveScreenshotRecord(record, mockStorageApi);
    assert.equal(res.success, true);
    assert.equal(record.savedPath, '/Users/app/screenshots/snap_123.jpg');
    assert.ok(savedPayload !== null);
    assert.equal(savedPayload.filename, 'snap_123.jpg');
    assert.ok(savedPayload.data instanceof Uint8Array);
  });

  it('gracefully returns error when storageApi or record is missing', async () => {
    const resNoRecord = await saveScreenshotRecord(null, {});
    assert.equal(resNoRecord.success, false);
    assert.match(resNoRecord.error, /missing/i);

    const resNoApi = await saveScreenshotRecord({ blob: new Blob([]) }, null);
    assert.equal(resNoApi.success, false);
    assert.match(resNoApi.error, /not available/i);
  });

  it('auto-saves captured screenshots when storageApi is provided in controller', async () => {
    let savedRecordFilename = null;
    const mockStorageApi = {
      saveScreenshot: async (payload) => {
        savedRecordFilename = payload.filename;
        return {
          success: true,
          filePath: `/screenshots/${payload.filename}`,
          filename: payload.filename
        };
      }
    };

    let capturedRecord = null;
    const controller = new ScreenshotCaptureController({
      intervalSeconds: 5,
      storageApi: mockStorageApi,
      autoSave: true,
      getIsExamActive: () => true,
      getConsent: () => true,
      getStream: () => ({ active: true, getVideoTracks: () => [{ readyState: 'live' }] }),
      getVideoElement: () => ({
        videoWidth: 640,
        videoHeight: 480
      }),
      onCapture: (record) => {
        capturedRecord = record;
      }
    });

    // Mock document.createElement for canvas
    const origCreateElement = globalThis.document?.createElement;
    if (!globalThis.document) globalThis.document = {};
    globalThis.document.createElement = (tag) => {
      if (tag === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ({
            drawImage: () => {}
          }),
          toBlob: (cb) => cb(new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' }))
        };
      }
      return origCreateElement ? origCreateElement(tag) : null;
    };

    try {
      const record = await controller.executeSingleCapture();
      assert.ok(record !== null);
      assert.ok(capturedRecord !== null);
      assert.equal(savedRecordFilename, record.filename);
      assert.equal(record.savedPath, `/screenshots/${record.filename}`);
    } finally {
      if (origCreateElement) {
        globalThis.document.createElement = origCreateElement;
      } else {
        delete globalThis.document.createElement;
      }
    }
  });
});
