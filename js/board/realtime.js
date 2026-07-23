const _cid = Math.random().toString(36).slice(2);

// ── FALLBACK path ──
// Only used if a realtime payload comes back malformed. Re-fetches
// captains + players + bidding_state the old way so one bad event
// can't leave the board stuck or showing wrong data.
let _lightReloadTimer = null;
function scheduleLightReload() {
  clearTimeout(_lightReloadTimer);
  _lightReloadTimer = setTimeout(() => loadBiddingData(), 300);
}

// ── HEAVY path: matches/goals changed (results, scoring) ──
// Full reload — schedule/standings/bracket genuinely need to recompute.
// Rare during bidding, so no need to optimize this one.
let _heavyReloadTimer = null;
function scheduleHeavyReload() {
  clearTimeout(_heavyReloadTimer);
  _heavyReloadTimer = setTimeout(() => loadData(), 750);
}

// Match-day Board optimization:
// Payments and Hall of Fame are lazy-loaded on tab open, so not realtime.
//
// players / captains / bidding_state route through the patch-from-payload
// handlers in data.js — no database query on the client at all, just the
// row Postgres already broadcasts. This is what lets the board handle
// many simultaneous viewers without hammering Supabase on every sale.
db.channel('bpl-board-' + _cid)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'players' },       handlePlayersEvent)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'captains' },      handleCaptainsEvent)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'bidding_state' }, handleBiddingStateEvent)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' },       scheduleHeavyReload)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'goals' },         scheduleHeavyReload)
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
