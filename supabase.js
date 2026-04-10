/* SQL SCHEMA (run in Supabase SQL editor)

create extension if not exists pgcrypto;

create table if not exists rounds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  course text not null,
  tee text,
  holes int not null check (holes in (9,18)),
  pot_amount numeric not null default 0,
  payout_first numeric not null default 60,
  payout_second numeric not null default 30,
  payout_third numeric not null default 10,
  created_at timestamptz not null default now()
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  name text not null
);

create table if not exists scores (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  hole int not null check (hole between 1 and 18),
  value int not null check (value between 1 and 15)
);

create table if not exists round_holes (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  hole int not null check (hole between 1 and 18),
  par int not null check (par between 3 and 6),
  distance_yards int,
  difficulty text check (difficulty in ('easy','medium','hard'))
);

create unique index if not exists scores_unique_round_player_hole
  on scores(round_id, player_id, hole);
create unique index if not exists round_holes_unique_round_hole
  on round_holes(round_id, hole);

-- RLS notes for MVP (public access)
alter table rounds enable row level security;
alter table players enable row level security;
alter table scores enable row level security;
alter table round_holes enable row level security;

drop policy if exists rounds_public_all on rounds;
create policy rounds_public_all on rounds for all using (true) with check (true);

drop policy if exists players_public_all on players;
create policy players_public_all on players for all using (true) with check (true);

drop policy if exists scores_public_all on scores;
create policy scores_public_all on scores for all using (true) with check (true);

drop policy if exists round_holes_public_all on round_holes;
create policy round_holes_public_all on round_holes for all using (true) with check (true);
*/

/* global supabase */

const SUPABASE_URL = "https://kvbdkduveaqapvrtwjha.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_hMwWJGMS9nrLf52SMb3B8w_Oh4CGNgs";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const courseSearchCache = new Map();
const courseEnrichmentCache = new Map();

function isRoundHolesTableMissing(error) {
  if (!error) return false;
  const message = `${error.message || ""} ${error.details || ""}`.toLowerCase();
  return error.code === "42P01" || message.includes("round_holes");
}

function isMissingColumnError(error) {
  if (!error) return false;
  const message = `${error.message || ""} ${error.details || ""}`.toLowerCase();
  return error.code === "42703" || message.includes("column") && message.includes("does not exist");
}

function isHoleDetailColumnMissing(error) {
  if (!isMissingColumnError(error)) return false;
  const message = `${error.message || ""} ${error.details || ""}`.toLowerCase();
  return message.includes("distance_yards") || message.includes("difficulty");
}

function normalizeCourseMetadata(meta) {
  const m = meta || {};
  return {
    placeId: m.placeId ? String(m.placeId) : null,
    locationText: m.locationText ? String(m.locationText) : null,
    lat: Number.isFinite(Number(m.lat)) ? Number(m.lat) : null,
    lng: Number.isFinite(Number(m.lng)) ? Number(m.lng) : null
  };
}

async function createRoundWithPlayers(payload) {
  const { roundName, courseName, tee, holes, players, courseMetadata } = payload;
  const meta = normalizeCourseMetadata(courseMetadata);
  const baseInsert = {
    name: roundName,
    course: courseName,
    tee: tee || null,
    holes: holes,
    pot_amount: 0,
    payout_first: 60,
    payout_second: 30,
    payout_third: 10
  };
  const insertWithMetadata = {
    ...baseInsert,
    course_place_id: meta.placeId,
    course_location_text: meta.locationText,
    course_lat: meta.lat,
    course_lng: meta.lng
  };

  let round = null;
  let roundErr = null;
  ({ data: round, error: roundErr } = await supabaseClient
    .from("rounds")
    .insert(insertWithMetadata)
    .select()
    .single());

  // Backward compatibility: existing DBs may not have metadata columns yet.
  if (roundErr && isMissingColumnError(roundErr)) {
    ({ data: round, error: roundErr } = await supabaseClient
      .from("rounds")
      .insert(baseInsert)
      .select()
      .single());
  }

  if (roundErr) throw roundErr;

  const playerRows = players.map((name) => ({ round_id: round.id, name: name }));
  const { data: insertedPlayers, error: playersErr } = await supabaseClient
    .from("players")
    .insert(playerRows)
    .select();
  if (playersErr) throw playersErr;

  await seedRoundHoles(round.id, holes);

  return { round: round, players: insertedPlayers };
}

async function seedRoundHoles(roundId, holes) {
  const rows = Array.from({ length: holes }, (_, i) => ({
    round_id: roundId,
    hole: i + 1,
    par: 4
  }));
  const { error } = await supabaseClient
    .from("round_holes")
    .upsert(rows, { onConflict: "round_id,hole" });
  if (error && !isRoundHolesTableMissing(error)) throw error;
}

