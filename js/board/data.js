async function loadData(options = {}) {
  const includeDues = options.includeDues || duesLoaded || false;
  const includeHall = options.includeHall || hallOfFameLoaded || false;

  const requests = [
    db.from('captains').select('*').order('name'),
    db.from('players').select('*').order('name'),
    db.from('bidding_state').select('*').eq('id',1).single(),
    db.from('matches').select('*').order('created_at'),
    db.from('goals').select('*'),
    db.from('tiebreak_results').select('*')
  ];

  if (includeDues) {
    requests.push(db.from('payments').select('*').order('created_at', { ascending: false }));
    requests.push(db.from('payment_summary').select('*'));
    requests.push(db.from('top_payers').select('*'));
    requests.push(db.from('dues_settings').select('*').eq('id',1).single());
  }

  if (includeHall) {
    requests.push(db.from('hall_of_fame').select('*').order('season', { ascending: false }));
  }

  const results = await Promise.all(requests);

  const [capRes, playRes, bidRes, matchRes, goalRes, tiebreakRes] = results;

  allCaptains = capRes.data || [];
  detectSoldTransition(playRes.data || []);
  allPlayers = playRes.data || [];
  allMatches = matchRes.data || [];
  allGoals = goalRes.data || [];
  allTiebreaks = tiebreakRes.data || [];
  currentPlayerId = bidRes.data?.player_id || null;
  bidState = bidRes.data || null;

  let idx = 6;
  if (includeDues) {
    const paymentsRes = results[idx++];
    const summaryRes = results[idx++];
    const topPayersRes = results[idx++];
    const duesSettingsRes = results[idx++];
    allPayments = paymentsRes.data || [];
    paymentSummary = summaryRes.data || [];
    topPayers = topPayersRes.data || [];
    duesSpent = Number(duesSettingsRes?.data?.spent || 0);
    duesLoaded = true;
  }

  if (includeHall) {
    const hofRes = results[idx++];
    allHallOfFame = hofRes.data || [];
    hallOfFameLoaded = true;
  }

  renderSplash();
  renderAuctionState();
  handleAuctionDrama();
  renderCurrentPlayer();
  renderSoldBanner();
  renderStory();
  renderRecentSales();
  renderStats_();
  renderCaptains();
  renderPool();
  renderBoardPhase();
  renderSpotlights();
  renderBoardStandings();
  renderBoardStats();
  renderBoardSchedule();
  renderTeams();

  if (duesLoaded) renderBoardDues();
  if (hallOfFameLoaded) renderHallOfFame();
}

async function loadDuesData() {
  if (duesLoaded) { renderBoardDues(); return; }
  const [paymentsRes, summaryRes, topPayersRes, duesSettingsRes] = await Promise.all([
    db.from('payments').select('*').order('created_at', { ascending: false }),
    db.from('payment_summary').select('*'),
    db.from('top_payers').select('*'),
    db.from('dues_settings').select('*').eq('id',1).single()
  ]);
  allPayments = paymentsRes.data || [];
  paymentSummary = summaryRes.data || [];
  topPayers = topPayersRes.data || [];
  duesSpent = Number(duesSettingsRes?.data?.spent || 0);
  duesLoaded = true;
  renderBoardDues();
}

async function loadHallOfFameData() {
  if (hallOfFameLoaded) { renderHallOfFame(); return; }
  const hofRes = await db.from('hall_of_fame').select('*').order('season', { ascending: false });
  allHallOfFame = hofRes.data || [];
  hallOfFameLoaded = true;
  renderHallOfFame();
}
// ── FALLBACK reload path for bidding/assignment ──
// Only called when a realtime payload comes back malformed (see the
// patch-from-payload functions below, which are the primary path now).
// Skips matches/goals fetch entirely and skips every schedule/standings/bracket
// render — those don't change during bidding, so there's no reason to rebuild
// them on every "Go Live" click or every sale.
async function loadBiddingData() {
  const [capRes, playRes, bidRes] = await Promise.all([
    db.from('captains').select('*').order('name'),
    db.from('players').select('*').order('name'),
    db.from('bidding_state').select('*').eq('id', 1).single()
  ]);

  allCaptains = capRes.data || [];
  detectSoldTransition(playRes.data || []);
  allPlayers = playRes.data || [];
  currentPlayerId = bidRes.data?.player_id || null;
  bidState = bidRes.data || null;

  renderAuctionState();
  handleAuctionDrama();
  renderCurrentPlayer();
  renderSoldBanner();
  renderStory();
  renderStoryline();
  renderBoardPhase();
  renderSpotlights();
  renderRecentSales();
  renderStats_();
  renderCaptains();
  renderPool();
  renderTeams();
}

// ── PATCH-FROM-PAYLOAD path (scales to many simultaneous viewers) ──
// Postgres includes the full new row in every INSERT/UPDATE event it
// broadcasts over Realtime. Instead of every connected client re-querying
// Supabase when that broadcast arrives, each client patches its own
// in-memory arrays directly from the payload and re-renders from memory.
// One admin write -> one broadcast -> zero extra database queries, no
// matter whether 5 people or 500 people are watching the board.
//
// If a payload ever looks malformed (missing new.id etc.) that single event
// falls back to loadBiddingData() below instead of leaving the board wrong.

