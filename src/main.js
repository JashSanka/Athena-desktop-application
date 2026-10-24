// Athena Minimal Examination Page Setup & State Management
import { QUESTIONS } from './questions.js';
import { getAnswerCounts } from './examUtils.js';

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
    testStarted: false,
    currentQuestionIndex: 0,
    selectedAnswers: {}
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

  // Fullscreen Management
  // Detect whether we are running inside an Electron window.
  // In Electron the browser Fullscreen API is unavailable; we use IPC instead.
  const isElectron = Boolean(window.electronAPI);

  function isFullscreenSupported() {
    if (isElectron) return true; // Electron always supports fullscreen via main process
    return Boolean(
      document.fullscreenEnabled ||
      document.webkitFullscreenEnabled ||
      document.mozFullScreenEnabled ||
      document.msFullscreenEnabled
    );
  }

  function isActualFullscreenActive() {
    // In Electron we track state ourselves via IPC events
    if (isElectron) return state.fullscreenActive;
    return Boolean(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement ||
      null
    );
  }

  async function enterFullscreen() {
    state.fullscreenErrorMessage = '';

    if (isElectron) {
      try {
        await window.electronAPI.enterFullscreen();
        // State will be updated by the 'fullscreen:changed' IPC event
      } catch (err) {
        console.warn('Electron fullscreen entry failed:', err);
        state.fullscreenErrorMessage = 'Fullscreen request was rejected by the system.';
        render();
      }
      return;
    }

    if (!isFullscreenSupported()) {
      state.fullscreenErrorMessage = 'Fullscreen mode is not supported by your browser.';
      state.fullscreenActive = false;
      render();
      return;
    }

    const el = document.documentElement;
    const requestFn =
      el.requestFullscreen ||
      el.webkitRequestFullscreen ||
      el.mozRequestFullScreen ||
      el.msRequestFullscreen;

    if (!requestFn) {
      state.fullscreenErrorMessage = 'Fullscreen API is unavailable in this environment.';
      state.fullscreenActive = false;
      render();
      return;
    }

    try {
      await requestFn.call(el);
    } catch (err) {
      console.warn('Fullscreen entry rejected:', err);
      state.fullscreenActive = isActualFullscreenActive();
      state.fullscreenErrorMessage = 'Fullscreen request was rejected by browser or system.';
      render();
    }
  }

  async function exitFullscreen() {
    if (isElectron) {
      try {
        await window.electronAPI.exitFullscreen();
        // State will be updated by the 'fullscreen:changed' IPC event
      } catch (err) {
        console.warn('Electron fullscreen exit failed:', err);
      }
      return;
    }

    if (!isActualFullscreenActive()) return;

    const exitFn =
      document.exitFullscreen ||
      document.webkitExitFullscreen ||
      document.mozCancelFullScreen ||
      document.msExitFullscreen;

    if (exitFn) {
      try {
        await exitFn.call(document);
      } catch (err) {
        console.warn('Exit fullscreen error:', err);
      }
    }
  }

  async function toggleFullscreen() {
    if (state.fullscreenActive) {
      await exitFullscreen();
    } else {
      await enterFullscreen();
    }
  }

  // Subscribe to fullscreen state changes pushed from Electron main process
  if (isElectron) {
    window.electronAPI.onFullscreenChange((isFullscreen) => {
      state.fullscreenActive = isFullscreen;
      if (isFullscreen) state.fullscreenErrorMessage = '';
      render();
    });
  } else {
    // Browser: listen for native fullscreen change/error events
    const fullscreenChangeEvents = [
      'fullscreenchange',
      'webkitfullscreenchange',
      'mozfullscreenchange',
      'MSFullscreenChange'
    ];

    fullscreenChangeEvents.forEach((eventName) => {
      document.addEventListener(eventName, () => {
        const actuallyActive = Boolean(
          document.fullscreenElement ||
          document.webkitFullscreenElement ||
          document.mozFullScreenElement ||
          document.msFullscreenElement
        );
        if (state.fullscreenActive !== actuallyActive) {
          state.fullscreenActive = actuallyActive;
          if (actuallyActive) state.fullscreenErrorMessage = '';
          render();
        }
      });
    });

    const fullscreenErrorEvents = [
      'fullscreenerror',
      'webkitfullscreenerror',
      'mozfullscreenerror',
      'MSFullscreenError'
    ];

    fullscreenErrorEvents.forEach((eventName) => {
      document.addEventListener(eventName, () => {
        state.fullscreenActive = false;
        state.fullscreenErrorMessage = 'Fullscreen request was rejected by browser permissions.';
        render();
      });
    });
  }

  function getFullscreenStatusMeta() {
    if (!isFullscreenSupported()) {
      return {
        label: 'Not Supported',
        pillClass: 'status-pill--error',
        dotClass: 'status-dot--error'
      };
    }
    if (state.fullscreenActive) {
      return {
        label: 'Fullscreen Active',
        pillClass: 'status-pill--ready',
        dotClass: 'status-dot--ready'
      };
    }
    return {
      label: 'Windowed Mode',
      pillClass: 'status-pill--pending',
      dotClass: 'status-dot--pending'
    };
  }

  function getFullscreenButtonLabel() {
    if (!isFullscreenSupported()) {
      return 'Fullscreen Unavailable';
    }
    if (state.fullscreenActive) {
      return 'Exit Fullscreen';
    }
    return 'Enable Fullscreen';
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

  // Readiness Gating
  function isCameraReady() {
    return (
      state.cameraState === 'granted' &&
      activeStream !== null &&
      activeStream.active &&
      activeStream.getVideoTracks().some((track) => track.readyState === 'live')
    );
  }

  function isFullscreenReady() {
    return isActualFullscreenActive();
  }

  function isReadyToStart() {
    return isCameraReady() && isFullscreenReady();
  }

  function getReadinessHelperText() {
    const cameraOk = isCameraReady();
    const fullscreenOk = isFullscreenReady();

    if (cameraOk && fullscreenOk) {
      return {
        text: 'All requirements satisfied. Test is ready to start.',
        className: 'ready'
      };
    }
    if (!cameraOk && !fullscreenOk) {
      return {
        text: 'Both active camera feed and fullscreen mode are required to begin.',
        className: 'warning'
      };
    }
    if (!cameraOk) {
      return {
        text: 'Webcam permission and live feed required before starting.',
        className: 'warning'
      };
    }
    return {
      text: 'Fullscreen mode must be active to begin the assessment.',
      className: 'warning'
    };
  }

  function renderVerificationView() {
    const cameraMeta = getCameraStatusMeta();
    const previewTag = getCameraPreviewTag();
    const fullscreenMeta = getFullscreenStatusMeta();
    const ready = isReadyToStart();
    const readinessInfo = getReadinessHelperText();

    return `
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
                  <span class="status-pill ${fullscreenMeta.pillClass}" id="fullscreenStatusBadge">
                    <span class="status-dot ${fullscreenMeta.dotClass}"></span>
                    ${fullscreenMeta.label}
                  </span>
                </div>
              </div>
              <p class="permission-description ${state.fullscreenErrorMessage ? 'error' : ''}">
                ${state.fullscreenErrorMessage || (state.fullscreenActive ? 'Fullscreen mode is actively engaged.' : 'Assessment must be conducted in full screen mode to prevent multi-tasking.')}
              </p>
              <button
                type="button"
                class="btn btn-secondary ${state.fullscreenActive ? 'active' : ''}"
                id="toggleFullscreenButton"
                ${!isFullscreenSupported() ? 'disabled' : ''}
              >
                ${getFullscreenButtonLabel()}
              </button>
            </div>
          </div>

          <!-- 3. Start Test Button -->
          <div class="start-section">
            <button
              type="button"
              class="btn-start"
              id="startTestButton"
              ${!ready ? 'disabled aria-disabled="true"' : ''}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>Start Test</span>
            </button>

            <p class="launch-helper-text ${readinessInfo.className}">
              ${readinessInfo.text}
            </p>
          </div>
        </main>

        <footer class="athena-footer">
          Athena Proctoring System &bull; Secure Examination Environment
        </footer>
      </div>
    `;
  }

  function renderExamView() {
    const { answeredCount, unansweredCount, totalQuestions } = getAnswerCounts(QUESTIONS, state.selectedAnswers);
    const currentQIndex = state.currentQuestionIndex;
    const currentQ = QUESTIONS[currentQIndex];
    const progressPercent = Math.round(((currentQIndex + 1) / totalQuestions) * 100);
    const selectedOption = state.selectedAnswers[currentQIndex];
    const optionLetters = ['A', 'B', 'C', 'D'];

    return `
      <div class="athena-container exam-container">
        <!-- Examination Header with Brand, Timer & Live Camera Feed -->
        <header class="exam-header-bar">
          <div class="exam-header-brand">
            <span class="athena-badge">Athena Examination</span>
            <span class="exam-mode-title">General Knowledge Assessment</span>
          </div>

          <div class="exam-header-status">
            <!-- Countdown Timer Display -->
            <div class="exam-timer-card" id="examTimerBadge" aria-live="polite">
              <div class="exam-timer-icon-wrap" aria-hidden="true">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div class="exam-timer-meta">
                <span class="exam-timer-label">Time Remaining</span>
                <span class="exam-timer-digits" id="timerDigits">05:00</span>
              </div>
            </div>

            <!-- Proctoring Live Camera Preview -->
            <div class="exam-camera-pip" id="examCameraPreview" title="Active Proctoring Webcam Preview">
              <video id="cameraVideo" class="camera-video-feed" autoplay playsinline muted></video>
              <div class="camera-pip-badge">
                <span class="status-dot status-dot--pulsing"></span>
                <span>Proctoring</span>
              </div>
            </div>
          </div>
        </header>

        <!-- Main Examination Card -->
        <main class="exam-card">
          <!-- Question Meta Header: Indicator, Counts & Progress Bar -->
          <div class="exam-meta-header">
            <div class="exam-meta-top">
              <span class="question-indicator-badge">Question ${currentQIndex + 1} of ${totalQuestions}</span>
              <div class="exam-counts-group">
                <span class="count-pill count-pill--answered">
                  <span class="count-pill-dot count-pill-dot--answered"></span>
                  Answered: <strong>${answeredCount}</strong>
                </span>
                <span class="count-pill count-pill--unanswered">
                  <span class="count-pill-dot count-pill-dot--unanswered"></span>
                  Unanswered: <strong>${unansweredCount}</strong>
                </span>
              </div>
            </div>

            <div class="exam-progress-track" role="progressbar" aria-valuenow="${currentQIndex + 1}" aria-valuemin="1" aria-valuemax="${totalQuestions}">
              <div class="exam-progress-bar" style="width: ${progressPercent}%;"></div>
            </div>

            <!-- Question Navigation Pills -->
            <div class="question-nav-grid" aria-label="Question Navigation">
              ${QUESTIONS.map((q, idx) => {
                const isCurrent = idx === currentQIndex;
                const isAnswered = state.selectedAnswers[idx] !== undefined && state.selectedAnswers[idx] !== null;
                return `
                  <button
                    type="button"
                    class="question-nav-pill ${isCurrent ? 'active' : ''} ${isAnswered ? 'answered' : ''}"
                    data-nav-index="${idx}"
                    aria-label="Question ${idx + 1} ${isAnswered ? '(Answered)' : '(Unanswered)'}"
                  >
                    ${idx + 1}
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Question Content -->
          <div class="exam-question-body">
            <div class="exam-question-statement">
              <span class="question-statement-num">${currentQ.id}.</span>
              <h2 class="question-statement-text">${currentQ.question}</h2>
            </div>

            <div class="exam-options-list" role="radiogroup" aria-label="Answer options">
              ${currentQ.options.map((optText, optIdx) => {
                const isSelected = selectedOption === optIdx;
                return `
                  <label class="exam-option-card ${isSelected ? 'selected' : ''}" for="option_${currentQIndex}_${optIdx}">
                    <input
                      type="radio"
                      id="option_${currentQIndex}_${optIdx}"
                      name="mcqOption"
                      value="${optIdx}"
                      class="exam-option-radio"
                      ${isSelected ? 'checked' : ''}
                    />
                    <span class="option-indicator">${optionLetters[optIdx]}</span>
                    <span class="option-text">${optText}</span>
                  </label>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Exam Action Controls: Previous & Next -->
          <footer class="exam-card-footer">
            <div class="exam-nav-actions">
              <button
                type="button"
                class="btn btn-secondary exam-nav-btn"
                id="prevQuestionButton"
                ${currentQIndex === 0 ? 'disabled' : ''}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                </svg>
                <span>Previous</span>
              </button>

              <button
                type="button"
                class="btn btn-primary exam-nav-btn"
                id="nextQuestionButton"
                ${currentQIndex === totalQuestions - 1 ? 'disabled' : ''}
              >
                <span>Next</span>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </button>
            </div>
          </footer>
        </main>

        <footer class="athena-footer">
          Athena Proctoring System &bull; Active Examination Session
        </footer>
      </div>
    `;
  }

  function render() {
    if (!state.testStarted) {
      app.innerHTML = renderVerificationView();
    } else {
      app.innerHTML = renderExamView();
    }

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
    if (!state.testStarted) {
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

      const toggleFullscreenBtn = document.getElementById('toggleFullscreenButton');
      if (toggleFullscreenBtn) {
        toggleFullscreenBtn.addEventListener('click', () => {
          toggleFullscreen();
        });
      }

      const startTestBtn = document.getElementById('startTestButton');
      if (startTestBtn) {
        startTestBtn.addEventListener('click', () => {
          if (isReadyToStart()) {
            state.testStarted = true;
            render();
          }
        });
      }
    } else {
      // Examination event handlers
      const prevBtn = document.getElementById('prevQuestionButton');
      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          if (state.currentQuestionIndex > 0) {
            state.currentQuestionIndex--;
            render();
          }
        });
      }

      const nextBtn = document.getElementById('nextQuestionButton');
      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          if (state.currentQuestionIndex < QUESTIONS.length - 1) {
            state.currentQuestionIndex++;
            render();
          }
        });
      }

      const optionRadios = document.querySelectorAll('input[name="mcqOption"]');
      optionRadios.forEach((radio) => {
        radio.addEventListener('change', (e) => {
          const optIdx = parseInt(e.target.value, 10);
          state.selectedAnswers[state.currentQuestionIndex] = optIdx;
          render();
        });
      });

      const navPills = document.querySelectorAll('button[data-nav-index]');
      navPills.forEach((pill) => {
        pill.addEventListener('click', () => {
          const idx = parseInt(pill.getAttribute('data-nav-index'), 10);
          if (!isNaN(idx) && idx >= 0 && idx < QUESTIONS.length) {
            state.currentQuestionIndex = idx;
            render();
          }
        });
      });
    }
  }

  render();
});