async function getRoundById(roundId) {
  const { data, error } = await supabaseClient
    .from("rounds")
    .select("*")
    .eq("id", roundId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function findRoundByCodeOrLink(input) {
  const value = String(input || "").trim();
  if (!value) return null;

  const parsed = extractRoundId(value);
  if (!parsed) return null;
  return getRoundById(parsed);
}

function extractRoundId(value) {
  const roundRegex = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
  const m = value.match(roundRegex);
  if (m) return m[1];

  try {
    const maybeUrl = new URL(value);
    const q = maybeUrl.searchParams.get("round");
    if (q && roundRegex.test(q)) return q.match(roundRegex)[1];
  } catch (_err) {
    // value may be plain code
  }
  return null;
}

async function getPlayers(roundId) {
  const { data, error } = await supabaseClient
    .from("players")
    .select("*")
    .eq("round_id", roundId)
    .order("name", { ascending: true });
  if (error) throw error;
  return data || [];
}

async function getScores(roundId) {
  const { data, error } = await supabaseClient
    .from("scores")
    .select("*")
    .eq("round_id", roundId);
  if (error) throw error;
  return data || [];
}

async function getRoundHoles(roundId) {
  const { data, error } = await supabaseClient
    .from("round_holes")
    .select("*")
    .eq("round_id", roundId)
    .order("hole", { ascending: true });
  if (error) {
    if (isRoundHolesTableMissing(error)) return [];
    throw error;
  }
  return data || [];
}

async function upsertRoundHolePar(payload) {
  const { roundId, hole, par } = payload;
  const { error } = await supabaseClient
    .from("round_holes")
    .upsert({
      round_id: roundId,
      hole: hole,
      par: par
    }, { onConflict: "round_id,hole" });
  if (error) {
    if (isRoundHolesTableMissing(error)) return null;
    throw error;
  }
  return true;
}

async function upsertRoundHoleDetails(payload) {
  const { roundId, hole, par, distanceYards, difficulty } = payload;
  const normalizedDistance = Number.isFinite(Number(distanceYards)) ? Math.round(Number(distanceYards)) : null;
  const normalizedDifficulty = difficulty === "easy" || difficulty === "medium" || difficulty === "hard"
    ? difficulty
    : null;

  let updated = null;
  let updateErr = null;
  ({ data: updated, error: updateErr } = await supabaseClient
    .from("round_holes")
    .update({
      distance_yards: normalizedDistance,
      difficulty: normalizedDifficulty
    })
    .eq("round_id", roundId)
    .eq("hole", hole)
    .select("id")
    .limit(1));

  if (updateErr) {
    if (isRoundHolesTableMissing(updateErr)) return null;
    if (isHoleDetailColumnMissing(updateErr)) return null;
    throw updateErr;
  }
  if (Array.isArray(updated) && updated.length > 0) return true;

  const { error: insertErr } = await supabaseClient
    .from("round_holes")
    .upsert({
      round_id: roundId,
      hole: hole,
      par: Number.isFinite(Number(par)) ? Math.round(Number(par)) : 4,
      distance_yards: normalizedDistance,
      difficulty: normalizedDifficulty
    }, { onConflict: "round_id,hole" });

  if (insertErr) {
    if (isRoundHolesTableMissing(insertErr)) return null;
    if (isHoleDetailColumnMissing(insertErr)) return null;
    throw insertErr;
  }
  return true;
}

async function upsertScore(payload) {
  const { roundId, playerId, hole, value } = payload;
  const { error } = await supabaseClient
    .from("scores")
    .upsert({
      round_id: roundId,
      player_id: playerId,
      hole: hole,
      value: value
    }, { onConflict: "round_id,player_id,hole" });
  if (error) throw error;
}

async function deleteScore(payload) {
  const { roundId, playerId, hole } = payload;
  const { error } = await supabaseClient
    .from("scores")
    .delete()
    .eq("round_id", roundId)
    .eq("player_id", playerId)
    .eq("hole", hole);
  if (error) throw error;
}

async function clearScores(roundId) {
  const { error } = await supabaseClient
    .from("scores")
    .delete()
    .eq("round_id", roundId);
  if (error) throw error;
}

async function updateRoundSettings(payload) {
  const { roundId, potAmount, payoutFirst, payoutSecond, payoutThird } = payload;
  const { data, error } = await supabaseClient
    .from("rounds")
    .update({
      pot_amount: potAmount,
      payout_first: payoutFirst,
      payout_second: payoutSecond,
      payout_third: payoutThird
    })
    .eq("id", roundId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function searchCourses(query) {
  const needle = String(query || "").trim();
  if (!needle || needle.length < 2) return [];

  const cacheKey = needle.toLowerCase();
  if (courseSearchCache.has(cacheKey)) return courseSearchCache.get(cacheKey);

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", needle);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "10");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("namedetails", "1");
  url.searchParams.set("extratags", "1");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "Accept-Language": "en"
    }
  });
  if (!response.ok) throw new Error("Course search request failed");
  const raw = await response.json();
  const rows = Array.isArray(raw) ? raw : [];

  const results = rows
    .filter((item) => isLikelyGolfResult(item))
    .slice(0, 8)
    .map((item) => {
      const name = getResultDisplayName(item);
      const locationText = getResultLocationText(item);
      const lat = Number.isFinite(Number(item.lat)) ? Number(item.lat) : null;
      const lng = Number.isFinite(Number(item.lon)) ? Number(item.lon) : null;
      const osmType = item.osm_type ? String(item.osm_type) : "osm";
      const osmId = item.osm_id ? String(item.osm_id) : "";
      return {
        displayName: name || "Unnamed course",
        locationText: locationText || "Location unavailable",
        lat: lat,
        lng: lng,
        placeId: osmId ? `${osmType}:${osmId}` : null,
        source: "OpenStreetMap"
      };
    });

  courseSearchCache.set(cacheKey, results);
  return results;
}

function isLikelyGolfResult(item) {
  const display = String(item && item.display_name ? item.display_name : "").toLowerCase();
  const named = String(item && item.name ? item.name : "").toLowerCase();
  const type = String(item && item.type ? item.type : "").toLowerCase();
  const clazz = String(item && item.class ? item.class : "").toLowerCase();
  const leisure = String(item && item.extratags && item.extratags.leisure ? item.extratags.leisure : "").toLowerCase();
  const sport = String(item && item.extratags && item.extratags.sport ? item.extratags.sport : "").toLowerCase();

  if (clazz === "leisure" && (type === "golf_course" || type === "golf")) return true;
  if (leisure === "golf_course") return true;
  if (sport === "golf") return true;
  if (display.includes("golf")) return true;
  if (named.includes("golf")) return true;
  return false;
}

function getResultDisplayName(item) {
  if (item && item.namedetails && item.namedetails.name) return String(item.namedetails.name);
  if (item && item.name) return String(item.name);
  const display = String(item && item.display_name ? item.display_name : "");
  const first = display.split(",")[0];
  return first ? first.trim() : display.trim();
}

function getResultLocationText(item) {
  const display = String(item && item.display_name ? item.display_name : "");
  const parts = display.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length <= 1) return display || null;
  return parts.slice(1).join(", ");
}

