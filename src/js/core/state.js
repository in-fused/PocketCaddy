(function () {
  "use strict";

  const SESSION_KEY = "pocketcaddy_live_session_v2";
  const ROUND_HISTORY_KEY = "pocketCaddy_round_history";
  const ROUND_HISTORY_LIMIT = 50;
  const IDENTITY_KEY_PREFIX = "pocketcaddy_identity_";
  function safeClone(obj) {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (_err) {
      return obj == null ? obj : Array.isArray(obj) ? obj.slice() : { ...obj };
    }
  }

  function getSession() {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (_err) {
      return null;
    }
  }

  function isObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function isValidCssColor(value) {
    const text = typeof value === "string" ? value.trim() : "";
    if (!text) return false;
    if (typeof CSS !== "undefined" && CSS && typeof CSS.supports === "function") {
      return CSS.supports("color", text);
    }
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(text);
  }

  function sanitizeSessionBranding(branding) {
    if (!isObject(branding)) return null;
    const next = {};

    if (Object.prototype.hasOwnProperty.call(branding, "displayName")) {
      next.displayName = String(branding.displayName == null ? "" : branding.displayName);
    }
    if (Object.prototype.hasOwnProperty.call(branding, "subtitle")) {
      next.subtitle = String(branding.subtitle == null ? "" : branding.subtitle);
    }
    if (Object.prototype.hasOwnProperty.call(branding, "logoPath")) {
      next.logoPath = String(branding.logoPath == null ? "" : branding.logoPath).trim();
    }

    const colorKeys = ["accentColor", "accentStrongColor", "accentSoftColor", "surfaceTint", "inkColor"];
    for (let i = 0; i < colorKeys.length; i += 1) {
      const key = colorKeys[i];
      if (!Object.prototype.hasOwnProperty.call(branding, key)) continue;
      if (isValidCssColor(branding[key])) next[key] = String(branding[key]).trim();
    }

    return Object.keys(next).length ? next : null;
  }

  function saveSession(session) {
    if (!isObject(session)) return;
    const existing = getSession();
    const merged = {
      ...(isObject(existing) ? existing : {}),
      ...session
    };
    const incomingRoundId = session.roundId == null ? null : String(session.roundId);
    const previousRoundId = existing && existing.roundId != null ? String(existing.roundId) : null;
    if (incomingRoundId && previousRoundId && incomingRoundId !== previousRoundId) {
      delete merged.roundName;
      delete merged.playersCount;
      delete merged.holesTotal;
      delete merged.holesComplete;
      if (!Object.prototype.hasOwnProperty.call(session, "branding")) {
        delete merged.branding;
      }
    }
    if (Object.prototype.hasOwnProperty.call(session, "branding")) {
      const sanitizedBranding = sanitizeSessionBranding(session.branding);
      if (sanitizedBranding) {
        merged.branding = sanitizedBranding;
      } else {
        delete merged.branding;
      }
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(merged));
  }

  function getSessionBranding(session) {
    const source = isObject(session) ? session : getSession();
    if (!isObject(source)) return null;
    return sanitizeSessionBranding(source.branding);
  }

  function persistSessionBranding(branding, roundId) {
    const sanitizedBranding = sanitizeSessionBranding(branding);
    if (!sanitizedBranding) return;
    const existing = getSession();
    const resolvedRoundId = roundId != null
      ? String(roundId)
      : (existing && existing.roundId != null ? String(existing.roundId) : null);
    if (!resolvedRoundId) return;
    saveSession({
      roundId: resolvedRoundId,
      branding: sanitizedBranding
    });
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function clearLocalSavedSessionState(roundId) {
    const session = getSession();
    const resolvedRoundId = roundId || (session && session.roundId) || null;
    clearSession();
    if (!resolvedRoundId) return;
    try {
      localStorage.removeItem(identityKey(resolvedRoundId));
    } catch (_err) {
      // localStorage may be unavailable; session clear is still the primary action
    }
  }

  function identityKey(roundId) {
    return `${IDENTITY_KEY_PREFIX}${roundId}`;
  }

  function shouldUpdateSessionSnapshot(existing, next) {
    if (!next || !next.roundId) return false;
    if (!existing || typeof existing !== "object") return true;
    return String(existing.roundId || "") !== String(next.roundId || "")
      || String(existing.roundName || "") !== String(next.roundName || "")
      || Number(existing.playersCount) !== Number(next.playersCount)
      || Number(existing.holesTotal) !== Number(next.holesTotal)
      || Number(existing.holesComplete) !== Number(next.holesComplete);
  }

  function persistSessionSnapshot(snapshot) {
    if (!snapshot || !snapshot.roundId) return;
    const existing = getSession();
    if (!shouldUpdateSessionSnapshot(existing, snapshot)) return;
    const merged = {
      ...(existing && typeof existing === "object" ? existing : {}),
      ...snapshot
    };
    saveSession(merged);
  }

  function normalizeRoundHistoryEntry(entry) {
    if (!entry || typeof entry !== "object") return null;
    const roundId = entry.roundId == null ? null : String(entry.roundId);
    if (!roundId) return null;
    const date = entry.date || entry.completedAt || entry.savedAt || new Date(0).toISOString();
    const standingsSource = Array.isArray(entry.standings) ? entry.standings : [];
    const standings = standingsSource.map((row) => ({
      id: row && row.id != null ? String(row.id) : "",
      name: row && row.name != null ? String(row.name) : "Player",
      rank: row && row.rank != null ? String(row.rank) : "-",
      total: Number.isFinite(Number(row && row.total)) ? Number(row.total) : null,
      front: Number.isFinite(Number(row && row.front)) ? Number(row.front) : null,
      back: Number.isFinite(Number(row && row.back)) ? Number(row.back) : null,
      relative: Number.isFinite(Number(row && row.relative)) ? Number(row.relative) : null,
      holeScores: Array.isArray(row && row.holeScores)
        ? row.holeScores.map((value) => (Number.isInteger(value) ? value : null))
        : []
    }));
    const winnerNames = Array.isArray(entry.winnerNames)
      ? entry.winnerNames.map((name) => String(name)).filter((name) => name.trim().length > 0)
      : [];
    return {
      roundId: roundId,
      roundName: String(entry.roundName || ""),
      courseName: String(entry.courseName || ""),
      tee: String(entry.tee || ""),
      holes: Number(entry.holes) === 9 ? 9 : 18,
      date: date,
      players: Array.isArray(entry.players)
        ? entry.players.map((player) => ({
            id: player && player.id != null ? String(player.id) : "",
            name: player && player.name != null ? String(player.name) : "Player"
          }))
        : standings.map((row) => ({ id: row.id, name: row.name })),
      scores: Array.isArray(entry.scores)
        ? entry.scores.map((score) => ({
            playerId: score && score.playerId != null ? String(score.playerId) : "",
            playerName: score && score.playerName != null ? String(score.playerName) : "Player",
            holeScores: Array.isArray(score && score.holeScores)
              ? score.holeScores.map((value) => (Number.isInteger(value) ? value : null))
              : [],
            total: Number.isFinite(Number(score && score.total)) ? Number(score.total) : null
          }))
        : standings.map((row) => ({
            playerId: row.id,
            playerName: row.name,
            holeScores: Array.isArray(row.holeScores) ? row.holeScores.slice() : [],
            total: row.total
          })),
      standings: standings,
      winnerLabel: String(entry.winnerLabel || "Winner"),
      winnerNames: winnerNames,
      winnerIds: Array.isArray(entry.winnerIds) ? entry.winnerIds.map((id) => String(id)) : [],
      highlights: entry.highlights && typeof entry.highlights === "object" ? safeClone(entry.highlights) : {},
      insights: entry.insights && typeof entry.insights === "object" ? safeClone(entry.insights) : {},
      competitiveTags: Array.isArray(entry.competitiveTags)
        ? entry.competitiveTags.map((tag) => ({
            key: String((tag && tag.key) || ""),
            label: String((tag && tag.label) || ""),
            detail: String((tag && tag.detail) || "")
          }))
        : []
    };
  }

  function readRoundHistoryFromStorage() {
    let raw = null;
    try {
      raw = localStorage.getItem(ROUND_HISTORY_KEY);
    } catch (_err) {
      return [];
    }
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(normalizeRoundHistoryEntry).filter(Boolean);
    } catch (_err) {
      return [];
    }
  }

  function writeRoundHistoryToStorage(history) {
    try {
      localStorage.setItem(ROUND_HISTORY_KEY, JSON.stringify(history));
    } catch (_err) {
      // localStorage can be unavailable; rendering still uses in-memory history
    }
  }

  function getHistoryDateSortValue(entry) {
    if (!entry) return 0;
    const raw = entry.date || entry.completedAt || entry.savedAt;
    const time = Date.parse(raw || "");
    return Number.isFinite(time) ? time : 0;
  }

  function capRoundHistory(history) {
    return (Array.isArray(history) ? history : [])
      .slice()
      .sort((a, b) => getHistoryDateSortValue(b) - getHistoryDateSortValue(a))
      .slice(0, ROUND_HISTORY_LIMIT);
  }

  function loadRoundHistoryFromStorage() {
    return capRoundHistory(readRoundHistoryFromStorage());
  }

  window.PocketCaddyState = {
    safeClone,
    getSession,
    saveSession,
    getSessionBranding,
    persistSessionBranding,
    clearLocalSavedSessionState,
    persistSessionSnapshot,
    identityKey,
    readRoundHistoryFromStorage,
    writeRoundHistoryToStorage,
    loadRoundHistoryFromStorage,
    capRoundHistory,
    ROUND_HISTORY_LIMIT
  };
})();
