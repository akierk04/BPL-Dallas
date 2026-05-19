const _cid = Math.random().toString(36).slice(2);

let _boardReloadTimer = null;
function scheduleLoadData() {
  clearTimeout(_boardReloadTimer);
  _boardReloadTimer = setTimeout(() => loadData(), 750);
}

// Match-day Board optimization:
// Captains are static on match day (rosters locked after auction).
// Auction is complete/static, so no bidding_state subscription.
// Payments and Hall of Fame are lazy-loaded on tab open, so not realtime either.
db.channel('bpl-board-' + _cid)
  .on('postgres_changes',{event:'*',schema:'public',table:'players'},scheduleLoadData)
  .on('postgres_changes',{event:'*',schema:'public',table:'matches'},scheduleLoadData)
  .on('postgres_changes',{event:'*',schema:'public',table:'goals'},scheduleLoadData)
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
