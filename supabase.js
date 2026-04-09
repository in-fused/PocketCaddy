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
  par int not null check (par between 3 and 6)
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

// Phase-1 course search abstraction.
// This local catalog is intentionally isolated so it can be replaced by a live provider later.
const COURSE_CATALOG = [
  { displayName: "Pebble Beach Golf Links", locationText: "Pebble Beach, CA", lat: 36.5682, lng: -121.9502, placeId: "mock-pebble-beach", source: "local_mock" },
  { displayName: "Torrey Pines Golf Course", locationText: "La Jolla, CA", lat: 32.9049, lng: -117.252, placeId: "mock-torrey-pines", source: "local_mock" },
  { displayName: "Augusta National Golf Club", locationText: "Augusta, GA", lat: 33.5031, lng: -82.0208, placeId: "mock-augusta-national", source: "local_mock" },
  { displayName: "TPC Sawgrass", locationText: "Ponte Vedra Beach, FL", lat: 30.2042, lng: -81.3893, placeId: "mock-tpc-sawgrass", source: "local_mock" },
  { displayName: "Bethpage Black Course", locationText: "Farmingdale, NY", lat: 40.7384, lng: -73.4537, placeId: "mock-bethpage-black", source: "local_mock" },
  { displayName: "Pinehurst No. 2", locationText: "Pinehurst, NC", lat: 35.194, lng: -79.4694, placeId: "mock-pinehurst-2", source: "local_mock" },
  { displayName: "Whistling Straits", locationText: "Kohler, WI", lat: 43.8502, lng: -87.7249, placeId: "mock-whistling-straits", source: "local_mock" },
  { displayName: "Kiawah Island Ocean Course", locationText: "Kiawah Island, SC", lat: 32.6089, lng: -80.0847, placeId: "mock-kiawah-ocean", source: "local_mock" },
  { displayName: "Bandon Dunes Golf Resort", locationText: "Bandon, OR", lat: 43.1917, lng: -124.3894, placeId: "mock-bandon-dunes", source: "local_mock" },
  { displayName: "Muirfield Village Golf Club", locationText: "Dublin, OH", lat: 40.1596, lng: -83.1399, placeId: "mock-muirfield-village", source: "local_mock" },
  { displayName: "Winged Foot Golf Club", locationText: "Mamaroneck, NY", lat: 40.9483, lng: -73.7313, placeId: "mock-winged-foot", source: "local_mock" },
  { displayName: "Oakmont Country Club", locationText: "Oakmont, PA", lat: 40.5214, lng: -79.8363, placeId: "mock-oakmont", source: "local_mock" }
];

async function searchCourses(query) {
  const needle = String(query || "").trim().toLowerCase();
  if (!needle || needle.length < 2) return [];
  const results = COURSE_CATALOG
    .filter((item) => {
      const name = item.displayName.toLowerCase();
      const loc = (item.locationText || "").toLowerCase();
      return name.includes(needle) || loc.includes(needle);
    })
    .slice(0, 8)
    .map((item) => ({
      displayName: item.displayName,
      locationText: item.locationText || null,
      lat: Number.isFinite(item.lat) ? item.lat : null,
      lng: Number.isFinite(item.lng) ? item.lng : null,
      placeId: item.placeId || null,
      source: item.source || "local_mock"
    }));
  return results;
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
  getPlayers,
  getScores,
  getRoundHoles,
  upsertScore,
  upsertRoundHolePar,
  deleteScore,
  clearScores,
  updateRoundSettings,
  subscribeToRound,
  unsubscribeFromRound
};
