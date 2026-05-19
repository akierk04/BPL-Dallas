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

setInterval(updateCountdown, 1000);
updateCountdown();
loadData();
