# Athena — Online Proctoring Application

Athena is a lightweight, responsive proctoring application engineered for secure, fair, and reliable academic examinations. It operates as both a modern web application and an Electron desktop shell.

---

## Purpose & Overview

Athena ensures academic integrity during online assessments through proactive monitoring and clear candidate guidelines. The current release establishes the foundational single-page examination interface, setting up prerequisite state verification (webcam monitoring and fullscreen enforcement) prior to candidate test launch.

---

## Tech Stack

- **Runtime & Language:** JavaScript (ES2022+ Modules, modern DOM APIs)
- **Tooling & Bundler:** [Vite](https://vite.dev/) (fast HMR dev server and optimized production builds)
- **Desktop Wrapper:** [Electron](https://www.electronjs.org/) (cross-platform desktop application host)
- **Styling:** Modern semantic CSS3 (responsive grid/flexbox, custom design tokens, dark/light contrast)
- **Linting & Code Quality:** [ESLint](https://eslint.org/) (flat config, standard ECMAScript rules)

---

## Installation & Setup

### Prerequisites
- Node.js (v18.0.0 or higher recommended)
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
| `npm run electron` | Launches the Electron desktop application window |
| `npm run electron:dev` | Runs Vite dev server and launches Electron desktop app concurrently |

---

## Current UI Structure

The initial UI provides a single responsive examination page containing:

1. **Athena Title & Description:** Clear header introducing the proctoring environment.
2. **Camera Permission Control:** UI button and status indicator showing camera readiness.
3. **Fullscreen Permission Control:** UI button and status indicator showing fullscreen environment status.
4. **Camera Preview Area:** Dedicated 4:3 viewport box indicating where the live proctoring stream will appear.
5. **Examination Rules:** Explicit instructions covering fullscreen retention, camera visibility, time limits, and external application policies.
6. **Exam Duration:** Displaying the configured examination duration (5 minutes by default).
7. **Start Test Button:** Dynamically disabled until both camera access and fullscreen prerequisites are fulfilled in the UI state.
8. **Examination Area Placeholder:** Staging container reserved for active test questions and answer selections in Phase 2.
9. **Completion Area Placeholder:** Staging container reserved for submission summaries, proctor logs, and confirmation in Phase 3.

---

## Feature Matrix: Working Functionality vs. Placeholders

To maintain phase boundaries, hardware APIs and active assessment mechanics are deliberately separated into subsequent development phases:

| Feature | Current Phase Status | Notes / Phase Plan |
| :--- | :---: | :--- |
| **Responsive Examination Page** | **Working** | Clean, minimal layout adaptable across desktop and mobile screens |
| **UI State Management** | **Working** | Dynamic state toggles for camera and fullscreen readiness |
| **Start Button Prerequisite Logic** | **Working** | `Start Test` button dynamically enables/disables based on prerequisites |
| **Exam Duration Configuration** | **Working** | Configured to 5 minutes by default (`durationMinutes: 5`) |
| **Exam Rules Display** | **Working** | Visual list outlining candidate guidelines |
| **Camera Preview Feed** | *Placeholder* | UI preview card only; `navigator.mediaDevices.getUserMedia` arrives in Phase 2 |
| **Fullscreen Mode Activation** | *Placeholder* | UI state toggle only; `document.documentElement.requestFullscreen()` arrives in Phase 2 |
| **Active Exam & Questions Area** | *Placeholder* | Visual placeholder card; question delivery engine arrives in Phase 2 |
| **5-Minute Countdown Timer** | *Placeholder* | Displayed as default duration; live countdown timer arrives in Phase 2 |
| **Screenshot / Snapshot Capture** | *Placeholder* | Automated proctoring snapshot capture arrives in Phase 3 |
| **Session Completion & Audit** | *Placeholder* | Completion workspace placeholder; submission flow arrives in Phase 3 |

---

## Roadmap & Implementation Plan

### Phase 2: Proctoring Engine & Examination Delivery
- Connect live webcam stream to the Camera Preview container via WebRTC / `getUserMedia`.
- Integrate Fullscreen API with exit detection, blur detection, and candidate warning banners.
- Implement question pagination, question types (multiple-choice, text response), and state preservation.
- Activate the 5-minute countdown timer with auto-submit upon expiration.

### Phase 3: Automated Monitoring & Submission
- Implement periodic candidate video frame snapshots for proctor auditing.
- Add anomaly detection indicators (face occlusion, multiple faces, tab focus losses).
- Implement final exam submission review, verification receipt, and audit report generation.
