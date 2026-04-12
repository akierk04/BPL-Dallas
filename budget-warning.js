// Shared budget warning logic — dynamic slots
// Default squad: 4 slots (exactly 1 must be Group X, rest Group Y)
// Tentative bonus: if a captain owns a tentative player, squad = 5 slots
//
// Reserve calculation (excluding the current slot being bid on):
//   xReserve  = 150 if no Group X owned yet
//   ySlots    = remaining Y slots AFTER this bid
//   yReserve  = 50 × max(0, ySlots)
//   safe      = wallet - xReserve - yReserve

function budgetWarning(wallet, playersBought, hasGroupX, hasTentative) {
  const totalSlots = hasTentative ? 5 : 4;
  const remaining  = totalSlots - playersBought;

  if (remaining <= 0) return { color: 'var(--green)', msg: 'Full team — no more bids needed', safe: 0 };

  const xReserve = hasGroupX ? 0 : 150;
  // Y slots still needed after this (current) bid:
  // If we have X: all remaining-1 are Y
  // If we don't have X: remaining-2 are Y (one slot goes to X which is already in xReserve)
  const ySlots   = hasGroupX ? remaining - 1 : remaining - 2;
  const yReserve = Math.max(0, ySlots) * 50;
  const reserve  = xReserve + yReserve;
  const safe     = wallet - reserve;

  if (safe <= 0)   return { color: 'var(--red)',    msg: `Warning: Over budget reserve!`,           safe };
  if (safe <= 150) return { color: 'var(--groupX)', msg: `Caution: Only ${safe} pts safe to spend`, safe };
  return               { color: 'var(--green)',   msg: `Safe to spend: ${safe} pts`,              safe };
}

function warningBadgeHtml(wallet, playersBought, hasGroupX, hasTentative) {
  const w = budgetWarning(wallet, playersBought, hasGroupX, hasTentative);
  const totalSlots = hasTentative ? 5 : 4;
  const remaining  = totalSlots - playersBought;
  let extra = '';
  if (!hasGroupX && remaining > 0) {
    extra = `<div style="margin-top:6px;padding:5px 12px;border-radius:8px;background:rgba(240,192,64,0.1);border:1px solid rgba(240,192,64,0.3);font-size:12px;color:var(--groupX);">⚠️ Must still buy 1 Group X player (150 pts min)</div>`;
  }
  return `<div style="margin-top:8px;padding:7px 12px;border-radius:8px;background:${w.color}18;border:1px solid ${w.color}55;font-size:13px;font-weight:500;color:${w.color};">${w.msg}</div>${extra}`;
}
