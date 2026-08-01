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

// Manual "Refresh" button in the header. Routed through loadBiddingData()
// -- the same lightweight players+captains+bidding_state fetch the
// automatic light path already uses -- since during the auction the only
// thing an admin ever changes is player assignment + price (which also
// updates the captain's wallet). This does NOT refresh matches/goals; if
// this button needs to double as a match-day recovery tool later, switch
// this back to loadData().
var _manualRefreshCooldown = false;
function manualRefresh() {
  if (_manualRefreshCooldown) return;
  _manualRefreshCooldown = true;

  var btn = document.getElementById('refreshBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Refreshing...'; }

  Promise.resolve(loadBiddingData()).finally(function() {
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

setInterval(updateCountdown, 1000);
updateCountdown();
loadData();
