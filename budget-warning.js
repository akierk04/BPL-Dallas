// Shared budget warning logic
// Each captain needs 4 players total. Minimum cost per remaining slot = 50 pts.

function budgetWarning(wallet, playersBought) {
  const remaining = 4 - playersBought;
  const reserve   = remaining * 50;
  const safe      = wallet - reserve;

  if (remaining === 0) return { color: 'var(--green)', msg: 'Full team — no more bids needed', safe: 0 };
  if (safe <= 0)  return { color: 'var(--red)',   msg: `Warning: Over budget reserve!`, safe };
  if (safe <= 200) return { color: 'var(--groupB)', msg: `Caution: Only ${safe} pts safe to spend`, safe };
  return              { color: 'var(--green)',  msg: `Safe to spend: ${safe} pts`, safe };
}

function warningBadgeHtml(wallet, playersBought) {
  const w = budgetWarning(wallet, playersBought);
  return `<div style="margin-top:8px;padding:7px 12px;border-radius:8px;background:${w.color}18;border:1px solid ${w.color}55;font-size:13px;font-weight:500;color:${w.color};">${w.msg}</div>`;
}
