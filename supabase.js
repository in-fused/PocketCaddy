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

create unique index if not exists scores_unique_round_player_hole
  on scores(round_id, player_id, hole);

-- RLS notes for MVP (public access)
alter table rounds enable row level security;
alter table players enable row level security;
alter table scores enable row level security;

drop policy if exists rounds_public_all on rounds;
create policy rounds_public_all on rounds for all using (true) with check (true);

drop policy if exists players_public_all on players;
create policy players_public_all on players for all using (true) with check (true);

drop policy if exists scores_public_all on scores;
create policy scores_public_all on scores for all using (true) with check (true);
*/

/* global supabase */

const SUPABASE_URL = "https://kvbdkduveaqapvrtwjha.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_hMwWJGMS9nrLf52SMb3B8w_Oh4CGNgs";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createRoundWithPlayers(payload) {
  const { roundName, courseName, tee, holes, players } = payload;
  const { data: round, error: roundErr } = await supabaseClient
    .from("rounds")
    .insert({
      name: roundName,
      course: courseName,
      tee: tee || null,
      holes: holes,
      pot_amount: 0,
      payout_first: 60,
      payout_second: 30,
      payout_third: 10
    })
    .select()
    .single();
  if (roundErr) throw roundErr;

  const playerRows = players.map((name) => ({ round_id: round.id, name: name }));
  const { data: insertedPlayers, error: playersErr } = await supabaseClient
    .from("players")
    .insert(playerRows)
    .select();
  if (playersErr) throw playersErr;

  return { round: round, players: insertedPlayers };
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
  getPlayers,
  getScores,
  upsertScore,
  deleteScore,
  clearScores,
  updateRoundSettings,
  subscribeToRound,
  unsubscribeFromRound
};
