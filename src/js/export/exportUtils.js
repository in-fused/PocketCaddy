function toSafeString(value, fallback) {
  if (value == null) return fallback;
  try {
    const text = String(value).trim();
    return text || fallback;
  } catch (_err) {
    return fallback;
  }
}

function toSafeInteger(value) {
  const numeric = Number(value);
  return Number.isInteger(numeric) ? numeric : null;
}

function toSafePlayers(roundData) {
  if (!roundData || typeof roundData !== "object") return [];

  const explicitPlayers = Array.isArray(roundData.players) ? roundData.players : [];
  const scoreRows = Array.isArray(roundData.scores) ? roundData.scores : [];
  const standingsRows = Array.isArray(roundData.standings) ? roundData.standings : [];

  const normalizedExplicit = explicitPlayers.map((player, index) => ({
    id: toSafeString(player && player.id, `player-${index + 1}`),
    name: toSafeString(player && player.name, `Player ${index + 1}`)
  }));

  if (normalizedExplicit.length) return normalizedExplicit;

  if (scoreRows.length) {
    return scoreRows.map((row, index) => ({
      id: toSafeString(row && row.playerId, `player-${index + 1}`),
      name: toSafeString(row && row.playerName, `Player ${index + 1}`)
    }));
  }

  if (standingsRows.length) {
    return standingsRows.map((row, index) => ({
      id: toSafeString(row && row.id, `player-${index + 1}`),
      name: toSafeString(row && row.name, `Player ${index + 1}`)
    }));
  }

  return [];
}

function resolvePlayerScoreRows(roundData, players) {
  const scores = Array.isArray(roundData && roundData.scores) ? roundData.scores : [];
  const standings = Array.isArray(roundData && roundData.standings) ? roundData.standings : [];

  return players.map((player, index) => {
    const byScoreRow = scores.find((row) => toSafeString(row && row.playerId, "") === player.id) || null;
    const byStandingRow = standings.find((row) => toSafeString(row && row.id, "") === player.id) || null;
    const fallbackScoreRow = scores[index] || null;
    const fallbackStandingRow = standings[index] || null;
    const source = byScoreRow || byStandingRow || fallbackScoreRow || fallbackStandingRow || null;

    const rawHoles = Array.isArray(source && source.holeScores) ? source.holeScores : [];
    const holeScores = rawHoles.map((value) => toSafeInteger(value));

    const explicitTotal = toSafeInteger(source && source.total);
    const calculatedTotal = holeScores.reduce((sum, value) => (Number.isInteger(value) ? sum + value : sum), 0);
    const hasAnyHoleScore = holeScores.some((value) => Number.isInteger(value));
    const total = Number.isInteger(explicitTotal) ? explicitTotal : hasAnyHoleScore ? calculatedTotal : null;

    return {
      playerId: player.id,
      playerName: player.name,
      holeScores: holeScores,
      total: total
    };
  });
}

function normalizeRoundData(roundData) {
  const safeRoundData = roundData && typeof roundData === "object" ? roundData : {};
  const players = toSafePlayers(safeRoundData);
  const scoreRows = resolvePlayerScoreRows(safeRoundData, players);
  const maxHoleCount = scoreRows.reduce((max, row) => Math.max(max, row.holeScores.length), 0);
  const holes = Number.isInteger(Number(safeRoundData.holes))
    ? Number(safeRoundData.holes)
    : maxHoleCount || 0;

  return {
    roundId: toSafeString(safeRoundData.roundId, ""),
    roundName: toSafeString(safeRoundData.roundName, "Round"),
    courseName: toSafeString(safeRoundData.courseName, ""),
    tee: toSafeString(safeRoundData.tee, ""),
    holes: holes,
    players: players,
    scores: scoreRows
  };
}

function escapeCsvCell(value) {
  const text = value == null ? "" : String(value);
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, "\"\"")}"`;
  return text;
}

export function generateRoundJSON(roundData) {
  try {
    const normalized = normalizeRoundData(roundData);
    return JSON.stringify(normalized, null, 2);
  } catch (_err) {
    return JSON.stringify({
      roundId: "",
      roundName: "Round",
      courseName: "",
      tee: "",
      holes: 0,
      players: [],
      scores: []
    }, null, 2);
  }
}

export function generateRoundCSV(roundData) {
  try {
    const normalized = normalizeRoundData(roundData);
    const holes = Number.isInteger(normalized.holes) && normalized.holes > 0
      ? normalized.holes
      : normalized.scores.reduce((max, row) => Math.max(max, row.holeScores.length), 0);

    const header = ["Player Name"];
    for (let hole = 1; hole <= holes; hole += 1) {
      header.push(`Hole ${hole}`);
    }
    header.push("Total");

    const rows = [header];
    normalized.scores.forEach((row, index) => {
      const line = [toSafeString(row && row.playerName, `Player ${index + 1}`)];
      for (let hole = 0; hole < holes; hole += 1) {
        const value = row && Array.isArray(row.holeScores) ? row.holeScores[hole] : null;
        line.push(Number.isInteger(value) ? value : "");
      }
      line.push(Number.isInteger(row && row.total) ? row.total : "");
      rows.push(line);
    });

    return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
  } catch (_err) {
    return "Player Name,Total\n";
  }
}

export function downloadFile(filename, content, type) {
  try {
    if (typeof document === "undefined" || !document.createElement) return false;
    const safeFilename = toSafeString(filename, "pocketcaddy-export.txt");
    const safeType = toSafeString(type, "text/plain;charset=utf-8");
    const safeContent = content == null ? "" : String(content);

    const blob = new Blob([safeContent], { type: safeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = safeFilename;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch (_err) {
        // no-op
      }
    }, 0);
    return true;
  } catch (_err) {
    return false;
  }
}
