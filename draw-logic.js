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
//   * Momentum: if the last 3 sales averaged $15M or less, a top player is drawn next (needs 2+ regular draws since the last one).
//   * Competition gate: outside the deadline, a top player is only offered while 4+ teams can bid $30M or more,
//     so he is never drawn when only one or two teams have the money to push the price.
//   * Deadline: all top players are offered before the last 60% of the pool, so none is left for the end.
//   * The first draw is always a regular player.
// If no player is tagged is_top, or the mix is switched off, this is exactly the old random draw.

var DRAW_BASE_GAP = 5;
var DRAW_MIN_GAP = 2;
var DRAW_MAX_GAP = 8;
var DRAW_TAIL_SHARE = 0.6;      // the last 60% of the pool is regular-only; top players are offered in the first 40%
var DRAW_RECENT_N = 3;          // momentum looks at the last 3 sales
var DRAW_LOW_PRICE_MULT = 1.5;  // ...and triggers when they averaged at most 1.5x base ($15M)
var DRAW_BIG_BID_MULT = 3;      // a team is a 'serious bidder' for a top player if its max bid is at least 3x base ($30M)
var DRAW_MIN_BIDDERS = 4;       // do not offer a top player (outside the deadline) unless 4+ teams are serious bidders
var DRAW_MOMENTUM_MIN = 2;      // but never two top players back to back from momentum alone

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

// Teams that could still pay a top-player price: spots left and a max bid of at least 3x base.
function drawBidders(captains, players) {
  var n = 0;
  (captains || []).forEach(function(c) {
    var sold = (players || []).filter(function(p) { return p.captain_id === c.id && p.is_sold; });
    if (maxBid(Number(c.wallet) || 0, sold) >= S4_BASE * DRAW_BIG_BID_MULT) n++;
  });
  return n;
}

// Average price of the last few sales (null until DRAW_RECENT_N players have been sold).
function drawRecentAvg(players) {
  var sold = (players || []).filter(function(p) { return p.is_sold && p.sold_at && p.sold_price != null; })
    .sort(function(a, b) { return new Date(b.sold_at) - new Date(a.sold_at); }).slice(0, DRAW_RECENT_N);
  if (sold.length < DRAW_RECENT_N) return null;
  return sold.reduce(function(s, p) { return s + Number(p.sold_price); }, 0) / sold.length;
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
  var since = drawsSinceTop(players, currentPlayerId);
  var offered = (players || []).some(function(p) { return p.is_sold || p.unsold_at; });

  // Deadline: every top player must be offered while most of the pool is still to come, so a top player is
  // never left for the end when wallets are low. The last DRAW_TAIL_SHARE of the pool is regular-only; if we
  // are inside that tail and tops remain, they come out back to back.
  var tail = Math.ceil((players || []).length * DRAW_TAIL_SHARE);
  var usable = fresh.length - tail;
  if (usable <= 0) {
    return { player: pickRandom(tops), kind: 'top', note: 'Top players are drawn before the last ' + tail + ' players so they go while teams still have money.' };
  }
  gap = Math.min(gap, Math.max(1, Math.floor(usable / tops.length)));

  // Momentum: the last few sales went for close to base price, so bring a top player out now.
  var recent = drawRecentAvg(players);
  var bidders = drawBidders(captains, players);
  var competitive = bidders >= DRAW_MIN_BIDDERS;
  var momentum = recent !== null && recent <= S4_BASE * DRAW_LOW_PRICE_MULT && since >= DRAW_MOMENTUM_MIN;
  if (offered && momentum && competitive) {
    return { player: pickRandom(tops), kind: 'top', note: 'Last ' + DRAW_RECENT_N + ' sales averaged ' + fmtM(Math.round(recent * 10) / 10) + ', so a top player is next.' };
  }
  if (offered && since >= gap && competitive) {
    var note = 'Teams hold ' + fmtM(Math.round(pace.perSpot * 10) / 10) + ' per open spot (start ' + fmtM(pace.start) + '). Top player every ' + gap + ' draws.';
    return { player: pickRandom(tops), kind: 'top', note: note };
  }
  return { player: pickRandom(regular), kind: 'regular', note: '' };
}
