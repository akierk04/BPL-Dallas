async function loadData(options = {}) {
  const includeDues = options.includeDues || duesLoaded || false;
  const includeHall = options.includeHall || hallOfFameLoaded || false;

  const requests = [
    db.from('captains').select('*').order('name'),
    db.from('players').select('*').order('name'),
    db.from('bidding_state').select('*').eq('id',1).single(),
    db.from('matches').select('*').order('created_at'),
    db.from('goals').select('*')
  ];

  if (includeDues) {
    requests.push(db.from('payments').select('*').order('created_at', { ascending: false }));
    requests.push(db.from('payment_summary').select('*'));
    requests.push(db.from('top_payers').select('*'));
  }

  if (includeHall) {
    requests.push(db.from('hall_of_fame').select('*').order('season', { ascending: false }));
  }

  const results = await Promise.all(requests);

  const [capRes, playRes, bidRes, matchRes, goalRes] = results;

  allCaptains = capRes.data || [];
  detectSoldTransition(playRes.data || []);
  allPlayers = playRes.data || [];
  allMatches = matchRes.data || [];
  allGoals = goalRes.data || [];
  currentPlayerId = bidRes.data?.player_id || null;
  bidState = bidRes.data || null;

  let idx = 5;
  if (includeDues) {
    const paymentsRes = results[idx++];
    const summaryRes = results[idx++];
    const topPayersRes = results[idx++];
    allPayments = paymentsRes.data || [];
    paymentSummary = summaryRes.data || [];
    topPayers = topPayersRes.data || [];
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
  const [paymentsRes, summaryRes, topPayersRes] = await Promise.all([
    db.from('payments').select('*').order('created_at', { ascending: false }),
    db.from('payment_summary').select('*'),
    db.from('top_payers').select('*')
  ]);
  allPayments = paymentsRes.data || [];
  paymentSummary = summaryRes.data || [];
  topPayers = topPayersRes.data || [];
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
// ── Light reload path for bidding/assignment ──
// Fires on 'players' and 'bidding_state' changes (Go Live, Clear, sale/assign).
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
