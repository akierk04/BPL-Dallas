// ── BPL Dallas Season 2 · Budget Warning ──
// Squad: captain + 5 bids = 6 total
// Mandatory: 1×G1, 1×G2, 1×G3 (captain fills their own group’s slot)
// Remaining: always 2×G4
// Captain cannot bid on their own group
// Base prices: G1=500, G2=400, G3=300, G4=200
// Bid increment: 50 pts

const GROUP_BASE = { ‘1’: 500, ‘2’: 400, ‘3’: 300, ‘4’: 200 };

// Returns array of group strings still needed, with repeats for G4.
// e.g. G1 captain with nothing bought → [‘2’,‘3’,‘4’,‘4’]
// e.g. G4 captain with G1+G2 bought  → [‘3’,‘4’,‘4’]
function groupsStillNeeded(captainGroup, soldPlayers) {
const own  = String(captainGroup);
const have = (soldPlayers || []).map(p => String(p.group_name));

const stillNeeded = [];

// Mandatory single slots: G1, G2, G3 — skip captain’s own group
const mandatory = [‘1’,‘2’,‘3’].filter(g => g !== own);
const haveList  = [...have];

mandatory.forEach(g => {
const idx = haveList.indexOf(g);
if (idx !== -1) {
haveList.splice(idx, 1); // tick off one mandatory slot
} else {
stillNeeded.push(g);     // still needed
}
});

// G4 slots: always 2 total — count remaining after mandatory ticked off
const g4Covered      = haveList.filter(g => g === ‘4’).length;
const g4StillNeeded  = Math.max(0, 2 - g4Covered);
for (let i = 0; i < g4StillNeeded; i++) stillNeeded.push(‘4’);

return stillNeeded; // length = number of bids still to place
}

// Minimum pts captain must keep in reserve
function reserveNeeded(captainGroup, soldPlayers) {
return groupsStillNeeded(captainGroup, soldPlayers)
.reduce((sum, g) => sum + (GROUP_BASE[g] || 0), 0);
}

// Main budget warning
function budgetWarning(wallet, captainGroup, soldPlayers) {
const needed  = groupsStillNeeded(captainGroup, soldPlayers || []);
const reserve = needed.reduce((s, g) => s + (GROUP_BASE[g] || 0), 0);
const safe    = wallet - reserve;

if (needed.length === 0) {
return { color: ‘var(--green)’, msg: ‘Squad complete — no more bids needed’, safe: 0, reserve: 0, needed: [] };
}
if (safe <= 0) {
return { color: ‘var(--red)’, msg: ‘Warning: Over budget reserve!’, safe, reserve, needed };
}
if (safe <= 200) {
return { color: ‘var(--groupB)’, msg: ‘Caution: Only ’ + safe + ’ pts safe to spend’, safe, reserve, needed };
}
return { color: ‘var(--green)’, msg: ‘Safe to spend: ’ + safe + ’ pts’, safe, reserve, needed };
}

// HTML badge — drop-in for all pages
function warningBadgeHtml(wallet, captainGroup, soldPlayers) {
const w = budgetWarning(wallet, captainGroup, soldPlayers || []);
return ‘<div style="margin-top:8px;padding:7px 12px;border-radius:8px;'
+ 'background:' + w.color + '18;border:1px solid ' + w.color + '55;'
+ 'font-size:13px;font-weight:500;color:' + w.color + ';">’ + w.msg + ‘</div>’;
}

// Bid eligibility check — returns { allowed: bool, reason: string }
function canBid(captain, playerGroup, nextBid, soldPlayers) {
const own = String(captain.captain_group);
const pg  = String(playerGroup);

if (pg === own) {
return { allowed: false, reason: ’Cannot bid on your own group (Group ’ + own + ‘)’ };
}

const needed = groupsStillNeeded(own, soldPlayers);

if (!needed.includes(pg)) {
if ([‘1’,‘2’,‘3’].includes(pg)) {
return { allowed: false, reason: ‘Group ’ + pg + ’ slot already filled (max 1)’ };
}
if (pg === ‘4’) {
return { allowed: false, reason: ‘Both Group 4 slots already filled (max 2)’ };
}
return { allowed: false, reason: ‘Group ’ + pg + ’ not needed’ };
}

if (captain.wallet < nextBid) {
return { allowed: false, reason: ‘Insufficient funds (’ + captain.wallet + ’ pts left)’ };
}

// After bidding, can we still cover remaining reserve?
const walletAfter     = captain.wallet - nextBid;
const neededAfter     = [...needed];
const idx = neededAfter.indexOf(pg);
if (idx !== -1) neededAfter.splice(idx, 1);
const reserveAfter    = neededAfter.reduce((s, g) => s + (GROUP_BASE[g] || 0), 0);
if (walletAfter < reserveAfter) {
return { allowed: false, reason: ‘Not enough safe budget. Need ’ + reserveAfter + ’ pts in reserve for remaining slots.’ };
}

return { allowed: true, reason: ‘’ };
}
