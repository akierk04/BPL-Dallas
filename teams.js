function renderTeams() {
      const grid = document.getElementById('boardTeamsGrid');
      if (!allCaptains.length) { grid.innerHTML = '<div class="text-muted">No teams yet.</div>'; return; }
      const sorted = [...allCaptains].sort((a, b) => a.name.localeCompare(b.name));
      grid.innerHTML = sorted.map(c => {
        const roster = allPlayers.filter(p => p.captain_id === c.id && p.is_sold);
        const teamName = displayTeamName(c.team_name || c.name);
        const playersHtml = roster.length
          ? roster.map(p =>
              '<div class="board-player-row" style="border-bottom:0.5px solid var(--border);padding:7px 0;">' +
              '<span class="board-player-name">' + p.name + '</span>' +
              '</div>'
            ).join('')
          : '<div class="board-empty">No players signed yet</div>';
        return '<div class="board-captain-card">' +
          '<div class="board-captain-header" style="padding-bottom:12px;">' +
          '<div style="flex:1;min-width:0;">' +
          '<div style="font-family:var(--font-display);font-size:1.5rem;letter-spacing:0.06em;color:var(--text);line-height:1;">' + teamFlag(teamName) + ' ' + teamName + '</div>' +
          '<div style="font-size:13px;color:var(--muted);margin-top:4px;">' + c.name + ' <span style="color:var(--accent);font-weight:600;">(C)</span></div>' +
          '</div></div>' +
          '<div class="board-roster" style="padding-top:4px;">' + playersHtml + '</div>' +
          '</div>';
      }).join('');
    }
