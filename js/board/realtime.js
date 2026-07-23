const _cid = Math.random().toString(36).slice(2);

// ── LIGHT path: players/captains changed (bidding, assignment) ──
// Skips matches/goals fetch and skips schedule/standings/match-stats renders.
let _lightReloadTimer = null;
function scheduleLightReload() {
  clearTimeout(_lightReloadTimer);
  _lightReloadTimer = setTimeout(() => loadBiddingData(), 300);
}

// ── HEAVY path: matches/goals changed (results, scoring) ──
// Full reload — schedule/standings/bracket genuinely need to recompute.
let _heavyReloadTimer = null;
function scheduleHeavyReload() {
  clearTimeout(_heavyReloadTimer);
  _heavyReloadTimer = setTimeout(() => loadData(), 750);
}

// Match-day Board optimization:
// Captains are static on match day (rosters locked after auction).
// Payments and Hall of Fame are lazy-loaded on tab open, so not realtime either.
db.channel('bpl-board-' + _cid)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'players' },       scheduleLightReload)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'bidding_state' }, scheduleLightReload)
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
