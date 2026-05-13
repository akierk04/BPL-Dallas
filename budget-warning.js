// BPL Dallas Season 2 - Budget Warning
// Squad: 6 players total (captain + 5 bids)
// Every team: 1xG1, 1xG2, 1xG3, 2xG4, 1xG5
// Captain fills their own group slot - cannot bid on own group
// G5 captains: must buy G1+G2+G3+G4+G4 (no G5 bid needed)
// Base prices: G1=500, G2=400, G3=300, G4=200, G5=100

var GROUP_BASE = { '1': 500, '2': 400, '3': 300, '4': 200, '5': 100 };

// Returns array of group strings still needed (with repeats for G4).
// G1/G2/G3 captain examples:
//   G1 captain, 0 bought  -> ['2','3','4','4','5']
//   G1 captain, bought G2 -> ['3','4','4','5']
// G5 captain examples:
//   G5 captain, 0 bought  -> ['1','2','3','4','4']
//   G5 captain, bought G1 -> ['2','3','4','4']
function groupsStillNeeded(captainGroup, soldPlayers) {
  var own = String(captainGroup);
  var have = (soldPlayers || []).map(function(p) { return String(p.group_name); });
  var stillNeeded = [];
  var haveList = have.slice();

  // Mandatory single slots: G1, G2, G3 - skip own group
  var mandatorySingle = ['1','2','3'].filter(function(g) { return g !== own; });
  mandatorySingle.forEach(function(g) {
    var idx = haveList.indexOf(g);
    if (idx !== -1) {
      haveList.splice(idx, 1);
    } else {
      stillNeeded.push(g);
    }
  });

  // G4: always 2 slots
  var g4Covered = haveList.filter(function(g) { return g === '4'; }).length;
  var g4Still = Math.max(0, 2 - g4Covered);
  for (var i = 0; i < g4Still; i++) stillNeeded.push('4');

  // G5: 1 slot only for non-G5 captains
  if (own !== '5') {
    var g5Covered = haveList.filter(function(g) { return g === '5'; }).length;
    var g5Still = Math.max(0, 1 - g5Covered);
    for (var j = 0; j < g5Still; j++) stillNeeded.push('5');
  }
  // G5 captains: no G5 slot needed (they ARE G5)

  return stillNeeded;
}

// Minimum pts captain must keep in reserve
function reserveNeeded(captainGroup, soldPlayers) {
  return groupsStillNeeded(captainGroup, soldPlayers)
    .reduce(function(sum, g) { return sum + (GROUP_BASE[g] || 0); }, 0);
}

// Main budget warning
// wallet: current balance
// captainGroup: 1-5
// soldPlayers: array of player objects assigned to this captain
function budgetWarning(wallet, captainGroup, soldPlayers) {
  var needed = groupsStillNeeded(captainGroup, soldPlayers || []);
  var reserve = needed.reduce(function(s, g) { return s + (GROUP_BASE[g] || 0); }, 0);
  var safe = wallet - reserve;

  if (needed.length === 0) {
    return { color: 'var(--green)', msg: 'Squad complete - no more bids needed', safe: 0, reserve: 0, needed: [] };
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
function warningBadgeHtml(wallet, captainGroup, soldPlayers) {
  var w = budgetWarning(wallet, captainGroup, soldPlayers || []);
  return '<div style="margin-top:8px;padding:7px 12px;border-radius:8px;background:' + w.color + '18;border:1px solid ' + w.color + '55;font-size:13px;font-weight:500;color:' + w.color + ';">' + w.msg + '</div>';
}

// Bid eligibility check - returns { allowed: bool, reason: string }
function canBid(captain, playerGroup, nextBid, soldPlayers) {
  var own = String(captain.captain_group);
  var pg = String(playerGroup);

  if (pg === own) {
    return { allowed: false, reason: 'Cannot bid on your own group (Group ' + own + ')' };
  }

  var needed = groupsStillNeeded(own, soldPlayers);

  if (needed.indexOf(pg) === -1) {
    if (pg === '4') {
      return { allowed: false, reason: 'Both Group 4 slots already filled (max 2)' };
    }
    return { allowed: false, reason: 'Group ' + pg + ' slot already filled (max 1)' };
  }

  if (captain.wallet < nextBid) {
    return { allowed: false, reason: 'Insufficient funds (' + captain.wallet + ' pts left)' };
  }

  var walletAfter = captain.wallet - nextBid;
  var neededAfter = needed.slice();
  var idx = neededAfter.indexOf(pg);
  if (idx !== -1) neededAfter.splice(idx, 1);
  var reserveAfter = neededAfter.reduce(function(s, g) { return s + (GROUP_BASE[g] || 0); }, 0);
  if (walletAfter < reserveAfter) {
    return { allowed: false, reason: 'Not enough safe budget. Need ' + reserveAfter + ' pts in reserve for remaining slots.' };
  }

  return { allowed: true, reason: '' };
}
