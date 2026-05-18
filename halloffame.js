// Captain overview cards and roster display
// Extracted from admin.html during Admin refactor.

function renderOverview() {
      const grid = document.getElementById('adminCaptainsGrid');
      if (!allCaptains.length) { grid.innerHTML = '<div class="text-muted">No captains found.</div>'; return; }
      grid.innerHTML = allCaptains.map(c => {
        const roster = allPlayers.filter(p => p.captain_id === c.id);
        const spent = roster.reduce((s, p) => s + (p.sold_price || 0), 0);
        const rHtml = roster.length
          ? roster.map(p => `
              <div class="roster-player">
                <span class="roster-player-name">${p.name}</span>
                <div style="display:flex;align-items:center;gap:6px;">
                  <span class="roster-player-price">${p.sold_price} pts</span>
                  <button class="btn-danger" onclick="unassignPlayer('${p.id}','${c.id}',${p.sold_price})">✕</button>
                </div>
              </div>`).join('')
          : '<div class="roster-empty">No players yet</div>';
        return `
          <div class="captain-card">
            <div class="captain-card-header">
              <div style="width:100%;">
                <div style="display:flex;gap:20px;margin-bottom:10px;">
                  <div><div class="captain-wallet-label">Purse left</div>
                    <div class="captain-wallet">${c.wallet.toLocaleString()} <span style="font-size:0.75rem;color:var(--muted)">pts</span></div></div>
                  <div><div class="captain-wallet-label">Spent</div>
                    <div class="captain-wallet" style="color:var(--muted)">${spent.toLocaleString()} <span style="font-size:0.75rem;">pts</span></div></div>
                </div>
                <div style="display:flex;flex-direction:column;gap:6px;">
                  <div>
                    <div class="captain-wallet-label" style="margin-bottom:3px;">Captain Name</div>
                    <div style="display:flex;gap:6px;">
                      <input type="text" value="${c.name || ''}" id="cname-${c.id}"
                        style="flex:1;font-size:13px;padding:6px 10px;border-radius:6px;background:var(--surface2);border:1px solid var(--border);color:var(--text);font-family:var(--font-body);" />
                      <button class="btn-sm" onclick="saveCaptainField('${c.id}','name','cname-${c.id}')" style="width:auto;padding:6px 10px;">Save</button>
                    </div>
                  </div>
                  <div>
                    <div class="captain-wallet-label" style="margin-bottom:3px;">Team Name</div>
                    <div style="display:flex;gap:6px;">
                      <input type="text" value="${c.team_name || ''}" id="tname-${c.id}" placeholder="e.g. Lone Star United FC"
                        style="flex:1;font-size:13px;padding:6px 10px;border-radius:6px;background:var(--surface2);border:1px solid var(--border);color:var(--text);font-family:var(--font-body);" />
                      <button class="btn-sm" onclick="saveCaptainField('${c.id}','team_name','tname-${c.id}')" style="width:auto;padding:6px 10px;">Save</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="team-roster">${rHtml}</div>
          </div>`;
      }).join('');
    }
