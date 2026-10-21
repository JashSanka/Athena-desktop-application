// Athena Minimal Examination Page Setup & State Management
document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  if (!app) return;

  // Proctoring UI state (hardware APIs deliberately omitted in this phase)
  const state = {
    cameraGranted: false,
    fullscreenGranted: false,
    examDurationMinutes: 5,
    launchPlaceholderTriggered: false
  };

  function render() {
    const isReadyToStart = state.cameraGranted && state.fullscreenGranted;

    app.innerHTML = `
      <div class="athena-container">
        <!-- 1. Header with Title and Description -->
        <header class="athena-header">
          <div class="athena-header-brand">
            <span class="athena-badge">Proctoring System</span>
          </div>
          <h1 class="athena-title">Athena</h1>
          <p class="athena-description">
            A lightweight, browser-based proctoring and online examination environment designed for secure, fair, and reliable academic assessments.
          </p>
        </header>

        <!-- Main Layout Grid -->
        <div class="athena-grid">
          <!-- Main Column -->
          <main class="athena-main-content">
            <!-- Readiness & Permissions Card -->
            <section class="athena-card" aria-labelledby="permissions-heading">
              <h2 id="permissions-heading" class="card-title">
                <span>System Readiness & Permissions</span>
                <span class="placeholder-badge">UI State Only</span>
              </h2>
              <p class="card-subtitle">
                Both camera access and fullscreen display must be verified before beginning the assessment.
              </p>

              <div class="permission-list">
                <!-- 2. Camera Permission Control -->
                <div class="permission-item">
                  <div class="permission-info">
                    <div class="permission-label-wrap">
                      <span class="permission-label">Webcam Monitoring</span>
                      <span class="status-pill ${state.cameraGranted ? 'status-pill--ready' : 'status-pill--pending'}" id="cameraStatusBadge">
                        <span class="status-dot"></span>
                        ${state.cameraGranted ? 'Access Ready' : 'Permission Pending'}
                      </span>
                    </div>
                    <span class="permission-desc">Continuous visual verification is required during the test session.</span>
                  </div>
                  <div class="permission-action-wrap">
                    <button type="button" class="btn btn-secondary ${state.cameraGranted ? 'active' : ''}" id="toggleCameraButton">
                      ${state.cameraGranted ? 'Revoke Camera (UI)' : 'Enable Camera'}
                    </button>
                  </div>
                </div>

                <!-- 3. Fullscreen Activation Control -->
                <div class="permission-item">
                  <div class="permission-info">
                    <div class="permission-label-wrap">
                      <span class="permission-label">Fullscreen Environment</span>
                      <span class="status-pill ${state.fullscreenGranted ? 'status-pill--ready' : 'status-pill--pending'}" id="fullscreenStatusBadge">
                        <span class="status-dot"></span>
                        ${state.fullscreenGranted ? 'Fullscreen Active' : 'Windowed Mode'}
                      </span>
                    </div>
                    <span class="permission-desc">The examination must remain in fullscreen mode to prevent multi-tasking.</span>
                  </div>
                  <div class="permission-action-wrap">
                    <button type="button" class="btn btn-secondary ${state.fullscreenGranted ? 'active' : ''}" id="toggleFullscreenButton">
                      ${state.fullscreenGranted ? 'Exit Fullscreen (UI)' : 'Activate Fullscreen'}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <!-- 5 & 6. Exam Rules and Duration Card -->
            <section class="athena-card" aria-labelledby="rules-heading">
              <h2 id="rules-heading" class="card-title">
                <span>Examination Rules & Information</span>
                <span class="placeholder-badge">Guidelines</span>
              </h2>
              <p class="card-subtitle">Review all instructions carefully prior to launching the examination.</p>

              <!-- 6. Exam Duration Display -->
              <div class="duration-banner">
                <div class="duration-info">
                  <svg class="duration-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span class="duration-label">Allocated Test Duration:</span>
                </div>
                <span class="duration-badge">${state.examDurationMinutes} Minutes (Default)</span>
              </div>

              <!-- 5. Simple Exam Rules -->
              <ul class="rules-list">
                <li class="rule-item">
                  <span class="rule-number">1</span>
                  <div class="rule-text">
                    <strong>Remain in Fullscreen:</strong> Do not minimize the window or exit fullscreen mode. Window state deviations will be recorded.
                  </div>
                </li>
                <li class="rule-item">
                  <span class="rule-number">2</span>
                  <div class="rule-text">
                    <strong>Keep Camera Enabled:</strong> Maintain adequate lighting and stay centered in the camera feed for continuous proctoring.
                  </div>
                </li>
                <li class="rule-item">
                  <span class="rule-number">3</span>
                  <div class="rule-text">
                    <strong>Complete Within Time Limit:</strong> All answers must be submitted prior to the expiration of the 5-minute countdown.
                  </div>
                </li>
                <li class="rule-item">
                  <span class="rule-number">4</span>
                  <div class="rule-text">
                    <strong>No External Applications:</strong> Avoid tab switching, secondary monitors, or unauthorized application usage during the session.
                  </div>
                </li>
              </ul>
            </section>

            <!-- 8. Examination Area Placeholder -->
            <section class="athena-card" aria-labelledby="exam-area-heading">
              <h2 id="exam-area-heading" class="card-title">
                <span>Examination Workspace</span>
                <span class="placeholder-badge">Phase 2 Placeholder</span>
              </h2>
              <p class="card-subtitle">Active assessment questions and interactive answers will be rendered here.</p>

              <div class="exam-area-placeholder">
                <svg class="exam-placeholder-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <h3 class="exam-placeholder-title">No Active Examination in Progress</h3>
                <p class="exam-placeholder-text">
                  The question paper, navigation drawer, and answer inputs will appear in this workspace once requirements are verified and the test is launched.
                </p>
              </div>
            </section>

            <!-- 9. Completion Area Placeholder -->
            <section class="athena-card" aria-labelledby="completion-area-heading">
              <h2 id="completion-area-heading" class="card-title">
                <span>Session Completion Area</span>
                <span class="placeholder-badge">Phase 3 Placeholder</span>
              </h2>
              <p class="card-subtitle">Final submission verification, proctoring summary, and results status.</p>

              <div class="completion-area-placeholder">
                <h3 class="completion-placeholder-title">Awaiting Exam Submission</h3>
                <p class="completion-placeholder-text">
                  Post-examination verification, proctor audit trail logs, and candidate submission confirmation will be displayed here upon test completion.
                </p>
              </div>
            </section>
          </main>

          <!-- Sidebar Column -->
          <aside class="athena-sidebar">
            <!-- 4. Camera Preview Area Placeholder -->
            <section class="athena-card" aria-labelledby="preview-heading">
              <h2 id="preview-heading" class="card-title">
                <span>Camera Preview</span>
                <span class="placeholder-badge">Phase 2 Feed</span>
              </h2>
              <p class="card-subtitle">Live proctoring video stream placeholder.</p>

              <div class="camera-preview-container ${state.cameraGranted ? 'camera-active' : ''}" id="cameraPreviewArea">
                <span class="camera-preview-status-tag ${state.cameraGranted ? 'active' : ''}">
                  ${state.cameraGranted ? 'Feed Simulated' : 'Disconnected'}
                </span>
                <svg class="camera-preview-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
                <span class="camera-preview-label">Live Webcam Feed</span>
                <span class="camera-preview-note">
                  ${state.cameraGranted ? 'Camera permission simulated (UI mode).' : 'Webcam feed will connect in a later phase.'}
                </span>
              </div>
            </section>

            <!-- 7. Start Test Action Card -->
            <section class="athena-card launch-card" aria-labelledby="start-heading">
              <h2 id="start-heading" class="card-title">
                <span>Start Assessment</span>
              </h2>
              <p class="card-subtitle">Ensure prerequisites are fulfilled to unlock test session.</p>

              <div class="start-btn-wrap">
                <button
                  type="button"
                  class="btn-start"
                  id="startTestButton"
                  ${!isReadyToStart ? 'disabled aria-disabled="true"' : ''}
                >
                  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span>Start Test</span>
                </button>

                <p class="launch-helper-text ${isReadyToStart ? 'ready' : 'warning'}">
                  ${isReadyToStart
                    ? 'All requirements satisfied. Test is ready to start.'
                    : 'Requires both Camera access and Fullscreen mode.'}
                </p>

                ${state.launchPlaceholderTriggered ? `
                  <div class="launch-notice-placeholder">
                    <strong>Launch Triggered (Placeholder):</strong> Active test, live camera proctoring, and countdown timer will initialize here in Phase 2.
                  </div>
                ` : ''}
              </div>
            </section>
          </aside>
        </div>

        <footer class="athena-footer">
          Athena Proctoring System &bull; Minimal Examination Interface
        </footer>
      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    const toggleCameraBtn = document.getElementById('toggleCameraButton');
    const toggleFullscreenBtn = document.getElementById('toggleFullscreenButton');
    const startTestBtn = document.getElementById('startTestButton');

    if (toggleCameraBtn) {
      toggleCameraBtn.addEventListener('click', () => {
        state.cameraGranted = !state.cameraGranted;
        state.launchPlaceholderTriggered = false;
        render();
      });
    }

    if (toggleFullscreenBtn) {
      toggleFullscreenBtn.addEventListener('click', () => {
        state.fullscreenGranted = !state.fullscreenGranted;
        state.launchPlaceholderTriggered = false;
        render();
      });
    }

    if (startTestBtn) {
      startTestBtn.addEventListener('click', () => {
        if (state.cameraGranted && state.fullscreenGranted) {
          state.launchPlaceholderTriggered = true;
          render();
        }
      });
    }
  }

  render();
});
