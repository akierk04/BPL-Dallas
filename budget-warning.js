// BPL Dallas Season 4 - Budget rules (replaces the Season 3 group/reserve model)
//
// Purse: $100M per team, stored in captains.wallet as whole millions (100).
// Squad: captain + 5 auction players. Captains play for their own team and are
// NOT charged against the purse.
// Base price $10M for every player, minimum raise $5M, no player groups.
//
// MAXIMUM BID RULE
//   Max Bid = Remaining Budget - (Remaining Roster Spots After This Purchase x $10M)
//   Example: $100M, 5 spots left -> 100 - (4 x 10) = $60M
//            buy for $30M -> $70M, 4 spots left -> 70 - (3 x 10) = $40M
//
// A team with no spots left has no max bid (it cannot buy anyone).

var S4_BUDGET = 100;
var S4_SLOTS = 5;
var S4_BASE = 10;
var S4_INCREMENT = 5;
// players.group_name / captains.captain_group still exist in the database but
// Season 4 does not use them. New players are written with this constant so the
// column constraints keep passing.
var S4_LEGACY_GROUP = '1';

// $ formatter. All purse and price values are whole millions.
function fmtM(n) {
  return '$' + Number(n || 0).toLocaleString() + 'M';
}

function spotsLeft(soldPlayers) {
  return Math.max(0, S4_SLOTS - (soldPlayers || []).length);
}

// Highest legal bid for a team right now (0 if its roster is full).
function maxBid(wallet, soldPlayers) {
  var left = spotsLeft(soldPlayers);
  if (left === 0) return 0;
  return Math.max(0, wallet - (left - 1) * S4_BASE);
}

// Is `amount` a legal winning bid for this team?  Returns { allowed, reason }.
function checkBid(wallet, soldPlayers, amount) {
  var left = spotsLeft(soldPlayers);
  if (left === 0) {
    return { allowed: false, reason: 'Roster is full (' + S4_SLOTS + '/' + S4_SLOTS + ' players).' };
  }
  if (!isFinite(amount) || Math.floor(amount) !== amount) {
    return { allowed: false, reason: 'Bids are whole $M amounts.' };
  }
  if ((amount - S4_BASE) % S4_INCREMENT !== 0 && amount >= S4_BASE) {
    return { allowed: false, reason: 'Bids go up in ' + fmtM(S4_INCREMENT) + ' steps from the ' + fmtM(S4_BASE) + ' base.' };
  }
  if (amount < S4_BASE) {
    return { allowed: false, reason: 'Below the ' + fmtM(S4_BASE) + ' base price.' };
  }
  var mb = maxBid(wallet, soldPlayers);
  if (amount > mb) {
    return { allowed: false, reason: 'Over max bid. Max is ' + fmtM(mb) + ' (' + fmtM(wallet) + ' left, ' + left + ' spot' + (left !== 1 ? 's' : '') + ' to fill).' };
  }
  return { allowed: true, reason: '' };
}

// Summary used by the badges and the board spotlights.
// Signature kept from Season 3 so call sites do not change; the group
// arguments are ignored. `safe` is the max bid (used for "most pressure" sorting).
function budgetWarning(wallet, captainGroup, soldPlayers, activeGroup) {
  var left = spotsLeft(soldPlayers);
  if (left === 0) {
    return { color: 'var(--green)', reserveColor: 'var(--green)', msg: 'Squad complete. No more bids needed', safe: 0, reserve: 0, needed: [], maxBid: 0, spotsLeft: 0 };
  }
  var mb = maxBid(wallet, soldPlayers);
  var reserve = (left - 1) * S4_BASE;
  var needed = [];
  for (var i = 0; i < left; i++) needed.push('spot');
  var color = mb <= S4_BASE ? 'var(--red)' : mb <= S4_BASE * 3 ? 'var(--groupB)' : 'var(--green)';
  return {
    color: color,
    reserveColor: 'var(--muted)',
    msg: 'Max bid: ' + fmtM(mb),
    safe: mb,
    reserve: reserve,
    needed: needed,
    maxBid: mb,
    spotsLeft: left
  };
}

// HTML badge: max bid on the first line, spots left on the second.
function warningBadgeHtml(wallet, captainGroup, soldPlayers, activeGroup) {
  var w = budgetWarning(wallet, captainGroup, soldPlayers || [], activeGroup);
  if (w.spotsLeft === 0) {
    return '<div style="margin-top:8px;padding:7px 12px;border-radius:8px;background:' + w.color + '18;border:1px solid ' + w.color + '55;font-size:13px;font-weight:500;color:' + w.color + ';">' + w.msg + '</div>';
  }
  return '<div style="margin-top:8px;padding:7px 12px;border-radius:8px;background:var(--surface2);border:1px solid var(--border);font-size:13px;font-weight:500;">'
    + '<div style="color:' + w.color + ';">Max Bid: ' + fmtM(w.maxBid) + (w.maxBid <= S4_BASE ? ' (base price only)' : '') + '</div>'
    + '<div style="color:var(--muted);margin-top:3px;">' + w.spotsLeft + ' spot' + (w.spotsLeft !== 1 ? 's' : '') + ' left</div>'
    + '</div>';
}
