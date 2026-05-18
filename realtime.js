// Realtime subscriptions with debounce to avoid reload storms
// Extracted from admin.html during Admin refactor.

let reloadTimer = null;

function scheduleLoadData() {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => {
    loadData();
  }, 500);
}

const _cid = Math.random().toString(36).slice(2);

db.channel('bpl-admin-' + _cid)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'captains' }, scheduleLoadData)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, scheduleLoadData)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'bidding_state' }, scheduleLoadData)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, scheduleLoadData)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'goals' }, scheduleLoadData)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, scheduleLoadData)
  .subscribe();
