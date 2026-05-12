// BPL Dallas Season 2 - Budget Warning
// Squad: captain + 5 bids = 6 total
// Mandatory: 1xG1, 1xG2, 1xG3 (captain fills own group slot)
// Remaining: always 2xG4
// Base prices: G1=500, G2=400, G3=300, G4=200

const GROUP_BASE = { '1': 500, '2': 400, '3': 300, '4': 200 };

function groupsStillNeeded(captainGroup, soldPlayers) {
  var own = String(captainGroup);
  var have = (soldPlayers || []).map(function(p) { return String(p.group_name); });
  var stillNeeded = [];
  var mandatory = ['1','2','3'].filter(function(g) { return g !== own; });
  var haveList = have.slice();

  mandatory.forEach(function(g) {
    var idx = haveList.indexOf(g);
    if (idx !== -1) {
      haveList.splice(idx, 1);
    } else {
      stillNeeded.push(g);
    }
  });

  var g4Covered = haveList.filter(function(g) { return g === '4'; }).length;
  var g4Still = Math.max(0, 2 - g4Covered);
  for (var i = 0; i < g4Still; i++) stillNeeded.push('4');

  return stillNeeded;
}

function reserveNeeded(captainGroup, soldPlayers) {
  return groupsStillNeeded(captainGroup, soldPlayers)
    .reduce(function(sum, g) { return sum + (GROUP_BASE[g] || 0); }, 0);
}

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

function warningBadgeHtml(wallet, captainGroup, soldPlayers) {
  var w = budgetWarning(wallet, captainGroup, soldPlayers || []);
  return '<div style="margin-top:8px;padding:7px 12px;border-radius:8px;background:' + w.color + '18;border:1px solid ' + w.color + '55;font-size:13px;font-weight:500;color:' + w.color + ';">' + w.msg + '</div>';
}

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
