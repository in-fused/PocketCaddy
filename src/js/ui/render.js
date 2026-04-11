(function () {
  "use strict";

  function toExportText(value) {
    const text = value == null ? "" : String(value).trim();
    return text || "Unavailable";
  }

  function toExportNumberOrFallback(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : "Unavailable";
  }

  function inferHoleCount(roundEntry) {
    const declared = Number(roundEntry && roundEntry.holes);
    if (Number.isInteger(declared) && declared > 0) return declared;
    const scoreRows = Array.isArray(roundEntry && roundEntry.scores) ? roundEntry.scores : [];
    const standings = Array.isArray(roundEntry && roundEntry.standings) ? roundEntry.standings : [];
    let longest = 0;
    scoreRows.forEach((row) => {
      const length = Array.isArray(row && row.holeScores) ? row.holeScores.length : 0;
      if (length > longest) longest = length;
    });
    standings.forEach((row) => {
      const length = Array.isArray(row && row.holeScores) ? row.holeScores.length : 0;
      if (length > longest) longest = length;
    });
    return longest > 0 ? longest : 18;
  }

  function getStandingsRankValue(row, index) {
    const rawRank = row && row.rank != null ? String(row.rank).trim() : "";
    if (!rawRank || rawRank === "-") return String(index + 1);
    return rawRank;
  }

  function normalizeWinners(roundEntry, standings) {
    const winnerNames = Array.isArray(roundEntry && roundEntry.winnerNames)
      ? roundEntry.winnerNames.map((name) => String(name || "").trim()).filter(Boolean)
      : [];
    if (winnerNames.length) return winnerNames;

    const winnerIds = new Set(Array.isArray(roundEntry && roundEntry.winnerIds)
      ? roundEntry.winnerIds.map((id) => String(id || "").trim()).filter(Boolean)
      : []);
    if (winnerIds.size) {
      const byId = standings
        .filter((row) => winnerIds.has(String(row.playerId)))
        .map((row) => row.playerName);
      if (byId.length) return byId;
    }

    const numericTotals = standings
      .map((row) => ({ name: row.playerName, total: Number(row.total) }))
      .filter((row) => Number.isFinite(row.total));
    if (!numericTotals.length) return ["Unavailable"];
    const best = Math.min(...numericTotals.map((row) => row.total));
    const derived = numericTotals.filter((row) => row.total === best).map((row) => row.name);
    return derived.length ? derived : ["Unavailable"];
  }

  function buildRoundExportData(roundEntry) {
    const entry = roundEntry || {};
    const holeCount = inferHoleCount(entry);
    const players = Array.isArray(entry.players) ? entry.players : [];
    const scores = Array.isArray(entry.scores) ? entry.scores : [];
    const standingsSource = Array.isArray(entry.standings) ? entry.standings : [];

    const playerRows = players.map((player, index) => ({
      playerId: toExportText(player && player.id ? player.id : `player-${index + 1}`),
      playerName: toExportText(player && player.name)
    }));

    const scoreRowsById = new Map();
    scores.forEach((scoreRow, index) => {
      const playerId = toExportText(scoreRow && scoreRow.playerId ? scoreRow.playerId : `score-${index + 1}`);
      const sourceScores = Array.isArray(scoreRow && scoreRow.holeScores) ? scoreRow.holeScores : [];
      const holeScores = [];
      for (let hole = 1; hole <= holeCount; hole += 1) {
        const value = sourceScores[hole - 1];
        holeScores.push({
          hole: hole,
          score: Number.isFinite(Number(value)) ? Number(value) : "Unavailable"
        });
      }
      scoreRowsById.set(playerId, {
        playerId: playerId,
        playerName: toExportText(scoreRow && scoreRow.playerName),
        holeScores: holeScores
      });
    });

    const standingsRows = standingsSource.map((row, index) => {
      const playerId = toExportText(row && row.id ? row.id : `standing-${index + 1}`);
      return {
        rank: getStandingsRankValue(row, index),
        playerId: playerId,
        playerName: toExportText(row && row.name),
        total: toExportNumberOrFallback(row && row.total),
        front9: toExportNumberOrFallback(row && row.front),
        back9: toExportNumberOrFallback(row && row.back),
        relativeToPar: toExportNumberOrFallback(row && row.relative)
      };
    });

    const standingIds = new Set(standingsRows.map((row) => row.playerId));
    standingsRows.forEach((row) => {
      if (!scoreRowsById.has(row.playerId)) {
        const standingSource = standingsSource.find((standing) => toExportText(standing && standing.id) === row.playerId) || null;
        const sourceScores = Array.isArray(standingSource && standingSource.holeScores) ? standingSource.holeScores : [];
        const holeScores = [];
        for (let hole = 1; hole <= holeCount; hole += 1) {
          const value = sourceScores[hole - 1];
          holeScores.push({
            hole: hole,
            score: Number.isFinite(Number(value)) ? Number(value) : "Unavailable"
          });
        }
        scoreRowsById.set(row.playerId, {
          playerId: row.playerId,
          playerName: row.playerName,
          holeScores: holeScores
        });
      }
    });

    playerRows.forEach((row) => {
      if (!scoreRowsById.has(row.playerId)) {
        const holeScores = [];
        for (let hole = 1; hole <= holeCount; hole += 1) {
          holeScores.push({ hole: hole, score: "Unavailable" });
        }
        scoreRowsById.set(row.playerId, {
          playerId: row.playerId,
          playerName: row.playerName,
          holeScores: holeScores
        });
      }
    });

    scoreRowsById.forEach((scoreRow, playerId) => {
      if (!playerRows.find((player) => player.playerId === playerId)) {
        playerRows.push({
          playerId: playerId,
          playerName: toExportText(scoreRow.playerName)
        });
      }
    });

    const totalsRows = playerRows.map((player) => {
      const standing = standingsRows.find((row) => row.playerId === player.playerId);
      const scoreRow = scoreRowsById.get(player.playerId);
      const numericScores = scoreRow
        ? scoreRow.holeScores.map((hole) => Number(hole.score)).filter((value) => Number.isFinite(value))
        : [];
      const computedTotal = numericScores.length ? numericScores.reduce((sum, value) => sum + value, 0) : "Unavailable";
      const frontCutoff = Math.min(9, holeCount);
      const computedFrontScores = scoreRow
        ? scoreRow.holeScores
            .slice(0, frontCutoff)
            .map((hole) => Number(hole.score))
            .filter((value) => Number.isFinite(value))
        : [];
      const computedBackScores = scoreRow
        ? scoreRow.holeScores
            .slice(frontCutoff, holeCount)
            .map((hole) => Number(hole.score))
            .filter((value) => Number.isFinite(value))
        : [];
      return {
        playerId: player.playerId,
        playerName: player.playerName,
        front9: standing ? standing.front9 : (computedFrontScores.length ? computedFrontScores.reduce((sum, value) => sum + value, 0) : "Unavailable"),
        back9: standing ? standing.back9 : (computedBackScores.length ? computedBackScores.reduce((sum, value) => sum + value, 0) : "Unavailable"),
        total: standing ? standing.total : computedTotal,
        relativeToPar: standing ? standing.relativeToPar : "Unavailable"
      };
    });

    const winners = normalizeWinners(entry, standingsRows);
    const winnerLabel = toExportText(entry && entry.winnerLabel ? entry.winnerLabel : (winners.length > 1 ? "Winners" : "Winner"));

    return {
      roundId: toExportText(entry && entry.roundId),
      roundName: toExportText(entry && entry.roundName),
      courseName: toExportText(entry && entry.courseName),
      date: toExportText(entry && entry.date),
      players: playerRows,
      perHoleScores: playerRows.map((player) => {
        const scoresByPlayer = scoreRowsById.get(player.playerId);
        return {
          playerId: player.playerId,
          playerName: player.playerName,
          holeScores: scoresByPlayer
            ? scoresByPlayer.holeScores
            : Array.from({ length: holeCount }, (_, index) => ({ hole: index + 1, score: "Unavailable" }))
        };
      }),
      totals: totalsRows,
      standings: playerRows.map((player, index) => {
        const standing = standingsRows.find((row) => row.playerId === player.playerId);
        return {
          rank: standing ? standing.rank : String(index + 1),
          playerId: player.playerId,
          playerName: player.playerName,
          total: standing ? standing.total : "Unavailable",
          relativeToPar: standing ? standing.relativeToPar : "Unavailable"
        };
      }),
      winners: {
        label: winnerLabel,
        names: winners.length ? winners : ["Unavailable"]
      }
    };
  }

  function sanitizeExportFilenamePart(value, fallback) {
    const base = String(value == null ? "" : value).trim() || String(fallback || "Unavailable");
    return base
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || String(fallback || "Unavailable");
  }

  function buildExportFilename(extension, payload) {
    const safeRoundId = sanitizeExportFilenamePart(payload && payload.roundId, "Unavailable");
    return `pocketcaddy-round-${safeRoundId}.${extension}`;
  }

  function downloadBlob(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const nav = typeof navigator !== "undefined" ? navigator : null;
    if (nav && typeof nav.msSaveOrOpenBlob === "function") {
      nav.msSaveOrOpenBlob(blob, filename);
      return;
    }

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = "noopener";
    anchor.target = "_blank";
    anchor.style.display = "none";
    const root = document.body || document.documentElement;
    root.appendChild(anchor);
    if (typeof anchor.click === "function") {
      anchor.click();
    } else {
      const clickEvent = document.createEvent("MouseEvents");
      clickEvent.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
      anchor.dispatchEvent(clickEvent);
    }
    root.removeChild(anchor);
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1200);
  }

  function escapeCsvCell(value) {
    const text = value == null ? "" : String(value);
    const escaped = text.replace(/"/g, "\"\"");
    return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
  }

  function downloadRoundAsJSON(roundEntry) {
    const payload = buildRoundExportData(roundEntry);
    const filename = buildExportFilename("json", payload);
    const content = JSON.stringify(payload, null, 2);
    downloadBlob(filename, content, "application/json;charset=utf-8");
  }

  function downloadRoundAsCSV(roundEntry) {
    const payload = buildRoundExportData(roundEntry);
    const filename = buildExportFilename("csv", payload);
    const holeCount = payload.perHoleScores.reduce((max, row) => {
      const count = Array.isArray(row && row.holeScores) ? row.holeScores.length : 0;
      return count > max ? count : max;
    }, 0);
    const headers = [
      "Round ID",
      "Round Name",
      "Course Name",
      "Date",
      "Player ID",
      "Player Name",
      "Rank"
    ];
    for (let hole = 1; hole <= holeCount; hole += 1) {
      headers.push(`Hole ${hole}`);
    }
    headers.push("Front 9");
    headers.push("Back 9");
    headers.push("Total");
    headers.push("Relative To Par");
    headers.push("Winner");

    const rows = [headers];
    payload.players.forEach((player) => {
      const standing = payload.standings.find((row) => row.playerId === player.playerId) || null;
      const totals = payload.totals.find((row) => row.playerId === player.playerId) || null;
      const scoreRow = payload.perHoleScores.find((row) => row.playerId === player.playerId) || null;
      const winnerSet = new Set(Array.isArray(payload.winners && payload.winners.names) ? payload.winners.names : []);
      const row = [
        payload.roundId,
        payload.roundName,
        payload.courseName,
        payload.date,
        player.playerId,
        player.playerName,
        standing ? standing.rank : "Unavailable"
      ];
      for (let hole = 1; hole <= holeCount; hole += 1) {
        const holeCell = scoreRow && Array.isArray(scoreRow.holeScores) ? scoreRow.holeScores[hole - 1] : null;
        row.push(holeCell && holeCell.score != null ? holeCell.score : "Unavailable");
      }
      row.push(totals ? totals.front9 : "Unavailable");
      row.push(totals ? totals.back9 : "Unavailable");
      row.push(totals ? totals.total : "Unavailable");
      row.push(totals ? totals.relativeToPar : "Unavailable");
      row.push(winnerSet.has(player.playerName) ? "Yes" : "No");
      rows.push(row);
    });

    const csv = rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
    downloadBlob(filename, csv, "text/csv;charset=utf-8");
  }

  function showError(options) {
    const opts = options || {};
    const node = opts.node;
    const message = opts.message;
    if (!node) return;
    if (!message) {
      node.classList.add("hidden");
      node.textContent = "";
      return;
    }
    node.classList.remove("hidden");
    node.textContent = message;
  }

  function showFeedback(options) {
    const opts = options || {};
    const message = opts.message;
    const type = opts.type;
    const state = opts.state;
    const dom = opts.dom;
    if (!state || !dom || !dom.scoreFeedback) return;
    const normalizedType = typeof type === "string"
      ? String(type).trim().toLowerCase()
      : (type ? "error" : "success");
    const tone = normalizedType === "error"
      ? "error"
      : (normalizedType === "neutral" ? "neutral" : "success");
    const isError = tone === "error";
    clearTimeout(state.feedbackTimer);
    clearTimeout(state.feedbackHideTimer);
    dom.scoreFeedback.textContent = message;
    dom.scoreFeedback.classList.remove("hidden", "is-exit");
    dom.scoreFeedback.classList.add("is-showing");
    dom.scoreFeedback.classList.toggle("error", Boolean(isError));
    dom.scoreFeedback.dataset.tone = tone;
    requestAnimationFrame(() => {
      dom.scoreFeedback.classList.add("is-visible");
    });
    state.feedbackTimer = setTimeout(() => {
      dom.scoreFeedback.classList.add("is-exit");
      dom.scoreFeedback.classList.remove("is-visible");
      state.feedbackHideTimer = setTimeout(() => {
        dom.scoreFeedback.classList.add("hidden");
        dom.scoreFeedback.classList.remove("error", "is-showing", "is-exit");
        dom.scoreFeedback.dataset.tone = "";
      }, 220);
    }, 2200);
  }

  function updateUIStatus(options) {
    const opts = options || {};
    const state = opts.state;
    const dom = opts.dom;
    const getSession = opts.getSession;
    if (!state || !dom || typeof getSession !== "function") return;

    const session = getSession();
    const roundId = session && session.roundId ? String(session.roundId).trim() : "";
    const hasSavedRound = roundId.length > 0;
    const shortRoundId = hasSavedRound ? `${roundId.slice(0, 8)}...` : "";
    const roundName = session && session.roundName != null ? String(session.roundName).trim() : "";
    const playersCount = session && Number.isFinite(Number(session.playersCount)) ? Math.max(0, Number(session.playersCount)) : null;
    const holesTotal = session && Number.isFinite(Number(session.holesTotal)) ? Math.max(0, Number(session.holesTotal)) : null;
    const holesCompleteRaw = session && Number.isFinite(Number(session.holesComplete)) ? Math.max(0, Number(session.holesComplete)) : 0;
    const holesComplete = holesTotal != null && holesTotal > 0 ? Math.min(holesCompleteRaw, holesTotal) : holesCompleteRaw;
    const hasProgressSnapshot = Boolean(roundName) || playersCount != null || (holesTotal != null && holesTotal > 0);
    const activeRoundLabel = state.round && state.round.id
      ? (String(state.round.name || "").trim() || `ID ${String(state.round.id).slice(0, 8)}...`)
      : "Unavailable";
    const historyCount = Array.isArray(state.roundHistory) ? state.roundHistory.length : 0;
    const historyStatus = historyCount > 0
      ? `${historyCount} ${historyCount === 1 ? "entry" : "entries"}`
      : "Unavailable";
    const syncStatus = state.round && state.channel ? "Connected" : "Ready";

    if (dom.homeSavedSessionCard) {
      dom.homeSavedSessionCard.classList.toggle("hidden", !hasSavedRound);
    }
    if (dom.homeSavedSessionCopy) {
      dom.homeSavedSessionCopy.textContent = hasSavedRound
        ? `Resume your saved round${roundName ? ` "${roundName}"` : ` (${shortRoundId})`} from this device.`
        : "Resume where you left off, or remove this local saved session.";
    }
    if (dom.homeSavedSessionProgress) {
      dom.homeSavedSessionProgress.classList.toggle("hidden", !hasSavedRound || !hasProgressSnapshot);
    }
    if (dom.homeSavedRoundName) {
      dom.homeSavedRoundName.textContent = roundName || `ID ${shortRoundId}`;
    }
    if (dom.homeSavedPlayerCount) {
      dom.homeSavedPlayerCount.textContent = playersCount == null
        ? "Unavailable"
        : `${playersCount} ${playersCount === 1 ? "player" : "players"}`;
    }
    if (dom.homeSavedHoleProgress) {
      dom.homeSavedHoleProgress.textContent = holesTotal != null && holesTotal > 0
        ? `Through ${holesComplete} of ${holesTotal} holes`
        : "Progress unavailable";
    }
    if (dom.quickResumeBtn) {
      dom.quickResumeBtn.classList.toggle("hidden", !hasSavedRound);
      dom.quickResumeBtn.disabled = !hasSavedRound;
    }
    if (dom.hubResumeBtn) {
      dom.hubResumeBtn.classList.toggle("hidden", !hasSavedRound);
      dom.hubResumeBtn.disabled = !hasSavedRound;
    }
    if (dom.quickCancelSavedBtn) {
      dom.quickCancelSavedBtn.classList.toggle("hidden", !hasSavedRound);
      dom.quickCancelSavedBtn.disabled = !hasSavedRound;
    }
    if (dom.homeView) {
      dom.homeView.classList.toggle("home-has-saved", hasSavedRound);
      dom.homeView.classList.toggle("home-no-saved", !hasSavedRound);
    }
    if (dom.homeTitle) {
      dom.homeTitle.textContent = hasSavedRound ? "Resume Your Round" : "Start a New Round";
    }
    if (dom.homeTagline) {
      dom.homeTagline.textContent = hasSavedRound
        ? "Jump back into saved progress, or start a different round when you're ready."
        : "Create a new round, add players, and start scoring in under a minute.";
    }
    if (dom.homeNextActionNote) {
      dom.homeNextActionNote.textContent = hasSavedRound
        ? "Next best action: Resume Saved Round to continue where you left off."
        : "Next best action: Create Round to launch a new scorecard.";
    }
    if (dom.homeStatusActiveRound) {
      dom.homeStatusActiveRound.textContent = activeRoundLabel;
      dom.homeStatusActiveRound.classList.toggle("is-unavailable", activeRoundLabel === "Unavailable");
    }
    if (dom.homeStatusLocalSession) {
      dom.homeStatusLocalSession.textContent = hasSavedRound ? "Available" : "Unavailable";
      dom.homeStatusLocalSession.classList.toggle("is-unavailable", !hasSavedRound);
    }
    if (dom.homeStatusHistory) {
      dom.homeStatusHistory.textContent = historyStatus;
      dom.homeStatusHistory.classList.toggle("is-unavailable", historyStatus === "Unavailable");
    }
    if (dom.homeStatusSync) {
      dom.homeStatusSync.textContent = syncStatus;
      dom.homeStatusSync.classList.toggle("is-unavailable", false);
    }
    if (dom.homeHistoryPreviewStatus) {
      dom.homeHistoryPreviewStatus.textContent = historyStatus;
      dom.homeHistoryPreviewStatus.classList.toggle("is-unavailable", historyStatus === "Unavailable");
    }
    if (dom.homeGolfPreviewStatus) {
      dom.homeGolfPreviewStatus.textContent = "Resources Ready";
      dom.homeGolfPreviewStatus.classList.toggle("is-unavailable", false);
    }
    if (dom.hubCreateBtn) {
      dom.hubCreateBtn.classList.toggle("home-primary-focus", !hasSavedRound);
      dom.hubCreateBtn.classList.toggle("home-secondary-focus", hasSavedRound);
    }
    if (dom.hubJoinBtn) {
      dom.hubJoinBtn.classList.add("home-core-path");
    }
    if (dom.hubResumeBtn) {
      dom.hubResumeBtn.classList.toggle("home-primary-focus", hasSavedRound);
      dom.hubResumeBtn.classList.toggle("home-secondary-focus", !hasSavedRound);
    }
  }

  function renderCourseSuggestions(options) {
    const opts = options || {};
    const dom = opts.dom;
    const results = opts.results;
    const escapeHtml = opts.escapeHtml;
    const getCourseSuggestionHint = opts.getCourseSuggestionHint;
    if (!dom || !dom.courseSearchList) return;
    const list = Array.isArray(results) ? results : [];
    if (list.length === 0) {
      dom.courseSearchList.classList.add("hidden");
      dom.courseSearchList.innerHTML = "";
      return;
    }
    dom.courseSearchList.innerHTML = list.map((item, index) => `
      <button class="course-suggestion" type="button" data-index="${index}" role="option">
        <div class="course-suggestion-main">${escapeHtml(item.displayName || "")}</div>
        <div class="course-suggestion-sub">${escapeHtml(item.locationText || "Location unavailable")}</div>
        <div class="course-suggestion-sub muted tiny">${escapeHtml(getCourseSuggestionHint(item))}</div>
      </button>
    `).join("");
    dom.courseSearchList.classList.remove("hidden");
  }

  function setCourseSearchStatus(options) {
    const opts = options || {};
    const dom = opts.dom;
    const message = opts.message;
    if (!dom || !dom.courseSearchStatus) return;
    const text = String(message || "");
    if (!text) {
      dom.courseSearchStatus.classList.add("hidden");
      dom.courseSearchStatus.textContent = "";
      return;
    }
    dom.courseSearchStatus.classList.remove("hidden");
    dom.courseSearchStatus.textContent = text;
  }

  function renderSelectedCourseCard(options) {
    const opts = options || {};
    const dom = opts.dom;
    const selected = opts.selectedCourseMetadata;
    const normalizeCourseSource = opts.normalizeCourseSource;
    const escapeHtml = opts.escapeHtml;
    if (!dom || !dom.selectedCourseCard) return;
    if (!selected) {
      dom.selectedCourseCard.classList.add("hidden");
      dom.selectedCourseCard.innerHTML = "";
      return;
    }
    const latLng = Number.isFinite(selected.lat) && Number.isFinite(selected.lng)
      ? `${selected.lat.toFixed(4)}, ${selected.lng.toFixed(4)}`
      : "Unavailable";
    const source = normalizeCourseSource(selected.source);
    dom.selectedCourseCard.innerHTML = `
      <h4>Selected Course: ${escapeHtml(selected.displayName || "-")}</h4>
      <p>Location: ${escapeHtml(selected.locationText || "Location unavailable")}</p>
      <p>Coordinates: ${escapeHtml(latLng)}</p>
      <p>Source: ${escapeHtml(source || "Unavailable")}</p>
      <p class="muted tiny">Ready for round setup</p>
      <button class="btn btn-secondary" type="button" data-action="clear">Clear Selection</button>
    `;
    dom.selectedCourseCard.classList.remove("hidden");
  }

  function renderPlayerList(options) {
    const opts = options || {};
    const dom = opts.dom;
    const setupPlayers = Array.isArray(opts.setupPlayers) ? opts.setupPlayers : [];
    const maxPlayers = Number(opts.maxPlayers) || 0;
    const escapeHtml = opts.escapeHtml;
    const onRemoveSetupPlayer = opts.onRemoveSetupPlayer;
    if (!dom || !dom.playerCount || !dom.setupPlayerList) return;

    dom.playerCount.textContent = `(${setupPlayers.length} / ${maxPlayers})`;
    if (!setupPlayers.length) {
      dom.setupPlayerList.innerHTML = '<p class="muted tiny">No players added yet.</p>';
      return;
    }
    dom.setupPlayerList.innerHTML = setupPlayers.map((p, i) => {
      return `
        <div class="setup-player-row">
          <div class="setup-player-main">
            <span class="setup-player-index">${i + 1}.</span>
            <input class="setup-player-name" type="text" data-local-id="${p.id}" value="${escapeHtml(p.name)}">
          </div>
          <button class="btn btn-danger setup-remove-btn" type="button" data-local-id="${p.id}">Remove</button>
        </div>
      `;
    }).join("");

    dom.setupPlayerList.querySelectorAll(".setup-player-name").forEach((input) => {
      input.addEventListener("input", (e) => {
        const id = e.target.getAttribute("data-local-id");
        const player = setupPlayers.find((row) => row.id === id);
        if (player) player.name = e.target.value;
      });
      input.addEventListener("blur", (e) => {
        const id = e.target.getAttribute("data-local-id");
        const player = setupPlayers.find((row) => row.id === id);
        if (!player) return;
        player.name = String(player.name || "").trim();
        e.target.value = player.name;
      });
    });

    dom.setupPlayerList.querySelectorAll(".setup-remove-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        if (typeof onRemoveSetupPlayer === "function") {
          onRemoveSetupPlayer(e.target.getAttribute("data-local-id"));
        }
      });
    });
  }

  function renderRoundHistory(options) {
    const opts = options || {};
    const historyList = opts.historyList;
    const statsWrap = opts.statsWrap;
    const replayWrap = opts.replayWrap;
    const state = opts.state;
    const capRoundHistory = opts.capRoundHistory;
    const computePlayerProgressionStats = opts.computePlayerProgressionStats;
    const getWinnerNamesFromHistory = opts.getWinnerNamesFromHistory;
    const formatHistoryDate = opts.formatHistoryDate;
    const escapeHtml = opts.escapeHtml;
    const formatDecimal = opts.formatDecimal;
    const buildCompletionFromHistoryEntry = opts.buildCompletionFromHistoryEntry;
    const buildRoundSummaryPanelMarkup = opts.buildRoundSummaryPanelMarkup;
    if (!historyList || !statsWrap || !replayWrap || !state) return;

    const capHistory = typeof capRoundHistory === "function"
      ? capRoundHistory
      : (items) => (Array.isArray(items) ? items : []);
    const computeStats = typeof computePlayerProgressionStats === "function"
      ? computePlayerProgressionStats
      : () => [];
    const winnerResolver = typeof getWinnerNamesFromHistory === "function"
      ? getWinnerNamesFromHistory
      : () => [];
    const historyDateFormatter = typeof formatHistoryDate === "function"
      ? formatHistoryDate
      : () => "Unavailable";
    const htmlEscaper = typeof escapeHtml === "function"
      ? escapeHtml
      : (value) => String(value == null ? "" : value);
    const decimalFormatter = typeof formatDecimal === "function"
      ? formatDecimal
      : (value) => String(value == null ? "-" : value);
    const completionBuilder = typeof buildCompletionFromHistoryEntry === "function"
      ? buildCompletionFromHistoryEntry
      : () => null;
    const summaryPanelBuilder = typeof buildRoundSummaryPanelMarkup === "function"
      ? buildRoundSummaryPanelMarkup
      : () => "";

    const history = capHistory(Array.isArray(state.roundHistory) ? state.roundHistory : []);
    state.roundHistory = history;

    if (!history.length) {
      statsWrap.innerHTML = '<p class="muted tiny round-history-empty-state">No player trends yet. Finish a round to start tracking wins and averages.</p>';
      historyList.innerHTML = '<p class="muted tiny round-history-empty-state">No saved rounds yet. Create a round above, then complete it to populate history.</p>';
      replayWrap.classList.add("hidden");
      replayWrap.innerHTML = "";
      return;
    }

    const stats = computeStats(history);
    if (!stats.length) {
      statsWrap.innerHTML = '<p class="muted tiny round-history-empty-state">No player trends available for these saved rounds yet.</p>';
    } else {
      statsWrap.innerHTML = stats.map((item) => {
        const avgScore = item.scoredRounds > 0 ? (item.scoreSum / item.scoredRounds) : null;
        return `
          <div class="progression-chip">
            <p class="progression-name">${htmlEscaper(item.name)}</p>
            <p class="progression-metric">Rounds ${item.roundsPlayed}</p>
            <p class="progression-metric">Wins ${item.wins}</p>
            <p class="progression-metric">Avg ${avgScore == null ? "-" : decimalFormatter(avgScore, 1)}</p>
            <p class="progression-metric">Best ${item.bestRound == null ? "-" : item.bestRound}</p>
          </div>
        `;
      }).join("");
    }

    historyList.innerHTML = history.map((entry) => {
      const roundId = String(entry.roundId);
      const isExpanded = String(state.roundHistoryExpandedRoundId) === roundId;
      const isReplay = String(state.roundHistoryReplayRoundId) === roundId;
      const winnerNames = winnerResolver(entry);
      const winnerText = winnerNames.length ? winnerNames.map((name) => htmlEscaper(name)).join(", ") : "-";
      const summaryMeta = [
        entry.roundName ? htmlEscaper(entry.roundName) : null,
        entry.courseName ? htmlEscaper(entry.courseName) : null,
        entry.tee ? `Tee ${htmlEscaper(entry.tee)}` : null,
        entry.holes ? `${entry.holes} holes` : null
      ].filter(Boolean).join(" • ");
      return `
        <article class="round-history-row ${isExpanded ? "expanded" : ""}">
          <button
            type="button"
            class="round-history-toggle"
            data-action="toggle-history-row"
            data-round-id="${htmlEscaper(roundId)}"
            aria-expanded="${isExpanded ? "true" : "false"}">
            <span class="round-history-date">${htmlEscaper(historyDateFormatter(entry.date))}</span>
            <span class="round-history-winner">${htmlEscaper(entry.winnerLabel || "Winner")}: ${winnerText}</span>
          </button>
          <div class="round-history-detail ${isExpanded ? "" : "hidden"}">
            <p class="round-history-meta">${summaryMeta || "Round summary unavailable"}</p>
            <div class="actions round-history-actions">
              <button
                type="button"
                class="btn btn-secondary"
                data-action="replay-history-round"
                data-round-id="${htmlEscaper(roundId)}">${isReplay ? "Hide Replay" : "View Replay"}</button>
              <button
                type="button"
                class="btn btn-secondary round-history-export-btn"
                data-action="export-history-json"
                data-round-id="${htmlEscaper(roundId)}">Export JSON</button>
              <button
                type="button"
                class="btn btn-secondary round-history-export-btn"
                data-action="export-history-csv"
                data-round-id="${htmlEscaper(roundId)}">Export CSV</button>
            </div>
          </div>
        </article>
      `;
    }).join("");

    const replayEntry = history.find((entry) => String(entry.roundId) === String(state.roundHistoryReplayRoundId));
    if (!replayEntry) {
      replayWrap.classList.remove("hidden");
      replayWrap.innerHTML = '<p class="muted tiny round-history-replay-empty">No replay selected. Choose "View Replay" on a saved round.</p>';
      return;
    }
    const replayCompletion = completionBuilder(replayEntry);
    if (!replayCompletion) {
      replayWrap.classList.remove("hidden");
      replayWrap.innerHTML = '<p class="muted tiny round-history-replay-empty">Replay unavailable for this round.</p>';
      return;
    }
    replayWrap.classList.remove("hidden");
    replayWrap.innerHTML = `
      <div class="round-history-replay-header">
        <h4>Historical Replay Snapshot</h4>
        <span class="round-history-context-pill replay">Replayed Round</span>
        <span class="round-history-context-pill live">Live Round Above</span>
      </div>
      <p class="muted tiny">${htmlEscaper(historyDateFormatter(replayEntry.date))} • ${htmlEscaper(replayEntry.roundName || "Round")}</p>
      <div class="round-summary-panel complete round-summary-replay-panel">
        ${summaryPanelBuilder(replayCompletion, {
          expandedPlayerId: state.roundSummaryReplayExpandedPlayerId,
          interactive: true
        })}
      </div>
    `;
  }

  function renderParRow(options) {
    const opts = options || {};
    const state = opts.state;
    const dom = opts.dom;
    const getPar = opts.getPar;
    if (!state || !state.round || !dom || !dom.parRow) return;
    const holes = state.round.holes;
    let html = "";
    for (let hole = 1; hole <= holes; hole += 1) {
      const par = getPar(hole);
      const saving = state.pendingParHoles.has(hole);
      html += `
        <label class="par-input-wrap ${saving ? "saving" : ""}">
          <span>H${hole}</span>
          <input class="par-input" type="number" min="3" max="6" step="1" data-hole="${hole}" value="${par == null ? "" : par}">
        </label>
      `;
    }
    dom.parRow.innerHTML = html;
  }

  function renderLeaderboard(options) {
    const opts = options || {};
    const state = opts.state;
    const dom = opts.dom;
    const standings = opts.standings;
    const buildStandings = opts.buildStandings;
    const display = opts.display;
    const escapeHtml = opts.escapeHtml;
    const formatRelativeToPar = opts.formatRelativeToPar;
    const onReRender = opts.onReRender;
    if (!state || !state.round || !dom || !dom.leaderboardBody) return;

    const showBack = state.round.holes === 18;
    const rows = Array.isArray(standings) ? standings : buildStandings();
    const previousOrder = state.leaderboardOrderById || {};
    const nextOrder = {};
    rows.forEach((row, index) => {
      nextOrder[String(row.id)] = index;
    });

    const shiftMap = {};
    rows.forEach((row, index) => {
      const prevIndex = previousOrder[String(row.id)];
      if (Number.isInteger(prevIndex) && prevIndex !== index) {
        shiftMap[String(row.id)] = prevIndex > index ? "up" : "down";
      }
    });

    clearTimeout(state.leaderboardShiftTimer);
    state.leaderboardShiftMap = shiftMap;
    state.leaderboardOrderById = nextOrder;
    if (Object.keys(shiftMap).length > 0) {
      state.leaderboardShiftTimer = setTimeout(() => {
        state.leaderboardShiftMap = {};
        if (state.round && typeof onReRender === "function") onReRender();
      }, 340);
    }

    const leaderIds = rows.filter((row) => row.isLeader).map((row) => String(row.id)).sort();
    const signature = leaderIds.join("|");
    if (state.lastLeaderSignature !== null && state.lastLeaderSignature !== signature) {
      state.leaderPulseOn = true;
      clearTimeout(state.leaderPulseTimer);
      state.leaderPulseTimer = setTimeout(() => {
        state.leaderPulseOn = false;
        if (typeof onReRender === "function") onReRender();
      }, 850);
    }
    state.lastLeaderSignature = signature;

    dom.leaderboardBody.innerHTML = rows.map((row) => `
      <tr class="${row.isLeader ? "leader-row" : ""} ${row.isLeader && state.leaderPulseOn ? "leader-pulse" : ""} ${state.leaderboardShiftMap[String(row.id)] === "up" ? "leader-row-move-up" : ""} ${state.leaderboardShiftMap[String(row.id)] === "down" ? "leader-row-move-down" : ""}">
        <td><strong>${row.rank}</strong></td>
        <td>${escapeHtml(row.name)}</td>
        <td>${display(row.front)}</td>
        ${showBack ? `<td>${display(row.back)}</td>` : ""}
        <td><strong>${display(row.total)}</strong>${row.total == null ? "" : ` <span class="leader-relative">${formatRelativeToPar(row.relative)}</span>`}</td>
      </tr>
    `).join("");
  }

  function renderScoreTable(options) {
    const opts = options || {};
    const state = opts.state;
    const dom = opts.dom;
    const standings = opts.standings;
    const buildStandings = opts.buildStandings;
    const renderScoreUxMeta = opts.renderScoreUxMeta;
    const getPar = opts.getPar;
    const display = opts.display;
    const getTotals = opts.getTotals;
    const isEditablePlayerRow = opts.isEditablePlayerRow;
    const scoreKey = opts.scoreKey;
    const getScore = opts.getScore;
    const getScoreDelta = opts.getScoreDelta;
    const formatRelativeToPar = opts.formatRelativeToPar;
    const getGolfTerm = opts.getGolfTerm;
    const getGolfTermClass = opts.getGolfTermClass;
    const escapeHtml = opts.escapeHtml;
    if (!state || !state.round || !dom || !dom.scoreTable) return;

    if (typeof renderScoreUxMeta === "function") renderScoreUxMeta();

    const holes = state.round.holes;
    const showBack = holes === 18;
    const rows = Array.isArray(standings) ? standings : buildStandings();
    const leaders = new Set(rows.filter((row) => row.isLeader).map((row) => row.id));

    let head = '<thead><tr><th class="sticky-player">Player</th>';
    for (let hole = 1; hole <= holes; hole += 1) {
      const selectedClass = state.selectedHole === hole ? "score-hole-selected" : "";
      const selectedPulseClass = state.selectedHolePulse === hole ? "score-hole-change-pulse" : "";
      head += `<th data-hole="${hole}" class="${hole <= 9 ? "front-head" : "back-head"} ${selectedClass} ${selectedPulseClass}">H${hole}</th>`;
    }
    head += '<th class="tot-head">Front</th>';
    if (showBack) head += '<th class="tot-head">Back</th>';
    head += '<th class="tot-head">Total</th></tr></thead>';

    let body = "<tbody>";
    body += '<tr class="par-display-row">';
    body += '<td class="sticky-player"><span class="player-name">Par</span><span class="player-note">By hole</span></td>';
    for (let hole = 1; hole <= holes; hole += 1) {
      const selectedClass = state.selectedHole === hole ? "score-hole-selected" : "";
      const selectedPulseClass = state.selectedHolePulse === hole ? "score-hole-change-pulse" : "";
      body += `<td class="${hole > 9 ? "back-cell" : ""} ${selectedClass} ${selectedPulseClass}"><span class="par-chip">${display(getPar(hole))}</span></td>`;
    }
    body += '<td class="tot-cell">-</td>';
    if (showBack) body += '<td class="tot-cell">-</td>';
    body += '<td class="tot-cell">-</td>';
    body += "</tr>";

    state.players.forEach((player) => {
      const totals = getTotals(player.id);
      const editableRow = isEditablePlayerRow(player.id);
      const rowClasses = [
        leaders.has(player.id) ? "score-leader-row" : "",
        editableRow ? "your-player-row" : ""
      ].filter(Boolean).join(" ");
      body += `<tr class="${rowClasses}" data-player-id="${player.id}">`;
      body += `<td class="sticky-player"><span class="player-name">${escapeHtml(player.name)}</span><span class="player-note">${editableRow ? "You can edit this row" : "Read-only"}</span></td>`;
      for (let hole = 1; hole <= holes; hole += 1) {
        const key = scoreKey(player.id, hole);
        const val = getScore(player.id, hole);
        const text = val == null ? "-" : String(val);
        const par = getPar(hole);
        const delta = getScoreDelta(val, hole);
        const relative = formatRelativeToPar(delta);
        const term = getGolfTerm(val, par);
        const termClass = getGolfTermClass(term);
        const active = state.activeCell && state.activeCell.playerId === player.id && state.activeCell.hole === hole;
        const saving = state.pendingScoreKeys.has(key);
        const flash = state.recentScoreFlashKey === key;
        const tapPulse = state.scoreTapKey === key;
        const activeChange = state.activeCellPulseKey === key;
        const subLabel = val == null ? "" : (term || relative);
        const selectedClass = state.selectedHole === hole ? "score-hole-selected" : "";
        const selectedPulseClass = state.selectedHolePulse === hole ? "score-hole-change-pulse" : "";
        const title = val == null
          ? `${player.name} hole ${hole}`
          : `${player.name} hole ${hole}: ${text} (${relative})${term ? ` ${term}` : ""}`;
        body += `
          <td class="${hole > 9 ? "back-cell" : ""} ${selectedClass} ${selectedPulseClass}">
            <button
              class="score-btn ${val == null ? "empty" : ""} ${active ? "active" : ""} ${editableRow ? "" : "readonly"} ${saving ? "saving" : ""} ${termClass} ${flash ? "score-updated-flash" : ""} ${tapPulse ? "score-tap" : ""} ${activeChange ? "score-cell-change" : ""}"
              type="button"
              data-player-id="${player.id}"
              data-hole="${hole}"
              ${(editableRow && !saving) ? "" : "disabled"}
              aria-label="${escapeHtml(player.name)} hole ${hole} score ${text} ${term ? term : ""}"
              title="${escapeHtml(title)}">
              <span class="score-main">${saving ? "..." : text}</span>
              <span class="score-sub ${subLabel ? "" : "hidden"}">${escapeHtml(subLabel)}</span>
            </button>
          </td>
        `;
      }
      body += `<td class="tot-cell">${display(totals.front)}</td>`;
      if (showBack) body += `<td class="tot-cell">${display(totals.back)}</td>`;
      body += `<td class="tot-cell">${display(totals.total)}</td>`;
      body += "</tr>";
    });

    body += "</tbody>";
    dom.scoreTable.innerHTML = head + body;
  }

  function renderPayouts(options) {
    const opts = options || {};
    const state = opts.state;
    const dom = opts.dom;
    const parseMoney = opts.parseMoney;
    const parsePercent = opts.parsePercent;
    const money = opts.money;
    const buildStandings = opts.buildStandings;
    const calculateProjectedPayouts = opts.calculateProjectedPayouts;
    const escapeHtml = opts.escapeHtml;
    if (!state || !state.round || !dom) return;

    const pot = parseMoney(state.round.pot_amount);
    const p1 = parsePercent(state.round.payout_first);
    const p2 = parsePercent(state.round.payout_second);
    const p3 = parsePercent(state.round.payout_third);
    const payoutByPos = {
      1: pot * (p1 / 100),
      2: pot * (p2 / 100),
      3: pot * (p3 / 100)
    };

    const totalPct = p1 + p2 + p3;
    if (Math.abs(totalPct - 100) > 0.0001) {
      dom.payoutWarning.classList.remove("hidden");
      dom.payoutWarning.textContent = `Payout percentages total ${totalPct.toFixed(2)}% (not 100%).`;
    } else {
      dom.payoutWarning.classList.add("hidden");
      dom.payoutWarning.textContent = "";
    }

    dom.payoutPositionBody.innerHTML = `
      <tr><td>1st</td><td>${p1.toFixed(2)}%</td><td>${money(payoutByPos[1])}</td></tr>
      <tr><td>2nd</td><td>${p2.toFixed(2)}%</td><td>${money(payoutByPos[2])}</td></tr>
      <tr><td>3rd</td><td>${p3.toFixed(2)}%</td><td>${money(payoutByPos[3])}</td></tr>
      <tr><td><strong>Total Pot</strong></td><td>-</td><td><strong>${money(pot)}</strong></td></tr>
    `;

    const standings = buildStandings();
    const payoutMap = calculateProjectedPayouts(standings, payoutByPos);
    dom.payoutPlayerBody.innerHTML = standings.map((row) => {
      return `<tr><td>${escapeHtml(row.name)}</td><td><strong>${money(payoutMap[row.id] || 0)}</strong></td></tr>`;
    }).join("");
  }

  window.PocketCaddyRender = {
    renderRoundHistory,
    renderLeaderboard,
    renderScoreTable,
    renderPlayerList,
    renderPayouts,
    renderParRow,
    renderCourseSuggestions,
    renderSelectedCourseCard,
    setCourseSearchStatus,
    updateUIStatus,
    buildRoundExportData,
    downloadRoundAsJSON,
    downloadRoundAsCSV,
    showError,
    showFeedback
  };
})();
