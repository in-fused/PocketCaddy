# PocketCaddy – Repo Refactor Plan (Phase 44+)

## STATUS

Planned – NOT executed

This document defines the approved strategy for restructuring the PocketCaddy frontend into a modular architecture.

⚠️ This plan must ONLY be executed when explicitly triggered by roadmap phase.

---

## 🚫 NON-NEGOTIABLE RULES

- DO NOT refactor during active feature development
- DO NOT change behavior of any working feature
- DO NOT rewrite logic unless absolutely required for extraction
- DO NOT introduce regressions
- ALL functionality must remain identical before and after refactor
- This is a structural reorganization ONLY

---

## 🎯 GOALS

- Break up large files (especially app.js)
- Separate responsibilities cleanly
- Improve readability and maintainability
- Prepare for future feature expansion (dashboard, intelligence, integrations)
- Reduce risk of regression during future development

---

## 🧠 CURRENT REALITY (IMPORTANT)

The app now includes:

- A **panel-based Home Hub system**
  - Home / Operations / History / Golf modes
- Fully working flows:
  - Create Round
  - Join Round
  - Resume Session
  - Cancel Session
  - Round History + Replay
- Centralized navigation logic in app.js (post Phase 44)

👉 This refactor MUST respect and preserve this architecture.

---

## 🧱 TARGET STRUCTURE

/public
  index.html

/src
  /js
    app.js (orchestrator ONLY)

    /core
      state.js
      dom.js
      event-bus.js

    /navigation
      homeHub.js        ← NEW (critical)
      viewManager.js

    /round
      create.js
      join.js
      resume.js

    /score
      scoring.js
      leaderboard.js

    /history
      history.js
      replay.js

    /ui
      homeUI.js
      operationsUI.js
      dashboardUI.js
      modal.js
      feedback.js

    /integrations
      supabase.js
      (future APIs)

    /utils
      helpers.js
      formatters.js

/styles
  styles.css

---

## 🔑 ARCHITECTURE RULES

- app.js = orchestrator ONLY
- No business logic directly in app.js after refactor
- One responsibility per module
- UI rendering separated from logic
- Navigation system must be isolated (homeHub.js)
- No duplicate event listeners
- No DOM queries scattered across modules

---

## 🧭 CRITICAL MODULE: HOME HUB

The Home Hub system introduced in Phase 44 must be extracted cleanly:

homeHub.js should handle:
- Mode switching (home / operations / history / golf)
- Active state management
- Hub navigation buttons
- Panel visibility control

This is a FIRST-CLASS system, not a side utility.

---

## 🔄 MIGRATION PLAN (STRICT ORDER)

Execute in small, safe steps:

### STEP 1 – Extract Home Hub Navigation
- Move hub logic out of app.js
- Create homeHub.js
- Preserve all behavior exactly

### STEP 2 – Extract State Management
- Centralize session, round, and UI state

### STEP 3 – Extract Round Logic
- Create / Join / Resume flows

### STEP 4 – Extract Scoring + Leaderboard
- Move scoring + payout logic

### STEP 5 – Extract History + Replay
- Move history rendering and replay logic

### STEP 6 – Extract UI Rendering
- Move DOM manipulation into UI modules

### STEP 7 – Final Cleanup
- Remove dead code
- Remove duplication
- Ensure app.js is orchestration-only

---

## ⚠️ WHY THIS IS DELAYED

- App recently stabilized after major UI + navigation overhaul
- Feature velocity has been prioritized
- Refactor introduces risk if done too early

---

## 🟢 EXECUTION TRIGGER

Refactor begins ONLY when:

- Homepage / hub is fully stable
- No major UI or navigation changes pending
- Core flows are verified stable
- Explicit Phase trigger is given

---

## ✅ SUCCESS CRITERIA

- Smaller, modular files
- Clean separation of concerns
- Easier debugging and iteration
- No duplicated logic
- Home hub system fully isolated
- Zero regressions

---

## 🚀 FINAL NOTE

This refactor is the foundation for:

- Advanced dashboard features
- Real golf data integrations
- AI/intelligence layers
- Scalable UI expansion

Do not rush this phase.

---

## END