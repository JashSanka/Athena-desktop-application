# Athena — Online Proctoring Application

Athena is a lightweight, responsive proctoring application engineered for secure, fair, and reliable academic examinations. It operates as both a modern web application and an Electron desktop shell.

---

## Purpose & Overview

Athena ensures academic integrity during online assessments through proactive monitoring and candidate readiness verification. The application establishes the foundational verification interface, enforcing prerequisite state verification (live webcam feed and fullscreen enforcement) prior to candidate test launch.

---

## Tech Stack

- **Runtime & Language:** JavaScript (ES2022+ Modules, modern DOM APIs)
- **Tooling & Bundler:** [Vite](https://vite.dev/) (fast HMR dev server and optimized production builds)
- **Desktop Wrapper:** [Electron](https://www.electronjs.org/) (cross-platform desktop application host)
- **Styling:** Modern semantic CSS3 (responsive flexbox/grid, custom design tokens, dark/light contrast)
- **Testing:** Node.js native test runner (`node:test`, `node:assert/strict`)
- **Linting & Code Quality:** [ESLint](https://eslint.org/) (flat config, standard ECMAScript rules)

---

## Installation & Setup

### Prerequisites
- Node.js (v18.0.0 or higher recommended, tested on v26.10)
- npm (v9.0.0 or higher)

### Installation
Clone or navigate to the repository directory and install project dependencies:

```bash
npm install
```

---

## Development Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Vite local development server (default: `http://localhost:5173`) |
| `npm run build` | Compiles and optimizes assets into the `dist/` directory |
| `npm run preview` | Locally previews the production build from `dist/` |
| `npm run lint` | Runs ESLint checks across the codebase |
| `npm test` | Runs the automated permission and readiness unit test suite |
| `npm run electron` | Launches the Electron desktop application window |
| `npm run electron:dev` | Runs Vite dev server and launches Electron desktop app concurrently |

---

## Current UI Structure

The focused UI provides a streamlined candidate verification interface containing only the essential prerequisites:

1. **Camera Preview Area:** Dedicated 16:9 viewport supporting live webcam video streaming with horizontal mirroring and comprehensive state rendering (Granted, Denied, Loading, Unavailable, Idle).
2. **Camera Permission Control:** Dedicated action button and status indicator showing camera readiness with in-place retry capabilities.
3. **Fullscreen Permission Control:** Dedicated action button and status indicator triggering the browser Fullscreen API with automatic exit detection (e.g., `Esc` key).
4. **Screenshot Consent & Notice Card:** Explicit notice explaining periodic webcam capture terms with an acknowledgement checkbox required before test launch.
5. **Start Test Button:** Action button dynamically gated and enabled only when camera access, fullscreen prerequisites, and screenshot consent are satisfied simultaneously.
6. **Proctoring Screenshot Gallery:** A compact in-exam section displaying capture status, total screenshot count, horizontal thumbnail cards with timestamps, single/bulk deletion, and full image preview modal.

---

## MCQ Examination Module

Once the Start Test button is activated (after both camera and fullscreen requirements are met), Athena presents a 10-question multiple-choice examination session.

### Question Structure

Each question in the dataset (`src/questions.js`) has the following shape:

```js
{
  id: 1,                              // 1-based display index
  question: "Question statement",     // Full question text
  options: ["A", "B", "C", "D"],      // Exactly 4 answer options
  correctAnswer: 0                    // 0-based index of the correct option
}
```

The 10 sample questions cover fundamental topics: HTML5, CSS, JavaScript, Operating Systems, HTTP, Data Structures, Databases, Networking, Algorithms, and Browser Security.

### Navigation & Selection

- **Previous / Next** buttons navigate between questions.
- **Question Navigation Grid** (numbered pills 1–10) allows direct jump to any question.
- Answered questions are highlighted green in the navigation grid; the current question is highlighted blue.
- Answer selections persist when navigating between questions (stored in `state.selectedAnswers` keyed by 0-based question index).
- **Answered / Unanswered counts** are displayed in real time in the exam header.

---

## Timer Behaviour

The countdown timer is implemented using a **deadline-based approach** rather than a simple decrementing counter:

```
deadline = Date.now() + durationSeconds × 1000
remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
```

This prevents timer drift if the browser throttles JavaScript intervals (e.g., when the tab is backgrounded).

| Property | Value |
| :--- | :--- |
| Default duration | 5 minutes (300 seconds) — configurable via `DEFAULT_EXAM_DURATION_SECONDS` in `src/examUtils.js` |
| Display format | `MM:SS` (e.g., `04:59`) |
| Tick rate | Every 250 ms for responsive display without battery cost |
| Warning threshold | Timer card turns red when ≤ 60 seconds remain |
| Timeout action | Test is automatically completed, camera stream is released, fullscreen is exited, results are shown |
| Completion guard | `state.isCompleted` flag ensures automatic completion fires exactly once |

---

## Scoring

Scoring is calculated client-side by [`calculateScore`](src/examUtils.js) at exam completion:

$$\text{Score} = \frac{\text{Correct Answers}}{\text{Total Questions}} \times 100\%$$

| Metric | Description |
| :--- | :--- |
| **Correct count** | Options matching each question's `correctAnswer` index |
| **Incorrect count** | Answered questions that did not match the correct answer |
| **Unanswered count** | Questions with no selection recorded |
| **Invariant** | `correct + incorrect + unanswered = 10` always holds |

Score tier colours shown on the results screen:
- 🟢 **Green** — ≥ 70%
- 🟡 **Amber** — 40–69%
- 🔴 **Red** — < 40%

---

## End Test Flow

| Trigger | Behaviour |
| :--- | :--- |
| **End Test button** | Visible at all times during the exam. Clicking shows a `window.confirm()` dialog with the current answered/unanswered counts. If confirmed, the exam is finalised immediately. |
| **Timer expiry** | Exam is completed automatically without a confirmation dialog. |
| **Post-completion** | Timer is cleared, camera stream is released (`track.stop()`), fullscreen is exited, question interaction is disabled. |
| **Results screen** | Displays: completion message (manual or timeout), score fraction, percentage, correct/incorrect/unanswered breakdown. |

---

## Permission Behavior

### 1. Camera Access (`getUserMedia`)
- **User Gesture Requirement:** Webcam access is requested **only** when the candidate explicitly clicks the camera action button (`Allow Camera` or `Retry Access`). It is never invoked automatically on page load.
- **API Invocation:** Calls `navigator.mediaDevices.getUserMedia({ video: true, audio: false })`.
- **Live Preview:** When access is granted, the live video stream is bound directly to the `<video id="cameraVideo">` element with `autoplay playsinline muted`, styled with a natural mirror transformation (`transform: scaleX(-1)`).
- **Comprehensive State Machine:**
  - `idle`: Initial state; camera offline, instructions displayed.
  - `loading`: Visual spinner and helper message while the browser permission prompt is active.
  - `granted`: Live webcam feed displayed with green status indicator badge.
  - `denied`: User blocked permission (`NotAllowedError` or `PermissionDeniedError`); displays error guidance and a retry button.
  - `unavailable`: Hardware missing or blocked (`NotFoundError`, `NotReadableError`, `OverconstrainedError`); displays hardware diagnostic and retry button.
- **Track Lifecycle Management:**
  - When the candidate revokes camera access or abandons the assessment, all active tracks are stopped via `track.stop()`, immediately shutting off hardware indicators.
  - Background listeners on `beforeunload` and `pagehide` ensure webcam tracks are cleanly released if the tab or browser is closed.
  - Listeners on the `ended` event detect hardware disconnections or operating system revocations mid-session.

### 2. Fullscreen Mode (`Fullscreen API`)
- **User Gesture Requirement:** Fullscreen is triggered **only** after the user explicitly clicks `Enable Fullscreen` or `Re-enter Fullscreen`.
- **API Invocation:** Calls `document.documentElement.requestFullscreen()` with vendor prefix fallbacks.
- **Strict Status Validation:** The application never claims fullscreen is active unless `document.fullscreenElement` is verified truthy.
- **Exit Detection:** Subscribes to `fullscreenchange` events. If the candidate exits fullscreen by pressing `Esc` or minimizing the window, the status immediately reverts to `Windowed Mode`, and the Start Test button is re-locked.
- **Rejected & Unsupported Handling:** Handles rejection errors gracefully without breaking application flow and disables fullscreen actions in unsupported environments.

### 3. Readiness Gating for "Start Test"
The `Start Test` button is strictly gated by all prerequisites:
$$\text{Ready} = \text{CameraGranted} \land \text{CameraStreamActive} \land \text{FullscreenActive} \land \text{ConsentAcknowledged}$$

- **Dynamic Invalidation:** If any requirement becomes unsatisfied at any point prior to test launch (e.g. user exits fullscreen, turns off webcam, or unchecks consent), the `Start Test` button is immediately disabled (`disabled aria-disabled="true"`).
- **Real-time Helper Text:** Diagnostic helper text guides candidates on exactly which requirements remain unfulfilled.

---

## Periodic Webcam Screenshot Capture

Athena incorporates periodic webcam still image capture during active examinations for candidate identity and proctoring verification.

### Core Architecture & Execution

- **Configurable Interval:** Captures a still snapshot approximately every 30 seconds (`DEFAULT_SCREENSHOT_INTERVAL_SECONDS = 30` in `src/screenshotUtils.js`). The interval is configurable dynamically via `ScreenshotCaptureController.setIntervalSeconds(seconds)`.
- **Stream Reuse:** Reuses the existing active webcam `MediaStream` already rendered in the exam pip header. The application **never** requests a second stream or re-invokes `navigator.mediaDevices.getUserMedia`.
- **Canvas & Blob Generation:** Utilizes an offscreen HTML5 `<canvas>` element and `canvas.toBlob('image/jpeg', 0.85)` to convert video frames directly into binary Blobs, paired with in-memory `URL.createObjectURL(blob)` pointers.
- **Temporary In-Memory Storage Only:** Captured Blobs and Object URLs are retained strictly in JavaScript application memory (`state.screenshots`). Images are **never** written to local disk, never persisted in `localStorage` or IndexedDB, and never uploaded over network endpoints.
- **No Audio or Continuous Video:** The proctoring system strictly omits audio tracks and does not record continuous video streams or instantiate `MediaRecorder`.

### Consent & Lifecycle Gating

- **Explicit Informed Consent:** A dedicated notice card is displayed prior to test launch explaining that periodic webcam snapshots will be taken. Candidates must explicitly acknowledge and check the consent box before the `Start Test` button unlocks.
- **Exam-Only Lifecycle:** Screenshot timers start strictly when the test begins and consent is active. Captures **never** run before the examination starts or after it finishes.
- **Immediate Teardown:** Captures halt immediately upon:
  - Candidate clicking `End Test` (manual submission)
  - Timer expiration (automatic timeout)
  - Camera disconnection or hardware track ending (`ended` event)
  - Window cancellation or navigation (`beforeunload`, `pagehide`)
- **Overlap & Duplicate Prevention:** The `ScreenshotCaptureController` maintains an `isCapturing` lock flag to prevent overlapping capture operations, and automatically clears previous intervals before scheduling new ones.
- **Timer Fault Isolation:** All capture operations are wrapped in safe `try/catch` handlers. Any frame capture or canvas failure logs a warning without crashing the examination or affecting the countdown timer.

### Minimal Gallery Interface

The active examination view includes a compact, non-intrusive screenshot gallery:
- **Status Indicator & Count:** Displays current capture state (`Capturing every 30s`, `Capturing snapshot...`, `Capture Stopped`) and total captures taken.
- **Thumbnail Gallery:** Horizontally scrollable thumbnail cards displaying each captured image alongside its exact timestamp (`HH:MM:SS`).
- **Interactive Preview:** Clicking any thumbnail opens a clean modal preview dialog showing the full-resolution still frame. The modal can be closed via the close button, clicking the backdrop, or pressing the `Escape` key.
- **Deletion & URL Revocation:** Candidates can delete individual screenshots or click **Clear All** to purge all captures. Removing any screenshot immediately invokes `URL.revokeObjectURL()` to release allocated memory.
- **Post-Exam Summary:** The results screen provides an integrity summary showing the total screenshots taken during the session and an immediate purge button to release any remaining in-memory snapshots.

---

## Browser Limitations & Technical Considerations

- **Secure Contexts (HTTPS):** Modern browsers restrict `navigator.mediaDevices.getUserMedia` strictly to Secure Contexts (`https://` or `localhost`). Access will fail if served over insecure HTTP in production.
- **User Activation / Gestures:** Both `requestFullscreen()` and `getUserMedia()` require transient user activation. Attempts to invoke them programmatically without user interaction will be blocked.
- **Embedded Iframes:** If Athena is embedded inside an `<iframe>`, the host frame must provide appropriate permissions attributes: `allow="camera; fullscreen"`.
- **Hardware Concurrency:** Only one application may hold an exclusive lock on the camera device on certain operating systems (such as Windows). If another app holds the webcam, a `NotReadableError` is caught and presented as `Camera Unavailable`.
- **Canvas Blob Generation:** In restricted browser configurations (e.g. strict CSP or headless environments lacking full 2D canvas support), canvas to Blob export falls back to Base64 byte conversion or returns diagnostic error states without interrupting the test.
- **Background Tab Throttling:** Browsers throttle `setInterval` timers in background tabs. Athena's countdown timer relies on fixed deadline timestamps (`Date.now()`), and screenshot intervals gracefully resume when the tab returns to focus.

---

## Privacy Considerations

- **Local Processing Only:** All webcam frames and screenshots remain entirely inside browser memory.
- **Informed Consent Notice:** Candidates receive clear, explicit notification regarding screenshot frequency and handling prior to launching the exam.
- **No Cloud Transmission:** No images, video, audio, or telemetry are transmitted to remote servers or third-party cloud services.
- **No Audio Collection:** Audio tracks are explicitly omitted (`audio: false`).
- **Immediate Memory Release:** All Object URLs are explicitly revoked via `URL.revokeObjectURL()` upon item deletion, exam completion, window closure, or explicit memory purging.

---

## Electron Desktop Application

Athena is configured to run as a cross-platform desktop shell via Electron.

### Running in Electron
```bash
# Build production bundle first
npm run build

# Launch the Electron desktop shell
npm run electron
```

### Media Permissions in Electron
Electron applications require explicit session permission handlers to allow webcam access. In `electron/main.cjs`, `session.defaultSession.setPermissionRequestHandler` and `setPermissionCheckHandler` are configured to permit `media` requests from the Athena window.

---

## Automated Testing

Run the automated unit test suite with:

```bash
npm test
```

The test suite covers:
- **Camera Error Mapping & State Transitions:** Verification of `NotAllowedError`, `NotFoundError`, `NotReadableError`, and `OverconstrainedError`.
- **Track Lifecycle Management:** Verification of track cleanup upon session abandonment and disconnection.
- **Fullscreen Detection:** Element truthiness, fallback detection, and exit handling.
- **Readiness Gating:** Verification of Start Test gating requiring live camera, active fullscreen, and explicit screenshot consent.
- **Webcam Screenshot Lifecycle (`tests/screenshots.test.js`):**
  - Consent requirement validation and gating.
  - Configurable 30-second interval scheduling and fallback behavior.
  - Prevention of duplicate intervals and overlapping in-flight captures.
  - Stream status validation with `isStreamLive` and disconnected track rejection.
  - Fault tolerance ensuring capture errors do not throw or disrupt the exam timer.
  - Lifecycle bounds verifying screenshots are never taken before start or after exam completion.
  - In-memory Object URL creation, individual deletion, and bulk URL revocation.
- **Exam Timer Behaviour:** `formatTime` formatting (MM:SS), deadline-based `calculateRemainingSeconds`, and edge case handling.
- **Scoring & Counting:** `calculateScore` and `getAnswerCounts` invariant assertions across all-correct, partial, all-wrong, and empty submissions.

---

## Limitations

This is a **local demonstration only**, not a tamper-proof production proctoring system:

- **No Tamper-Proof Proctoring:** This application is an educational prototype and does **not** claim to provide tamper-proof or cheat-proof proctoring. Because all monitoring logic runs client-side in browser memory without backend attestation, an advanced user with access to browser developer tools could modify client state or substitute camera feeds. Production proctoring requires trusted device management, secure lockdown browsers, and verified server-side infrastructure.
- **No Backend or Cloud Storage:** Screenshots and scores are kept in temporary browser memory only. Refreshing or navigating away clears the entire session.
- **No AI Facial Recognition or Gaze Tracking:** Captured screenshots are presented locally in a gallery; no biometric facial recognition or automated anomaly detection is applied.
- **No Question Randomisation:** The 10 sample MCQs are always presented in the same order.
- **No Authentication or Session Persistence:** Athena does not collect student IDs or credentials.
- **Browser-Native Confirm Dialog:** The End Test confirmation uses `window.confirm()`. In automated environments this may require dialog handling.
