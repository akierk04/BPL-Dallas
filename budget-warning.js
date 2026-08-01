// BPL Dallas Season 3 - Budget Warning
// Squad: 6 players total (captain + 5 bids)
// Captain fills their own group slot; buys exactly ONE player from each
// of the other 5 groups. No group requires more than one purchase.
// Base prices: G1=1100, G2=800, G3=550, G4=350, G5=200, G6=100
//
// Reserve = base price of EVERY group the captain still needs to buy,
// including whichever group is currently live for auction. "Safe to
// spend" is wallet minus that full reserve -- i.e. genuinely discretionary
// money above and beyond simply meeting every remaining slot's base cost,
// not just the other slots. There is no exclusion for the active group.

var ALL_GROUPS = ['1', '2', '3', '4', '5', '6'];
var GROUP_BASE = { '1': 1100, '2': 800, '3': 550, '4': 350, '5': 200, '6': 100 };

// Returns array of group strings still needed (one entry per remaining slot).
// Example: G2 captain, 0 bought -> ['1','3','4','5','6']
// Example: G5 captain, bought G1 -> ['2','3','4','6']
function groupsStillNeeded(captainGroup, soldPlayers) {
  var own = String(captainGroup);
  var have = (soldPlayers || []).map(function(p) { return String(p.group_name); });
  var required = ALL_GROUPS.filter(function(g) { return g !== own; });
  var haveList = have.slice();
  var stillNeeded = [];

  required.forEach(function(g) {
    var idx = haveList.indexOf(g);
    if (idx !== -1) {
      haveList.splice(idx, 1); // already covered by a purchased player
    } else {
      stillNeeded.push(g);
    }
  });

  return stillNeeded;
}

// Minimum pts captain must keep in reserve for all remaining required groups.
function reserveNeeded(captainGroup, soldPlayers) {
  return groupsStillNeeded(captainGroup, soldPlayers)
    .reduce(function(sum, g) { return sum + (GROUP_BASE[g] || 0); }, 0);
}

// Main budget warning
// wallet:       current balance
// captainGroup: 1-6
// soldPlayers:  array of player objects assigned to this captain
// activeGroup:  the group currently live for auction, if any. Per the
//               official rules doc: "When a player is live, their group
//               is excluded from the reserve -- safe spend increases
//               accordingly." So the live group's base price is NOT
//               counted toward the reserve while it's live -- you're
//               allowed to spend up to wallet-minus-other-reserves on it.
function budgetWarning(wallet, captainGroup, soldPlayers, activeGroup) {
  var needed = groupsStillNeeded(captainGroup, soldPlayers || []);
  var reserveGroups = activeGroup
    ? needed.filter(function(g) { return String(g) !== String(activeGroup); })
    : needed;
  var reserve = reserveGroups.reduce(function(s, g) { return s + (GROUP_BASE[g] || 0); }, 0);
  var safe = wallet - reserve;

  if (needed.length === 0) {
    return { color: 'var(--green)', msg: 'Squad complete -- no more bids needed', safe: 0, reserve: 0, needed: [] };
  }
  if (safe <= 0) {
    return { color: 'var(--red)', msg: 'Warning: Over budget reserve!', safe: safe, reserve: reserve, needed: needed };
  }
  if (safe <= 200) {
    return { color: 'var(--groupB)', msg: 'Caution: Only ' + safe + ' pts safe to spend', safe: safe, reserve: reserve, needed: needed };
  }
  return { color: 'var(--green)', msg: 'Safe to spend: ' + safe + ' pts', safe: safe, reserve: reserve, needed: needed };
}

// HTML badge
function warningBadgeHtml(wallet, captainGroup, soldPlayers, activeGroup) {
  var w = budgetWarning(wallet, captainGroup, soldPlayers || [], activeGroup);
  return '<div style="margin-top:8px;padding:7px 12px;border-radius:8px;background:' + w.color + '18;border:1px solid ' + w.color + '55;font-size:13px;font-weight:500;color:' + w.color + ';">' + w.msg + '</div>';
}

// Bid eligibility check -- returns { allowed: bool, reason: string }
function canBid(captain, playerGroup, nextBid, soldPlayers) {
  var own = String(captain.captain_group);
  var pg = String(playerGroup);

  if (pg === own) {
    return { allowed: false, reason: 'Cannot bid on your own group (Group ' + own + ')' };
  }

  var needed = groupsStillNeeded(own, soldPlayers);

  if (needed.indexOf(pg) === -1) {
    return { allowed: false, reason: 'Group ' + pg + ' slot already filled' };
  }

  if (captain.wallet < nextBid) {
    return { allowed: false, reason: 'Insufficient funds (' + captain.wallet + ' pts left)' };
  }

  // Post-bid reserve: if this bid wins, group pg is filled -- check that
  // the remaining wallet still covers every other still-needed group.
  var neededAfter = needed.slice();
  var idx = neededAfter.indexOf(pg);
  if (idx !== -1) neededAfter.splice(idx, 1);
  var reserveAfter = neededAfter.reduce(function(s, g) { return s + (GROUP_BASE[g] || 0); }, 0);
  var walletAfter = captain.wallet - nextBid;

  if (walletAfter < reserveAfter) {
    return { allowed: false, reason: 'Not enough safe budget. Need ' + reserveAfter + ' pts in reserve for remaining groups.' };
  }

  return { allowed: true, reason: '' };
}
