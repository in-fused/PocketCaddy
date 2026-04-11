# PocketCaddy - Master Context, Workflow, and Priorities

## PURPOSE

This document enforces workflow continuity, execution standards, and current product direction for PocketCaddy.

Any new session MUST:

1. Read this file fully.
2. Confirm understanding.
3. Continue execution without re-planning drift.

---

## CORE RULES (NON-NEGOTIABLE)

### 1. NO PAUSES / NO DRIFT

- Do NOT preview speculative future phases.
- Do NOT add extra narration.
- Do NOT slow the cycle with unnecessary commentary.
- Operate in this order only: `Review -> Fix/Approve -> Commit package -> Next prompt`.

### 2. RESPONSE FORMAT (STRICT)

Every cycle must:

1. Review the submitted/attached files first.
2. If issues exist, provide exact fixes as a copy/paste-ready surgical Codex prompt.
3. If clean, explicitly approve for commit.
4. Return BOTH GitHub fields as copy/paste-ready blocks.
5. Immediately return the NEXT PHASE PROMPT as a copy/paste-ready block.
6. NEVER make the user ask again for commit blocks or next phase prompt.

### 3. REVIEW DISCIPLINE

- Ground all review feedback in the actual attached/current files.
- Do not speculate about code that is not present.
- Keep fixes surgical and regression-safe.
- User commits directly to `main`, so approvals must be accurate.

### 4. CODING STYLE REQUIREMENTS

- Preserve current `main` behavior as baseline.
- No rewrites of working systems unless explicitly requested.
- Prefer additive or surgical updates.
- Maintain:
  - mobile-first responsiveness
  - desktop polish
  - zero regression tolerance

### 5. DATA POLICY (CRITICAL)

- NO mock data.
- If data is unavailable, UI must show `Unavailable`.
- Integrations must stay real, lightweight, and maintainable.

### 6. SESSION / STATE RULES

- Local session state is device-local only.
- Supabase is shared truth.
- Never delete shared round data from a local-only action.
- Always clean localStorage/session state to avoid ghost identities.

### 7. COPY/PASTE BLOCK REQUIREMENT

- ALL outputs must be single clean copy/paste blocks when requested.
- No broken formatting.
- No split outputs across multiple blocks when one is expected.
- Codex prompts MUST be one continuous block.
- Docs MUST be one continuous block.

---

## CURRENT PROJECT STATUS

### Completed Milestones (Compressed)

- Realtime multiplayer scoring (create/join/link/ID, live sync, leaderboard, ranking)
- Scoring intelligence (par logic, relative scoring, outcomes, hole intel)
- Course intelligence (search, weather, Overpass enrichment, map preview)
- Local history + replay system
- Share system (image generation, native share, fallback summary)
- Payout + pot controls integrated

### Home / Hub Status

- Fully panel-based hub system implemented
- Navigation unified in app.js
- Inline navigation removed from index.html
- No scrollIntoView or anchor-based navigation in hub
- Modes:
  - Home
  - Operations
  - History
  - Golf

Core flows preserved:
- Create Round
- Join Round
- Resume Session
- Remove local session
- History + Replay

### Current UI/Product State

- Home-first app with real hub navigation
- Stable production-level scoring system
- Dashboard direction actively evolving

---

## ACTIVE FOCUS

- Homepage / Hub dashboard productization
- Operations panel structure refinement
- UX clarity improvements without regression
- Stability of all core flows

---

## NEXT PRIORITIES

1. Homepage/Hub Dashboard Productization  
- Strengthen dashboard feel and hierarchy  
- Improve decision clarity (resume vs create vs join)  

2. Operations Panel Structure  
- Separate:
  - Start Round
  - Continue
  - Quick Actions  
- Improve layout clarity without changing logic  

3. Real Golf Content Surfaces  
- Add real links/resources/modules  
- Show `Unavailable` when no data  
- Keep lightweight and maintainable  

4. Core Flow Protection  
- No regressions in:
  - create/join/resume  
  - scoring  
  - realtime sync  
  - identity  
  - history/replay  

5. UX / Resilience Polish  
- Improve feedback states  
- Reduce friction  
- Clean edge cases  

6. Deferred Refactor  
- `POCKETCADDY_REFACTOR_PLAN.md` remains deferred  
- DO NOT execute until explicitly triggered  

---

## UX PRINCIPLES

- Fast over fancy  
- Clear over clever  
- Real data over fake data  
- Mobile first  
- App-like navigation, not webpage behavior  

---

## GLOBAL ACCEPTANCE CRITERIA

PocketCaddy must always:

- Work on iPhone reliably  
- Keep all flows unbroken  
- Have no dead buttons  
- Use no mock data  
- Preserve realtime integrity  
- Preserve identity integrity  
- Preserve score accuracy  
- Preserve hub navigation system  

---

## SESSION CONTINUATION CONTRACT

When a new session begins:

1. User provides this document  
2. Assistant confirms understanding  
3. Assistant summarizes:
   - current state  
   - active focus  
   - refactor status (must say deferred)  
4. User says `continue`  
5. Assistant returns NEXT PHASE PROMPT only (single block)  

NO deviation.

---

## END


GitHub Commit Summary
Docs: Update master context for unified hub navigation and current priorities

GitHub Commit Description
- Updated master context to reflect panel-based home hub system and unified navigation
- Added current product state, active focus, and operations panel priority
- Enforced strict single-block output formatting and workflow rules