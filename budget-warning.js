// ── BPL Dallas Season 2 · Budget Warning ──
// Squad: captain + 5 bids, one from each of the 4 other groups (not own captain_group)
// Base prices by group: 1=500, 2=400, 3=300, 4=200
// Reserve = sum of base prices for groups captain still needs to fill
// Bid increment = 50 pts

const GROUP_BASE = { '1': 500, '2': 400, '3': 300, '4': 200 };
const ALL_GROUPS = ['1', '2', '3', '4'];

// Returns which groups a captain still needs to buy from
// captainGroup: integer or string (their own group — they skip it)
// soldPlayers: array of player objects already on this captain's squad
function groupsStillNeeded(captainGroup, soldPlayers) {
  const ownGroup = String(captainGroup);
  const required = ALL_GROUPS.filter(g => g !== ownGroup); // 3 other groups
  const have = new Set(soldPlayers.map(p => String(p.group_name)));
  return required.filter(g => !have.has(g));
}

// Returns minimum pts captain must keep in reserve to fill remaining required groups
function reserveNeeded(captainGroup, soldPlayers) {
  const needed = groupsStillNeeded(captainGroup, soldPlayers);
  return needed.reduce((sum, g) => sum + (GROUP_BASE[g] || 0), 0);
}

// Main budget warning function
// wallet: current wallet balance
// captainGroup: captain's own player group (1–4)
// soldPlayers: array of player objects already assigned to this captain
function budgetWarning(wallet, captainGroup, soldPlayers) {
  const ownGroup = String(captainGroup);
  const needed = groupsStillNeeded(ownGroup, soldPlayers);
  const reserve = reserveNeeded(ownGroup, soldPlayers);
  const safe = wallet - reserve;
  const slotsLeft = needed.length;

  if (slotsLeft === 0) {
    return { color: 'var(--green)', msg: 'Squad complete — no more bids needed', safe: 0, reserve: 0, needed: [] };
  }
  if (safe <= 0) {
    return { color: 'var(--red)', msg: 'Warning: Over budget reserve!', safe, reserve, needed };
  }
  if (safe <= 200) {
    return { color: 'var(--groupB)', msg: 'Caution: Only ' + safe + ' pts safe to spend', safe, reserve, needed };
  }
  return { color: 'var(--green)', msg: 'Safe to spend: ' + safe + ' pts', safe, reserve, needed };
}

// HTML badge — used in admin and board
function warningBadgeHtml(wallet, captainGroup, soldPlayers) {
  const w = budgetWarning(wallet, captainGroup, soldPlayers || []);
  return '<div style="margin-top:8px;padding:7px 12px;border-radius:8px;background:' + w.color + '18;border:1px solid ' + w.color + '55;font-size:13px;font-weight:500;color:' + w.color + ';">' + w.msg + '</div>';
}

// Can a captain afford to bid nextBid on a player from playerGroup?
// Returns { allowed: bool, reason: string }
function canBid(captain, playerGroup, nextBid, soldPlayers) {
  const ownGroup = String(captain.captain_group);
  const pg = String(playerGroup);

  // Block: cannot bid on own group
  if (pg === ownGroup) {
    return { allowed: false, reason: 'Cannot bid on your own group (Group ' + ownGroup + ')' };
  }

  // Block: squad already has a player from this group
  const alreadyHas = soldPlayers.some(p => String(p.group_name) === pg);
  if (alreadyHas) {
    return { allowed: false, reason: 'Already have a Group ' + pg + ' player' };
  }

  // Block: insufficient wallet
  if (captain.wallet < nextBid) {
    return { allowed: false, reason: 'Insufficient funds (' + captain.wallet + ' pts left)' };
  }

  // Block: next bid would leave less than reserve for remaining required groups
  // After bidding nextBid, the wallet would be captain.wallet - nextBid
  // The remaining reserve is for all groups EXCEPT the one being bid on right now
  const walletAfter = captain.wallet - nextBid;
  const neededAfterThis = groupsStillNeeded(ownGroup, soldPlayers).filter(g => g !== pg);
  const reserveAfterThis = neededAfterThis.reduce((sum, g) => sum + (GROUP_BASE[g] || 0), 0);
  if (walletAfter < reserveAfterThis) {
    return { allowed: false, reason: 'Not enough safe budget. Need ' + reserveAfterThis + ' pts in reserve for remaining groups.' };
  }

  return { allowed: true, reason: '' };
}
