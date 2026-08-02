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

  Promise.resolve(loadMatchData()).finally(function() {
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
