var rtDown = false;
const _cid = Math.random().toString(36).slice(2);

// -- FALLBACK path --
// Only used if a realtime payload comes back malformed. Re-fetches
// captains + players + matches + goals the old way so one bad event
// can't leave the board stuck or showing wrong data.
let _lightReloadTimer = null;
function scheduleLightReload() {
  clearTimeout(_lightReloadTimer);
  _lightReloadTimer = setTimeout(() => refreshForPhase(), 300);
}

// The old 'watching live' presence channel was removed: 75 phones joining at once can exceed
// the Free plan's 20 presence messages per second, and the counter was cosmetic.

// Match Day Board:
// Auction is over -- players/captains/bidding_state no longer change, so
// those subscriptions are dropped entirely (dead weight otherwise).
// matches/goals are now the live path and route through patch-from-payload
// handlers in data.js, same zero-extra-query approach used during the
// auction -- no reason to drop that discipline just because the phase
// changed. Payments and Hall of Fame stay lazy-loaded on tab open.
// Season 4: the auction runs on this board, so captains/players/bidding_state are live
// again. These use the patch-from-payload handlers in data.js (one broadcast, zero extra
// queries per viewer), so 80 phones watching does not multiply database load.
db.channel('bpl-board-' + _cid)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'bidding_state' },    handleBiddingStateEvent)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'players' },          handlePlayersEvent)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'captains' },         handleCaptainsEvent)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' },          handleMatchesEvent)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'goals' },            handleGoalsEvent)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'tiebreak_results' }, handleTiebreakEvent)
  .subscribe(function(status) {
    // Realtime does not replay events missed while disconnected. Track the link state for the
    // freshness label, and refetch as soon as it comes back so nothing stays stale.
    if (status === 'SUBSCRIBED') {
      var wasDown = rtDown;
      rtDown = false;
      if (wasDown) refreshForPhase();
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      rtDown = true;
    }
    if (typeof updateFreshness === "function") updateFreshness();
  });