function buildEnrichmentCacheKey(lat, lng) {
  const a = Number(lat);
  const b = Number(lng);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return `${a.toFixed(4)},${b.toFixed(4)}`;
}

async function getCourseEnrichment(lat, lng) {
  const cacheKey = buildEnrichmentCacheKey(lat, lng);
  if (!cacheKey) return null;
  if (courseEnrichmentCache.has(cacheKey)) return courseEnrichmentCache.get(cacheKey);

  const query = `
[out:json][timeout:15];
(
  node(around:1200,${Number(lat)},${Number(lng)})["golf"];
  way(around:1200,${Number(lat)},${Number(lng)})["golf"];
  relation(around:1200,${Number(lat)},${Number(lng)})["golf"];
);
out tags qt;
`.trim();

  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: `data=${encodeURIComponent(query)}`
  });
  if (!response.ok) throw new Error("Course enrichment request failed");
  const raw = await response.json();
  const elements = Array.isArray(raw && raw.elements) ? raw.elements : [];
  const counts = { greenCount: 0, bunkerCount: 0, fairwayCount: 0, teeCount: 0 };
  elements.forEach((element) => {
    const golf = String(element && element.tags && element.tags.golf ? element.tags.golf : "").toLowerCase();
    if (golf === "green") counts.greenCount += 1;
    if (golf === "bunker") counts.bunkerCount += 1;
    if (golf === "fairway") counts.fairwayCount += 1;
    if (golf === "tee") counts.teeCount += 1;
  });

  const enrichment = {
    hasMappedDetail: elements.length > 0,
    greenCount: counts.greenCount,
    bunkerCount: counts.bunkerCount,
    fairwayCount: counts.fairwayCount,
    teeCount: counts.teeCount
  };
  courseEnrichmentCache.set(cacheKey, enrichment);
  return enrichment;
}

function subscribeToRound(roundId, handlers) {
  const channel = supabaseClient
    .channel(`round-${roundId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "scores", filter: `round_id=eq.${roundId}` },
      () => handlers && handlers.onScoresChanged && handlers.onScoresChanged()
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "players", filter: `round_id=eq.${roundId}` },
      () => handlers && handlers.onPlayersChanged && handlers.onPlayersChanged()
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "rounds", filter: `id=eq.${roundId}` },
      () => handlers && handlers.onRoundChanged && handlers.onRoundChanged()
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "round_holes", filter: `round_id=eq.${roundId}` },
      () => handlers && handlers.onParsChanged && handlers.onParsChanged()
    )
    .subscribe();
  return channel;
}

function unsubscribeFromRound(channel) {
  if (!channel) return;
  supabaseClient.removeChannel(channel);
}

window.SupabaseAPI = {
  createRoundWithPlayers,
  getRoundById,
  findRoundByCodeOrLink,
  extractRoundId,
  searchCourses,
  getCourseEnrichment,
  getPlayers,
  getScores,
  getRoundHoles,
  upsertScore,
  upsertRoundHolePar,
  upsertRoundHoleDetails,
  deleteScore,
  clearScores,
  updateRoundSettings,
  subscribeToRound,
  unsubscribeFromRound
};