function upsertById(arr, row) {
  if (!row || !row.id) return arr;
  const idx = arr.findIndex(x => x.id === row.id);
  if (idx === -1) { arr.push(row); } else { arr[idx] = row; }
  return arr;
}

function removeById(arr, row) {
  if (!row || !row.id) return arr;
  return arr.filter(x => x.id !== row.id);
}

let _patchRenderTimer = null;
function schedulePatchRender() {
  clearTimeout(_patchRenderTimer);
  _patchRenderTimer = setTimeout(renderBiddingUpdate, 150);
}

function handlePlayersEvent(payload) {
  if (payload.eventType === 'DELETE') {
    if (!payload.old || !payload.old.id) { scheduleLightReload(); return; }
    allPlayers = removeById(allPlayers, payload.old);
  } else {
    if (!payload.new || !payload.new.id) { scheduleLightReload(); return; }
    allPlayers = upsertById(allPlayers, payload.new);
  }
  schedulePatchRender();
}

function handleCaptainsEvent(payload) {
  if (payload.eventType === 'DELETE') {
    if (!payload.old || !payload.old.id) { scheduleLightReload(); return; }
    allCaptains = removeById(allCaptains, payload.old);
  } else {
    if (!payload.new || !payload.new.id) { scheduleLightReload(); return; }
    allCaptains = upsertById(allCaptains, payload.new);
  }
  schedulePatchRender();
}

function handleBiddingStateEvent(payload) {
  if (!payload.new) { scheduleLightReload(); return; }
  bidState = payload.new;
  currentPlayerId = payload.new.player_id || null;
  schedulePatchRender();
}

function renderBiddingUpdate() {
  detectSoldTransition(allPlayers);
  renderAuctionState();
  handleAuctionDrama();
  renderCurrentPlayer();
  renderSoldBanner();
  renderStory();
  renderStoryline();
  renderBoardPhase();
  renderSpotlights();
  renderRecentSales();
  renderStats_();
  renderCaptains();
  renderPool();
  renderTeams();
}

// -- MATCH DAY: lightweight fallback fetch --
// Used by the manual Refresh button and as the fallback if a realtime
// payload comes back malformed. Skips bidding_state entirely (auction is
// over, that table is no longer relevant) and skips dues/hall-of-fame
// (already lazy-loaded on tab open, not needed here).
async function loadMatchData() {
  const [capRes, playRes, matchRes, goalRes, tiebreakRes] = await Promise.all([
    db.from('captains').select('*').order('name'),
    db.from('players').select('*').order('name'),
    db.from('matches').select('*'),
    db.from('goals').select('*'),
    db.from('tiebreak_results').select('*')
  ]);

  allCaptains = capRes.data || [];
  allPlayers  = playRes.data || [];
  allMatches  = matchRes.data || [];
  allGoals    = goalRes.data || [];
  allTiebreaks = tiebreakRes.data || [];

  renderBoardStandings();
  renderBoardSchedule();
  renderBoardStats();
  renderTeams();
}

// -- MATCH DAY: patch-from-payload handlers --
// Same zero-extra-query discipline as the auction-day handlers above:
// patch the in-memory array directly from the broadcast row instead of
// re-querying, so one goal or one match result doesn't cost a database
// round trip per viewer.
let _matchRenderTimer = null;
function scheduleMatchRender() {
  clearTimeout(_matchRenderTimer);
  _matchRenderTimer = setTimeout(renderMatchUpdate, 300);
}

function handleMatchesEvent(payload) {
  if (payload.eventType === 'DELETE') {
    if (!payload.old || !payload.old.id) { scheduleLightReload(); return; }
    allMatches = removeById(allMatches, payload.old);
  } else {
    if (!payload.new || !payload.new.id) { scheduleLightReload(); return; }
    allMatches = upsertById(allMatches, payload.new);
  }
  scheduleMatchRender();
}

function handleGoalsEvent(payload) {
  if (payload.eventType === 'DELETE') {
    if (!payload.old || !payload.old.id) { scheduleLightReload(); return; }
    allGoals = removeById(allGoals, payload.old);
  } else {
    if (!payload.new || !payload.new.id) { scheduleLightReload(); return; }
    allGoals = upsertById(allGoals, payload.new);
  }
  scheduleMatchRender();
}

// tiebreak_results is effectively append-only (a shootout result is
// recorded once, never edited) but handled generically anyway for safety.
function handleTiebreakEvent(payload) {
  if (payload.eventType === 'DELETE') {
    if (!payload.old || !payload.old.id) { scheduleLightReload(); return; }
    allTiebreaks = removeById(allTiebreaks, payload.old);
  } else {
    if (!payload.new || !payload.new.id) { scheduleLightReload(); return; }
    allTiebreaks = upsertById(allTiebreaks, payload.new);
  }
  scheduleMatchRender();
}

function renderMatchUpdate() {
  // A single match completion typically fires a burst of goal INSERTs
  // followed by one matches UPDATE (played=true) -- the shared debounce
  // above coalesces that whole burst into one render pass here, covering
  // standings/schedule/bracket (driven by matches) and stats (driven by
  // both matches.mvp_player_id and goals).
  renderBoardStandings();
  renderBoardSchedule();
  renderBoardStats();
}
