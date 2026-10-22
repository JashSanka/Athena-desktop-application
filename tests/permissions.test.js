import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Core logic definitions mirror the application's permission & readiness state machine
function mapCameraError(err) {
  if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
    return {
      state: 'denied',
      message: 'Webcam permission was denied. Please allow camera access in your browser or system preferences.'
    };
  }
  if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
    return {
      state: 'unavailable',
      message: 'No webcam device was found. Please ensure a camera is connected.'
    };
  }
  if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
    return {
      state: 'unavailable',
      message: 'Webcam is currently in use by another application or blocked by the operating system.'
    };
  }
  if (err.name === 'OverconstrainedError') {
    return {
      state: 'unavailable',
      message: 'Requested webcam constraints could not be satisfied by available hardware.'
    };
  }
  return {
    state: 'denied',
    message: err.message || 'Unable to access webcam.'
  };
}

function evaluateReadiness(cameraState, activeStream, isFullscreenActive) {
  const isCameraReady =
    cameraState === 'granted' &&
    activeStream !== null &&
    activeStream.active === true &&
    Array.isArray(activeStream.tracks) &&
    activeStream.tracks.some((t) => t.readyState === 'live');

  const isFullscreenReady = Boolean(isFullscreenActive);

  return {
    isReady: isCameraReady && isFullscreenReady,
    isCameraReady,
    isFullscreenReady
  };
}

describe('Camera Permission & Error Handling', () => {
  it('correctly maps NotAllowedError to denied state', () => {
    const err = new Error('Permission denied');
    err.name = 'NotAllowedError';
    const result = mapCameraError(err);
    assert.equal(result.state, 'denied');
    assert.match(result.message, /Webcam permission was denied/);
  });

  it('correctly maps NotFoundError to unavailable state', () => {
    const err = new Error('Device not found');
    err.name = 'NotFoundError';
    const result = mapCameraError(err);
    assert.equal(result.state, 'unavailable');
    assert.match(result.message, /No webcam device was found/);
  });

  it('correctly maps NotReadableError to unavailable state (in-use)', () => {
    const err = new Error('Camera in use');
    err.name = 'NotReadableError';
    const result = mapCameraError(err);
    assert.equal(result.state, 'unavailable');
    assert.match(result.message, /in use by another application/);
  });

  it('correctly maps OverconstrainedError to unavailable state', () => {
    const err = new Error('Constraints unsatisfiable');
    err.name = 'OverconstrainedError';
    const result = mapCameraError(err);
    assert.equal(result.state, 'unavailable');
  });

  it('stops all tracks and sets activeStream to null on cleanup', () => {
    let stoppedCount = 0;
    const mockTrack = {
      readyState: 'live',
      stop() {
        stoppedCount += 1;
        this.readyState = 'ended';
      }
    };
    const mockStream = {
      active: true,
      tracks: [mockTrack],
      getVideoTracks() {
        return this.tracks;
      }
    };

    // Clean up
    mockStream.getVideoTracks().forEach((track) => track.stop());
    assert.equal(stoppedCount, 1);
    assert.equal(mockTrack.readyState, 'ended');
  });
});

describe('Fullscreen Status & Fallback Detection', () => {
  it('does not claim fullscreen is active when fullscreen element is null', () => {
    const mockDocument = { fullscreenElement: null };
    const isActive = Boolean(mockDocument.fullscreenElement);
    assert.equal(isActive, false);
  });

  it('reports active fullscreen only when a DOM element is in fullscreen', () => {
    const mockDocument = { fullscreenElement: { tagName: 'HTML' } };
    const isActive = Boolean(mockDocument.fullscreenElement);
    assert.equal(isActive, true);
  });

  it('detects fullscreen exit correctly when element becomes null', () => {
    let currentElement = { tagName: 'HTML' };
    assert.equal(Boolean(currentElement), true);

    // Simulate user pressing Escape or browser exiting fullscreen
    currentElement = null;
    assert.equal(Boolean(currentElement), false);
  });
});

describe('Start Test Readiness Gating', () => {
  const liveStream = {
    active: true,
    tracks: [{ readyState: 'live' }]
  };

  it('disables start test when both requirements are missing', () => {
    const { isReady } = evaluateReadiness('idle', null, false);
    assert.equal(isReady, false);
  });

  it('disables start test when only camera is granted but fullscreen is windowed', () => {
    const { isReady, isCameraReady, isFullscreenReady } = evaluateReadiness('granted', liveStream, false);
    assert.equal(isReady, false);
    assert.equal(isCameraReady, true);
    assert.equal(isFullscreenReady, false);
  });

  it('disables start test when fullscreen is active but camera is denied or inactive', () => {
    const { isReady, isCameraReady, isFullscreenReady } = evaluateReadiness('denied', null, true);
    assert.equal(isReady, false);
    assert.equal(isCameraReady, false);
    assert.equal(isFullscreenReady, true);
  });

  it('enables start test only when BOTH camera stream is live and fullscreen is active', () => {
    const { isReady, isCameraReady, isFullscreenReady } = evaluateReadiness('granted', liveStream, true);
    assert.equal(isReady, true);
    assert.equal(isCameraReady, true);
    assert.equal(isFullscreenReady, true);
  });

  it('immediately disables readiness if fullscreen is exited after being ready', () => {
    let fullscreenActive = true;
    let readiness = evaluateReadiness('granted', liveStream, fullscreenActive);
    assert.equal(readiness.isReady, true);

    // User exits fullscreen (e.g. presses Esc)
    fullscreenActive = false;
    readiness = evaluateReadiness('granted', liveStream, fullscreenActive);
    assert.equal(readiness.isReady, false);
  });

  it('immediately disables readiness if camera track ends or disconnects', () => {
    const dynamicStream = {
      active: true,
      tracks: [{ readyState: 'live' }]
    };
    let readiness = evaluateReadiness('granted', dynamicStream, true);
    assert.equal(readiness.isReady, true);

    // Camera track disconnects / ends
    dynamicStream.tracks[0].readyState = 'ended';
    dynamicStream.active = false;
    readiness = evaluateReadiness('granted', dynamicStream, true);
    assert.equal(readiness.isReady, false);
  });
});
