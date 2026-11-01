function enterBoard() {
  var splash = document.getElementById('splashScreen');
  if (splash) splash.style.display = 'none';
  sessionStorage.setItem('bplBoardEntered', 'true');
}

function showPoster() {
  var splash = document.getElementById('splashScreen');
  sessionStorage.removeItem('bplBoardEntered');
  if (splash) splash.style.display = 'flex';
}

function renderSplash() {
  var splash = document.getElementById('splashScreen');
  if (!splash) return;

  var userEntered = sessionStorage.getItem('bplBoardEntered') === 'true';
  splash.style.display = userEntered ? 'none' : 'flex';
}

// Manual "Refresh" button in the header. Routed through loadMatchData()
// -- the match-day lightweight fetch (captains+players+matches+goals,
// skipping bidding_state since the auction is over). This replaces the
// auction-phase loadBiddingData() this button used to call.
var _manualRefreshCooldown = false;
function manualRefresh() {
  if (_manualRefreshCooldown) return;
  _manualRefreshCooldown = true;

  var btn = document.getElementById('refreshBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Refreshing...'; }

  Promise.resolve(refreshForPhase()).finally(function() {
    var remaining = 8;
    (function tick() {
      if (remaining <= 0) {
        _manualRefreshCooldown = false;
        if (btn) { btn.disabled = false; btn.textContent = 'Refresh'; }
        return;
      }
      if (btn) btn.textContent = 'Wait ' + remaining + 's';
      remaining--;
      setTimeout(tick, 1000);
    })();
  });
}

// Phones lock and background tabs lose their websocket, and realtime does not replay what
// was missed. During the auction, refetch once when the page becomes visible again.
var _lastWake = 0;
function wakeRefresh() {
  if (document.visibilityState !== 'visible') return;
  if (!auctionInProgress()) return;
  var now = Date.now();
  if (now - _lastWake < 5000) return;
  _lastWake = now;
  loadBiddingData();
}
document.addEventListener('visibilitychange', wakeRefresh);
window.addEventListener('pageshow', function(e) { if (e.persisted) wakeRefresh(); });
window.addEventListener('online', wakeRefresh);

// Safety net: if a broadcast is ever missed, refetch quietly every ~45s while the page is visible
// during the auction. Random start offset so phones do not all query at the same instant.
var _polling = false;
function backupPoll() {
  if (document.visibilityState === 'visible' && auctionInProgress() && !_polling) {
    _polling = true;
    Promise.resolve(loadBiddingData()).catch(function() { rtDown = true; }).finally(function() { _polling = false; updateFreshness(); });
  }
  setTimeout(backupPoll, 40000 + Math.random() * 10000);
}
setTimeout(backupPoll, 5000 + Math.random() * 40000);

// "Updated Ns ago" label. Amber when the live link is down or data is more than 2 minutes old.
function updateFreshness() {
  var el = document.getElementById('viewerCount');
  if (!el) return;
  var age = Math.max(0, Math.round((Date.now() - _lastDataAt) / 1000));
  var stale = rtDown || age > 120;
  var label = age < 5 ? 'Just updated' : age < 90 ? 'Updated ' + age + 's ago' : 'Updated ' + Math.round(age / 60) + 'm ago';
  el.innerHTML = '<span class="fresh-pill' + (stale ? ' stale' : '') + '"><span class="live-dot"></span>' +
    (rtDown ? 'Reconnecting... ' : '') + label + '</span>';
}
setInterval(updateFreshness, 5000);
updateFreshness();

setInterval(updateCountdown, 1000);
updateCountdown();
loadData();
