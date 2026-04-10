# PocketCaddy – Master Context, Workflow, and Roadmap

## PURPOSE

This document enforces strict workflow continuity, development standards, and execution speed for the PocketCaddy project.

Any new ChatGPT session MUST:

1. Read this document fully
2. Confirm understanding
3. Continue execution without re-planning or unnecessary discussion

---

# CORE RULES (NON-NEGOTIABLE)

## 1. NO PAUSES / NO DRIFT

* Do NOT preview future phases
* Do NOT explain what’s coming next unless asked
* Do NOT slow workflow with commentary
* Only:

  * Review → Approve/Fix → Provide Commit → Provide Next Phase Prompt

---

## 2. RESPONSE FORMAT (STRICT)

Every cycle must follow:

1. Review submitted files
2. If issues:

   * Provide EXACT FIX (copy/paste OR surgical prompt)
3. If clean:

   * Approve for commit
4. Provide:

   * GitHub Commit Summary
   * GitHub Commit Description
5. Immediately provide:

   * NEXT PHASE PROMPT (Codex-ready)

NO EXTRA TEXT

---

## 3. CODING STYLE REQUIREMENTS

* Preserve CURRENT MAIN as baseline
* NO rewrites of working systems
* ONLY additive or surgical changes
* Maintain:

  * mobile-first responsiveness
  * desktop polish
  * zero regression tolerance

---

## 4. DATA POLICY (CRITICAL)

* NO mock data EVER
* If data unavailable:
  → UI must say "Unavailable"
* All integrations must be:

  * real
  * free-tier compatible
  * lightweight

---

## 5. SESSION / STATE RULES

* Local session = device only
* Supabase = shared truth
* NEVER:

  * delete shared round from local action
* ALWAYS:

  * clean localStorage properly
  * avoid ghost identity states

---

## CURRENT IMPLEMENTATION STATUS

## ✅ COMPLETED

### Core App

* Round creation
* Join via link / ID
* Realtime sync (Supabase)
* Identity locking per player
* Score entry system (per hole)

### Score Intelligence

* Par system per hole
* Birdie / Eagle / etc detection
* Relative scoring (+/- vs par)
* Leaderboard ranking with ties

### UI/UX

* Mobile-first layout
* Desktop scorecard FIXED (Phase 8)
* Sticky player column
* Smooth score input system

### Quick Actions (Phase 8)

* Create Round
* Join Round
* Resume Saved Round
* Cancel Saved Round (UI)

### Session Handling (Phase 9)

* Resume session
* Cancel saved session (local only)
* Identity cleanup per round
* Start new round reset

### Course Intelligence (Phase 7–8)

* Course search (real API)
* Metadata storage (lat/lng/location)
* Weather (Open-Meteo)
* Wind data
* Static preview map
* Overpass enrichment (greens, bunkers, etc)

---

## 🔧 CURRENT PHASE

PHASE 9 COMPLETE
(Requires minor UX feedback improvement only)

---

## 🚀 UPCOMING PHASES

## PHASE 10 – INTELLIGENCE UPGRADE

* Improve weather/wind reliability handling
* Improve course preview robustness
* Enhance shot intelligence logic
* Better handling of missing/incomplete data
* Strengthen "Unavailable" states

---

## PHASE 11 – COURSE EXPERIENCE

* Course selection UX improvements
* Smarter search prioritization
* Better metadata usage
* Potential hole-by-hole enhancements

---

## PHASE 12 – GAME EXPERIENCE

* Round flow polish
* Visual feedback improvements
* Interaction speed improvements
* Reduced friction in scoring

---

## PHASE 13 – ADVANCED FEATURES

* Multi-round handling (optional)
* Enhanced payouts logic
* Expanded stats (birdies, streaks, etc)

---

## PHASE 14 – HOMEPAGE / HUB

* Golf media-style homepage
* News integration (if free + viable)
* Live tournament embeds (if feasible)
* Visual polish

---

## PHASE 15+ (FUTURE)

* AI insights expansion
* Course-specific intelligence
* Wind direction modeling
* Distance + club refinement
- Repo refactor plan defined in POCKETCADDY_REFACTOR_PLAN.md (DO NOT EXECUTE until triggered)
---

# UX PRINCIPLES

* Fast > Fancy
* Clear > Clever
* Real Data > Fake Data
* Mobile First ALWAYS
* Desktop = Enhanced, not separate system

---

# ACCEPTANCE CRITERIA (GLOBAL)

App must ALWAYS:

* Work on iPhone (primary platform)
* Have no broken flows
* Have no dead buttons
* Have no mock data
* Maintain realtime integrity
* Maintain identity integrity
* Maintain score accuracy

---

# WORKFLOW CONTINUATION INSTRUCTION

When a new session begins:

STEP 1:
User provides this document

STEP 2:
Assistant MUST:

* Confirm understanding
* Summarize current state
* Identify current phase

STEP 3:
User says:
"continue"

STEP 4:
Assistant provides:
→ NEXT PHASE PROMPT ONLY

NO deviation.

---

# END OF DOCUMENT
