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
4. **Start Test Button:** Action button dynamically gated and enabled only when both camera access and fullscreen prerequisites are satisfied simultaneously.

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
The `Start Test` button is strictly gated by both prerequisites:
$$\text{Ready} = \text{CameraGranted} \land \text{CameraStreamActive} \land \text{FullscreenActive}$$

- **Dynamic Invalidation:** If either requirement becomes unsatisfied at any point prior to test launch (e.g. user exits fullscreen or turns off webcam), the `Start Test` button is immediately disabled (`disabled aria-disabled="true"`).
- **Real-time Helper Text:** Diagnostic helper text guides candidates on exactly which requirement remains unfulfilled.

---

## Browser Limitations & Technical Considerations

- **Secure Contexts (HTTPS):** Modern browsers restrict `navigator.mediaDevices.getUserMedia` strictly to Secure Contexts (`https://` or `localhost`). Access will fail if served over insecure HTTP in production.
- **User Activation / Gestures:** Both `requestFullscreen()` and `getUserMedia()` require transient user activation. Attempts to invoke them programmatically without user interaction will be blocked.
- **Embedded Iframes:** If Athena is embedded inside an `<iframe>`, the host frame must provide appropriate permissions attributes: `allow="camera; fullscreen"`.
- **Hardware Concurrency:** Only one application may hold an exclusive lock on the camera device on certain operating systems (such as Windows). If another app holds the webcam, a `NotReadableError` is caught and presented as `Camera Unavailable`.

---

## Privacy Considerations

- **Local Preview Only:** The camera stream is bound strictly to a local HTML5 `<video>` element for verification preview.
- **No Audio Collection:** Audio tracks are explicitly omitted (`audio: false`).
- **No Recording or Cloud Transmission:** Athena does not instantiate `MediaRecorder`, WebRTC peer connections, WebSocket video pipes, or HTTP upload endpoints in this verification phase. No video frames are stored or transmitted.
- **Immediate Resource Cleanup:** Video tracks are explicitly stopped (`track.stop()`) when the user revokes permissions, abandons the test flow, or leaves the application.

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
- Camera error mapping and state transitions (`NotAllowedError`, `NotFoundError`, `NotReadableError`, `OverconstrainedError`).
- Track cleanup verification upon session abandonment.
- Fullscreen truthiness and exit detection.
- Start Test gating logic and dynamic invalidation when either requirement is lost.
- **Timer behaviour:** `formatTime` formatting (MM:SS), `calculateRemainingSeconds` deadline-based calculation, edge cases for 0, negative, and non-number inputs.
- **Scoring:** `calculateScore` for all-correct, all-wrong, partial, and no-answer scenarios; invariant check that `correct + incorrect + unanswered === total`.
- **Answer counts:** `getAnswerCounts` with 0 answered, fully answered, and partial selections.

---

## Limitations

This is a **local demonstration only**, not a production examination system:

- **No backend or server enforcement.** All scoring and timer logic runs in the browser. A technically-inclined candidate could manipulate client-side state via browser DevTools.
- **No question shuffling or randomisation.** The 10 sample MCQs are always presented in the same order.
- **No login, authentication, or candidate identification.** Athena does not collect usernames, session tokens, or any personal data.
- **No answer persistence across page reloads.** Refreshing the page resets the entire session including answers and the timer.
- **Timer uses `setInterval` at 250 ms.** Browsers may throttle background tabs, but since remaining time is computed from a fixed deadline (`Date.now()`-based), displayed seconds stay accurate even if ticks are delayed.
- **No screenshot or screen recording.** The proctoring in this version is limited to a live camera preview pip; no frames are captured or stored.
- **Confirm dialog is browser-native.** The End Test confirmation uses `window.confirm()`. In some automation or testing contexts this may be auto-dismissed.
