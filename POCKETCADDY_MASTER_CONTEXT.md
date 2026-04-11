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
2. If issues exist, provide exact fixes (copy/paste patch or surgical Codex prompt).
3. If clean, explicitly approve for commit.
4. Return BOTH GitHub fields as copy/paste-ready blocks:

```text
GitHub Commit Summary
<one-line summary>
```

```text
GitHub Commit Description
- <change 1>
- <change 2>
- <change 3>
```

5. Immediately return the NEXT PHASE PROMPT as a copy/paste-ready Codex block:

```text
<next-phase Codex prompt>
```

No extra text outside required outputs.

### 3. REVIEW DISCIPLINE

- Ground all review feedback in the actual attached/current files.
- Do not speculate about code that is not present.
- Keep fixes surgical and regression-safe.

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
- Integrations must stay real, lightweight, and free-tier friendly where possible.

### 6. SESSION / STATE RULES

- Local session state is device-local only.
- Supabase is shared truth.
- Never delete shared round data from a local-only action.
- Always clean localStorage/session state to avoid ghost identities.

---

## CURRENT PROJECT STATUS

### Completed Milestones (Compressed)

- Realtime multiplayer scoring platform is live: create/join by link or ID, identity locking, live sync, per-hole entry, leaderboard, and tie-aware ranking.
- Scoring intelligence is live: par-by-hole, relative-to-par scoring, birdie/eagle-style outcome detection, hole intelligence strip, and shot intelligence surfaces.
- Course intelligence stack is live: searchable courses, metadata persistence, weather/wind display, static preview map, and Overpass enrichment (greens/bunkers/fairways/tees) with unavailable-state handling.
- Home/hub system has been fully built and polished: hero + next-best-action framing, quick actions, create/join sections, saved-session card, resume/remove local session flow, and improved navigation clarity.
- Local history and replay flow is live: completed round snapshots, player progression stats, expandable history rows, replay panel, and device-local history persistence limits.
- Share system buildout is live: share link UX, native share integration when available, generated round results image card, save image flow, summary copy fallback, and completion gating.
- Payout/pot controls and lock behavior are integrated into round flow and sync safely with scoring state.

### Current UI/Product State

- PocketCaddy now operates as a polished home-first app with a strong create/join/resume/history entry experience and a full live scoring workspace.
- Original early-phase roadmap goals are largely implemented in production form.

### Active Focus (Now)

- Productization pass on the home/hub into a stronger dashboard/welcome screen while preserving existing core flows.
- Continue tightening reliability and clarity in edge states (`Unavailable`, partial data, and fallback behavior) without regressions.

---

## NEXT PRIORITIES (REAL ORDER)

1. Homepage/Hub Dashboard Productization
- Elevate the current home hub into a true dashboard/welcome surface.
- Improve hierarchy of "resume vs create vs join" decisions and contextual guidance.
- Keep startup actions fast and obvious on iPhone first, desktop polished second.

2. Real Golf Content Surfaces
- Add practical content entry points on the home/dashboard for golf relevance (graphics modules, useful links, articles, live tournament/livestream/news gateways).
- Integrate only lightweight, maintainable, real-data sources; show `Unavailable` when feeds are missing.
- Ensure content surfaces complement core round actions rather than distracting from them.

3. Core Flow Protection During Expansion
- Preserve and continuously verify create/join/resume/history and live scoring integrity while dashboard/content work expands.
- No regressions in identity handling, realtime sync, score accuracy, or share output.

4. Targeted UX/Resilience Cleanup
- Continue small, high-impact polish in feedback states, fallback messaging, and interaction speed.
- Prioritize fixes that reduce user confusion and session friction.

5. Deferred Structural Refactor (Still Deferred)
- `POCKETCADDY_REFACTOR_PLAN.md` remains defined but not active.
- Do not execute repo-wide refactor until explicitly triggered.

---

## UX PRINCIPLES

- Fast over fancy.
- Clear over clever.
- Real data over fake data.
- Mobile first always.
- Desktop is enhancement, not a separate product.

---

## GLOBAL ACCEPTANCE CRITERIA

PocketCaddy must always:

- Work on iPhone reliably.
- Keep create/join/resume/history flows unbroken.
- Keep live scoring and leaderboard flows unbroken.
- Have no dead buttons.
- Use no mock data.
- Preserve realtime integrity.
- Preserve identity integrity.
- Preserve score accuracy.

---

## SESSION CONTINUATION CONTRACT

When a new session begins:

1. User provides this document.
2. Assistant confirms understanding, summarizes current state, and identifies active focus.
3. User says `continue`.
4. Assistant returns `NEXT PHASE PROMPT` only (copy/paste-ready).

No deviation.

---

## END
