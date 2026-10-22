// Athena Minimal Examination Page Setup & State Management
document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  if (!app) return;

  // Application State
  const state = {
    // Camera state: 'idle' | 'loading' | 'granted' | 'denied' | 'unavailable'
    cameraState: 'idle',
    cameraErrorMessage: '',
    fullscreenActive: false,
    fullscreenSupported: true,
    fullscreenErrorMessage: '',
    testStarted: false
  };

  let activeStream = null;

  function onTrackEnded() {
    stopCamera();
    state.cameraState = 'unavailable';
    state.cameraErrorMessage = 'The webcam stream was disconnected by the system.';
    render();
  }

  async function requestCamera() {
    if (state.cameraState === 'loading') return;

    state.cameraState = 'loading';
    state.cameraErrorMessage = '';
    render();

    if (!window.navigator?.mediaDevices?.getUserMedia) {
      state.cameraState = 'unavailable';
      state.cameraErrorMessage = 'MediaDevices API is not supported in this browser environment.';
      render();
      return;
    }

    try {
      const stream = await window.navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });

      activeStream = stream;
      stream.getVideoTracks().forEach((track) => {
        track.addEventListener('ended', onTrackEnded);
      });

      state.cameraState = 'granted';
      state.cameraErrorMessage = '';
    } catch (err) {
      console.warn('Webcam permission request failed:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        state.cameraState = 'denied';
        state.cameraErrorMessage = 'Webcam permission was denied. Please allow camera access in your browser or system preferences.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        state.cameraState = 'unavailable';
        state.cameraErrorMessage = 'No webcam device was found. Please ensure a camera is connected.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        state.cameraState = 'unavailable';
        state.cameraErrorMessage = 'Webcam is currently in use by another application or blocked by the operating system.';
      } else if (err.name === 'OverconstrainedError') {
        state.cameraState = 'unavailable';
        state.cameraErrorMessage = 'Requested webcam constraints could not be satisfied by available hardware.';
      } else {
        state.cameraState = 'denied';
        state.cameraErrorMessage = err.message || 'Unable to access webcam.';
      }
    }

    render();
  }

  function stopCamera() {
    if (activeStream) {
      activeStream.getVideoTracks().forEach((track) => {
        track.removeEventListener('ended', onTrackEnded);
        track.stop();
      });
      activeStream = null;
    }
    state.cameraState = 'idle';
    state.cameraErrorMessage = '';
  }

  // Ensure webcam tracks are released if page/exam flow is abandoned or unloaded
  window.addEventListener('beforeunload', () => stopCamera());
  window.addEventListener('pagehide', () => stopCamera());

  function toggleCamera() {
    if (state.cameraState === 'granted') {
      stopCamera();
      render();
    } else {
      requestCamera();
    }
  }

  function getCameraStatusMeta() {
    switch (state.cameraState) {
      case 'granted':
        return { label: 'Access Ready', pillClass: 'status-pill--ready', dotClass: 'status-dot--ready' };
      case 'loading':
        return { label: 'Requesting...', pillClass: 'status-pill--pending', dotClass: 'status-dot--pending' };
      case 'denied':
        return { label: 'Access Denied', pillClass: 'status-pill--error', dotClass: 'status-dot--error' };
      case 'unavailable':
        return { label: 'Unavailable', pillClass: 'status-pill--error', dotClass: 'status-dot--error' };
      case 'idle':
      default:
        return { label: 'Permission Pending', pillClass: 'status-pill--pending', dotClass: 'status-dot--pending' };
    }
  }

  function getCameraButtonLabel() {
    switch (state.cameraState) {
      case 'granted':
        return 'Revoke Camera';
      case 'loading':
        return 'Requesting...';
      case 'denied':
      case 'unavailable':
        return 'Retry Camera';
      case 'idle':
      default:
        return 'Allow Camera';
    }
  }

  function getCameraPreviewTag() {
    switch (state.cameraState) {
      case 'granted':
        return { label: 'Live Camera', className: 'active' };
      case 'loading':
        return { label: 'Connecting...', className: 'loading' };
      case 'denied':
        return { label: 'Access Denied', className: 'error' };
      case 'unavailable':
        return { label: 'Unavailable', className: 'error' };
      case 'idle':
      default:
        return { label: 'Camera Offline', className: '' };
    }
  }

  function renderCameraPreviewContent() {
    if (state.cameraState === 'granted') {
      return `<video id="cameraVideo" class="camera-video-feed" autoplay playsinline muted></video>`;
    }

    if (state.cameraState === 'loading') {
      return `
        <div class="camera-loading-content">
          <div class="camera-loading-spinner" aria-hidden="true"></div>
          <span class="camera-preview-label">Connecting to Webcam...</span>
          <span class="camera-preview-note">Please allow camera permissions if prompted by your browser.</span>
        </div>
      `;
    }

    if (state.cameraState === 'denied') {
      return `
        <div class="camera-error-content camera-error--denied">
          <div class="camera-error-icon-wrap">
            <svg class="camera-error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path>
            </svg>
          </div>
          <span class="camera-preview-label">Camera Access Denied</span>
          <span class="camera-preview-note">${state.cameraErrorMessage || 'Webcam permission was blocked.'}</span>
          <button type="button" class="btn btn-retry" id="retryCameraButton">
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            <span>Retry Access</span>
          </button>
        </div>
      `;
    }

    if (state.cameraState === 'unavailable') {
      return `
        <div class="camera-error-content camera-error--unavailable">
          <div class="camera-error-icon-wrap">
            <svg class="camera-error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
          </div>
          <span class="camera-preview-label">Camera Unavailable</span>
          <span class="camera-preview-note">${state.cameraErrorMessage || 'No active camera could be detected.'}</span>
          <button type="button" class="btn btn-retry" id="retryCameraButton">
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            <span>Retry Camera</span>
          </button>
        </div>
      `;
    }

    return `
      <div class="camera-placeholder-content">
        <svg class="camera-preview-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
        </svg>
        <span class="camera-preview-label">Webcam Feed Inactive</span>
        <span class="camera-preview-note">Click "Allow Camera" below to enable your camera stream</span>
      </div>
    `;
  }

  function render() {
    const cameraMeta = getCameraStatusMeta();
    const previewTag = getCameraPreviewTag();
    const isReadyToStart = state.cameraState === 'granted' && state.fullscreenActive;

    app.innerHTML = `
      <div class="athena-container">
        <!-- Header -->
        <header class="athena-header">
          <div class="athena-header-brand">
            <span class="athena-badge">Proctoring Verification</span>
          </div>
          <h1 class="athena-title">Athena Assessment Portal</h1>
          <p class="athena-description">
            Complete the verification checks below to initialize your secure examination environment.
          </p>
        </header>

        <!-- Main Verification Card -->
        <main class="athena-verification-card">
          <!-- 1. Camera Area -->
          <div class="camera-section">
            <div class="camera-preview-container ${state.cameraState === 'granted' ? 'camera-active' : ''} ${state.cameraState === 'denied' || state.cameraState === 'unavailable' ? 'camera-error' : ''}" id="cameraPreviewArea">
              <div class="camera-status-overlay">
                <span class="camera-status-tag ${previewTag.className}">
                  <span class="status-dot"></span>
                  ${previewTag.label}
                </span>
              </div>

              ${renderCameraPreviewContent()}
            </div>
          </div>

          <!-- 2. Permissions Row: Camera & Fullscreen Controls -->
          <div class="permissions-grid">
            <!-- Camera Permission Control -->
            <div class="permission-card">
              <div class="permission-card-header">
                <div class="permission-icon-wrap">
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                  </svg>
                </div>
                <div class="permission-meta">
                  <h2 class="permission-name">Camera Permission</h2>
                  <span class="status-pill ${cameraMeta.pillClass}" id="cameraStatusBadge">
                    <span class="status-dot ${cameraMeta.dotClass}"></span>
                    ${cameraMeta.label}
                  </span>
                </div>
              </div>
              <p class="permission-description">
                ${state.cameraErrorMessage || 'Webcam monitoring is required for continuous proctoring.'}
              </p>
              <button
                type="button"
                class="btn btn-secondary ${state.cameraState === 'granted' ? 'active' : ''}"
                id="toggleCameraButton"
                ${state.cameraState === 'loading' ? 'disabled' : ''}
              >
                ${getCameraButtonLabel()}
              </button>
            </div>

            <!-- Fullscreen Permission Control -->
            <div class="permission-card">
              <div class="permission-card-header">
                <div class="permission-icon-wrap">
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
                  </svg>
                </div>
                <div class="permission-meta">
                  <h2 class="permission-name">Fullscreen Permission</h2>
                  <span class="status-pill ${state.fullscreenActive ? 'status-pill--ready' : 'status-pill--pending'}" id="fullscreenStatusBadge">
                    <span class="status-dot"></span>
                    ${state.fullscreenActive ? 'Fullscreen Active' : 'Windowed Mode'}
                  </span>
                </div>
              </div>
              <p class="permission-description">Assessment must be conducted in full screen mode.</p>
              <button
                type="button"
                class="btn btn-secondary ${state.fullscreenActive ? 'active' : ''}"
                id="toggleFullscreenButton"
              >
                ${state.fullscreenActive ? 'Exit Fullscreen' : 'Enable Fullscreen'}
              </button>
            </div>
          </div>

          <!-- 3. Start Test Button -->
          <div class="start-section">
            <button
              type="button"
              class="btn-start"
              id="startTestButton"
              ${!isReadyToStart ? 'disabled aria-disabled="true"' : ''}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>Start Test</span>
            </button>

            <p class="launch-helper-text ${isReadyToStart ? 'ready' : 'warning'}">
              ${isReadyToStart
                ? 'All prerequisites fulfilled. Ready to begin your assessment.'
                : 'Both Camera Permission and Fullscreen Mode are required to start.'}
            </p>
          </div>
        </main>

        <footer class="athena-footer">
          Athena Proctoring System &bull; Secure Examination Environment
        </footer>
      </div>
    `;

    if (state.cameraState === 'granted' && activeStream) {
      const videoEl = document.getElementById('cameraVideo');
      if (videoEl && videoEl.srcObject !== activeStream) {
        videoEl.srcObject = activeStream;
        videoEl.play().catch((err) => console.warn('Camera video play error:', err));
      }
    }

    bindEvents();
  }

  function bindEvents() {
    const toggleCameraBtn = document.getElementById('toggleCameraButton');
    if (toggleCameraBtn) {
      toggleCameraBtn.addEventListener('click', () => {
        toggleCamera();
      });
    }

    const retryCameraBtn = document.getElementById('retryCameraButton');
    if (retryCameraBtn) {
      retryCameraBtn.addEventListener('click', () => {
        requestCamera();
      });
    }
  }

  render();
});
