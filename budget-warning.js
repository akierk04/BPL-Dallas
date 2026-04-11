// Shared budget warning logic
// Each captain needs 4 players total:
//   - Exactly 1 must be Group X (base 150 pts)
//   - The remaining 3 are Group Y (base 50 pts)
// Reserve = (150 pts if no Group X yet) + (50 pts × remaining Y slots)
// Safe to spend = Wallet - reserve (excluding the current slot being bid on)

function budgetWarning(wallet, playersBought, hasGroupX) {
  const remaining = 4 - playersBought;

  if (remaining === 0) return { color: 'var(--green)', msg: 'Full team — no more bids needed', safe: 0 };

  // How many Y slots still needed after this bid
  const xReserve  = hasGroupX ? 0 : 150;          // must still buy a Group X
  const ySlots    = hasGroupX ? remaining - 1 : remaining - 2; // remaining Y slots after current bid
  const yReserve  = Math.max(0, ySlots) * 50;
  const reserve   = xReserve + yReserve;
  const safe      = wallet - reserve;

  if (safe <= 0)   return { color: 'var(--red)',    msg: `Warning: Over budget reserve!`, safe };
  if (safe <= 150) return { color: 'var(--groupX)', msg: `Caution: Only ${safe} pts safe to spend`, safe };
  return               { color: 'var(--green)',   msg: `Safe to spend: ${safe} pts`, safe };
}

function warningBadgeHtml(wallet, playersBought, hasGroupX) {
  const w = budgetWarning(wallet, playersBought, hasGroupX);
  let extra = '';
  if (!hasGroupX && playersBought < 4) {
    extra = `<div style="margin-top:6px;padding:5px 12px;border-radius:8px;background:rgba(240,192,64,0.1);border:1px solid rgba(240,192,64,0.3);font-size:12px;color:var(--groupX);">⚠️ Must still buy 1 Group X player (150 pts min)</div>`;
  }
  return `<div style="margin-top:8px;padding:7px 12px;border-radius:8px;background:${w.color}18;border:1px solid ${w.color}55;font-size:13px;font-weight:500;color:${w.color};">${w.msg}</div>${extra}`;
}
