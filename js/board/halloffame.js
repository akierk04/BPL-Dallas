function renderHallOfFame() {
      var wrap = document.getElementById('boardHallOfFame');
      if (!wrap) return;

      if (!allHallOfFame.length) {
        wrap.innerHTML = '<div class="text-muted">No Hall of Fame records yet.</div>';
        return;
      }

      function pick(row, keys) {
        for (var i = 0; i < keys.length; i++) {
          if (row[keys[i]] !== undefined && row[keys[i]] !== null && row[keys[i]] !== '') return row[keys[i]];
        }
        return '—';
      }

      wrap.innerHTML = allHallOfFame.map(function(row) {
        var season = pick(row, ['season', 'season_no', 'year']);
        var champion = pick(row, ['champion', 'champion_team', 'winner', 'winning_team']);
        var runnerUp = pick(row, ['runner_up', 'runnerup', 'finalist', 'runner_up_team']);
        var topScorer = pick(row, ['top_scorer', 'golden_boot', 'top_scorer_name']);
        var mvp = pick(row, ['mvp', 'most_valuable_player', 'mvp_name']);

        return `
          <div class="recent-sale-row" style="padding:14px 0;">
            <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap;">
              <div>
                <div style="font-family:var(--font-display);font-size:1.7rem;letter-spacing:0.06em;color:var(--accent);line-height:1;">Season ${season}</div>
                <div style="font-size:12px;color:var(--muted);margin-top:4px;">BPL Dallas Hall of Fame</div>
              </div>
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:var(--green);font-weight:700;">🏆 Archived</div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-top:14px;">
              <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius);padding:12px;">
                <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);">Champion</div>
                <div style="font-weight:700;color:var(--text);margin-top:4px;">${champion}</div>
              </div>
              <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius);padding:12px;">
                <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);">Runner Up</div>
                <div style="font-weight:700;color:var(--text);margin-top:4px;">${runnerUp}</div>
              </div>
              <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius);padding:12px;">
                <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);">Top Scorer</div>
                <div style="font-weight:700;color:var(--text);margin-top:4px;">${topScorer}</div>
              </div>
              <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius);padding:12px;">
                <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);">MVP</div>
                <div style="font-weight:700;color:var(--text);margin-top:4px;">${mvp}</div>
              </div>
            </div>
          </div>`;
      }).join('');
    }
