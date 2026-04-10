# PocketCaddy – Repo Refactor Plan (Future Phase)

## STATUS

Planned – NOT executed

This document defines the future refactor strategy for restructuring the PocketCaddy codebase into a modular architecture.

This plan must NOT be executed until explicitly triggered.

---

## 🚫 RULES

* Do NOT refactor during active feature development
* Do NOT restructure working code
* Do NOT introduce regressions
* Only execute when instructed by roadmap phase

---

## 🎯 GOALS

* Break up large files (especially app.js)
* Separate logic by responsibility
* Improve readability and maintainability
* Prepare for advanced features and scaling

---

## 🧱 TARGET STRUCTURE

/public
index.html

/src
/js
app.js

```
/core
  state.js
  dom.js
  events.js

/features
  scoring.js
  session.js
  rounds.js
  payouts.js
  intelligence.js

/integrations
  supabase.js
  weather.js
  courseSearch.js
  courseEnrichment.js

/ui
  renderScorecard.js
  renderLeaderboard.js
  renderCourseIntel.js
  renderShotIntel.js
```

/styles
styles.css

/utils
helpers.js
formatters.js

---

## 🧠 ARCHITECTURE RULES

* app.js = orchestrator only
* No business logic directly in app.js
* One responsibility per module
* UI rendering separated from logic
* Integrations isolated from core logic

---

## 🔄 MIGRATION PLAN

Execute in phases:

1. Extract state management
2. Extract scoring logic
3. Extract session logic
4. Extract integrations
5. Extract UI rendering
6. Final cleanup

Each step must:

* preserve functionality
* pass tests
* avoid regressions

---

## ⚠️ WHY THIS IS DELAYED

* Current priority = feature velocity
* App is actively evolving
* Refactor introduces unnecessary risk right now

---

## 🟢 EXECUTION TRIGGER

Begin this phase ONLY when:

* Core features are stable
* Minimal bugs remain
* Roadmap reaches Phase 12+

---

## ✅ SUCCESS CRITERIA

* Smaller modular files
* Easier debugging
* Faster iteration
* Clean separation of concerns
* Zero regressions

---

## END
