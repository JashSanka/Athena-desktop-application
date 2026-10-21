// Athena Minimal Examination Page Initial Setup
document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  if (!app) return;

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
        <!-- Main Column: Examination & Completion Placeholders -->
        <main class="athena-main-content">
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

        <!-- Sidebar Column: Camera Preview Placeholder -->
        <aside class="athena-sidebar">
          <!-- 4. Camera Preview Area Placeholder -->
          <section class="athena-card" aria-labelledby="preview-heading">
            <h2 id="preview-heading" class="card-title">
              <span>Camera Preview</span>
              <span class="placeholder-badge">Phase 2 Feed</span>
            </h2>
            <p class="card-subtitle">Live proctoring video stream placeholder.</p>

            <div class="camera-preview-container" id="cameraPreviewArea">
              <svg class="camera-preview-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
              </svg>
              <span class="camera-preview-label">Live Webcam Feed</span>
              <span class="camera-preview-note">Webcam feed will connect in a later phase.</span>
            </div>
          </section>
        </aside>
      </div>

      <footer class="athena-footer">
        Athena Proctoring System &bull; Minimal Examination Interface
      </footer>
    </div>
  `;
});
