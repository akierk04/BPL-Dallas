const _cid = Math.random().toString(36).slice(2);

// -- FALLBACK path --
// Only used if a realtime payload comes back malformed. Re-fetches
// captains + players + matches + goals the old way so one bad event
// can't leave the board stuck or showing wrong data.
let _lightReloadTimer = null;
function scheduleLightReload() {
  clearTimeout(_lightReloadTimer);
  _lightReloadTimer = setTimeout(() => loadMatchData(), 300);
}

// Match Day Board:
// Auction is over -- players/captains/bidding_state no longer change, so
// those subscriptions are dropped entirely (dead weight otherwise).
// matches/goals are now the live path and route through patch-from-payload
// handlers in data.js, same zero-extra-query approach used during the
// auction -- no reason to drop that discipline just because the phase
// changed. Payments and Hall of Fame stay lazy-loaded on tab open.
db.channel('bpl-board-' + _cid)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, handleMatchesEvent)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'goals' },   handleGoalsEvent)
  .subscribe();

const presenceKey =
  (window.crypto && crypto.randomUUID)
    ? crypto.randomUUID()
    : ('id-' + Date.now() + '-' + Math.random().toString(36).slice(2));

const presenceChannel = db.channel('bpl-presence', { config: { presence: { key: presenceKey } } });
let _presenceTimer = null;
presenceChannel
  .on('presence', { event: 'sync' }, () => {
    clearTimeout(_presenceTimer);
    _presenceTimer = setTimeout(() => {
      const state = presenceChannel.presenceState();
      const count = Object.keys(state).length;
      const el = document.getElementById('viewerCount');
      if (!el) return;
      el.innerHTML = count === 1 ? '<span class="viewer-pill"><span class="live-dot"></span>1 watching live</span>' : '<span class="viewer-pill"><span class="live-dot"></span>' + count + ' watching live</span>';
    }, 2000);
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await presenceChannel.track({ online_at: new Date().toISOString() });
    }
  });
