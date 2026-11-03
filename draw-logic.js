// BPL Dallas Season 4: pick the next player to put up for auction.
// Pure functions (no DOM, no database) so they can be tested on their own.
// Loaded after budget-warning.js (uses S4_BUDGET, S4_SLOTS).
//
// Order of play (unchanged):
//   1. Players never offered are drawn at random.
//   2. When every fresh player has been offered, unsold players return oldest-first.
//
// New: TOP PLAYERS (players.is_top = true) are mixed in between regular players, paced by spending.
//   * "Spend pace" = cash still in wallets per open roster spot, compared with the starting level
//     (S4_BUDGET / S4_SLOTS, i.e. $20M per spot). If teams are holding MORE per spot than at the start,
//     prices have been running low and cash is piling up, so a top player comes out sooner.
//     If cash per spot is tight, top players are spaced out.
//   * Gap between top players = round(5 / pace ratio) regular draws, kept between 2 and 8.
//   * The gap is also capped so every top player is offered before the pool runs out.
//   * The first draw is always a regular player.
// If no player is tagged is_top, or the mix is switched off, this is exactly the old random draw.

var DRAW_BASE_GAP = 5;
var DRAW_MIN_GAP = 2;
var DRAW_MAX_GAP = 8;

// Cash per open roster spot across all teams that still have spots to fill.
function drawPace(captains, players) {
  var cash = 0, spots = 0;
  (captains || []).forEach(function(c) {
    var sold = (players || []).filter(function(p) { return p.captain_id === c.id && p.is_sold; });
    var left = Math.max(0, S4_SLOTS - sold.length);
    if (left > 0) { cash += Number(c.wallet) || 0; spots += left; }
  });
  var start = S4_BUDGET / S4_SLOTS;
  var perSpot = spots ? cash / spots : start;
  return { cash: cash, spots: spots, perSpot: perSpot, start: start, ratio: perSpot / start };
}

// How many players have been offered since the last top player (sold or sent back unsold).
function drawsSinceTop(players, excludeId) {
  var offers = [];
  (players || []).forEach(function(p) {
    if (p.id === excludeId) return;
    var t = p.is_sold ? p.sold_at : p.unsold_at;
    if (t) offers.push({ t: new Date(t).getTime() || 0, top: !!p.is_top });
  });
  offers.sort(function(a, b) { return b.t - a.t; });
  var n = 0;
  for (var i = 0; i < offers.length; i++) { if (offers[i].top) break; n++; }
  return n;
}

// Returns { player, kind: 'top' | 'regular' | 'returned', note } or null when nothing is left.
function pickNextPlayer(players, captains, currentPlayerId, mixTop, rand) {
  rand = rand || Math.random;
  var pool = (players || []).filter(function(p) { return !p.is_sold && p.id !== currentPlayerId; });
  if (!pool.length) return null;
  var fresh = pool.filter(function(p) { return !p.unsold_at; });
  if (!fresh.length) {
    var oldest = pool.slice().sort(function(a, b) { return new Date(a.unsold_at) - new Date(b.unsold_at); })[0];
    return { player: oldest, kind: 'returned', note: '' };
  }
  var pickRandom = function(list) { return list[Math.floor(rand() * list.length)]; };
  var tops = fresh.filter(function(p) { return p.is_top; });
  var regular = fresh.filter(function(p) { return !p.is_top; });
  if (!mixTop || !tops.length) { var any = pickRandom(fresh); return { player: any, kind: any.is_top ? 'top' : 'regular', note: '' }; }
  if (!regular.length) return { player: pickRandom(tops), kind: 'top', note: '' };

  var pace = drawPace(captains, players);
  var gap = Math.round(DRAW_BASE_GAP / (pace.ratio || 1));
  gap = Math.max(DRAW_MIN_GAP, Math.min(DRAW_MAX_GAP, gap));
  gap = Math.min(gap, Math.max(1, Math.floor(fresh.length / (tops.length + 1))));
  var since = drawsSinceTop(players, currentPlayerId);
  var offered = (players || []).some(function(p) { return p.is_sold || p.unsold_at; });
  if (offered && since >= gap) {
    var note = 'Teams hold ' + fmtM(Math.round(pace.perSpot * 10) / 10) + ' per open spot (start ' + fmtM(pace.start) + '). Top player every ' + gap + ' draws.';
    return { player: pickRandom(tops), kind: 'top', note: note };
  }
  return { player: pickRandom(regular), kind: 'regular', note: '' };
}
