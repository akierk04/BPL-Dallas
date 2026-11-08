// Standings, stats, public schedule, knockout bracket, matchday banner
// Extracted from admin.html during Admin refactor.

function renderStandings() {
      document.getElementById('standingsTable').innerHTML = standingsTableHtml(allCaptains, allMatches, allTiebreaks);
      renderTiebreakBanner();
    }

    function renderTiebreakBanner() {
      const el = document.getElementById('tiebreakBanner');
      if (!el) return;
      const rows = computeStandings(allCaptains, allMatches, allTiebreaks);
      const deadlocks = detectDeadlocks(rows, allMatches, allTiebreaks);
      if (!deadlocks.length) { el.innerHTML = ''; el.style.display = 'none'; return; }
      el.style.display = 'block';
      el.innerHTML = deadlocks.map(d => `
        <div style="background:rgba(240,192,64,0.1);border:1px solid rgba(240,192,64,0.4);border-radius:var(--radius);padding:12px 14px;margin-bottom:8px;">
          <div style="font-size:13px;color:var(--accent);font-weight:600;margin-bottom:8px;">
            ⚠ Teams tied on every tiebreaker: ${displayCaptainName(d.teamA)} vs ${displayCaptainName(d.teamB)} — record shootout result
          </div>
          <div style="display:flex;gap:8px;">
            <button class="btn-sm" onclick="resolveTiebreak('${d.teamA.id}','${d.teamB.id}','${d.teamA.id}')" style="width:auto;">${displayCaptainName(d.teamA)} wins</button>
            <button class="btn-sm" onclick="resolveTiebreak('${d.teamA.id}','${d.teamB.id}','${d.teamB.id}')" style="width:auto;">${displayCaptainName(d.teamB)} wins</button>
          </div>
        </div>`).join('');
    }

    async function resolveTiebreak(teamAId, teamBId, winnerId) {
      const { error } = await db.from('tiebreak_results').insert({ team_a: teamAId, team_b: teamBId, winner: winnerId });
      if (error) { alert('Error recording shootout result: ' + error.message); return; }
      await loadData();
    }

    function renderStats() {
      const scorers = computeTopScorers(allPlayers, allGoals, allCaptains, allMatches);
      const el = document.getElementById('topScorers');
      if (el) el.innerHTML = topScorersHtml(scorers);
      const mvps = computeMvpLeaderboard(allPlayers, allMatches, allCaptains);
      const el2 = document.getElementById('mvpLeaderboard');
      if (el2) el2.innerHTML = mvpLeaderboardHtml(mvps, allMatches, allPlayers, allCaptains);
    }

    function renderSchedule() {
      const standings = computeStandings(allCaptains, allMatches, allTiebreaks);
      document.getElementById('adminSchedule').innerHTML = matchScheduleHtml(allMatches, allCaptains, allPlayers, standings);
      renderKnockoutBracket('adminBracket', 'bracketCard');
    }

    function renderKnockoutBracket(containerId, cardId) {
      const container = document.getElementById(containerId);
      const card = cardId ? document.getElementById(cardId) : null;
      if (!container) return;
      const html = bracketHtml(allCaptains, allMatches, allTiebreaks);
      if (!html) { if (card) card.style.display = 'none'; return; }
      if (card) card.style.display = 'block';
      container.innerHTML = html;
    }


    function renderMatchDayBanner() {
      const banner = document.getElementById('matchDayBanner');
      const upcoming = sortMatchesForDisplay(allMatches.filter(m => !m.played));
      if (!upcoming.length) { if(banner) banner.style.display = 'none'; return; }
      if(banner) banner.style.display = 'block';
      const now = upcoming[0], next = upcoming[1] || null;
      function teamLine(m) {
        const h = allCaptains.find(c => c.id === m.home_captain_id);
        const a = allCaptains.find(c => c.id === m.away_captain_id);
        return `${displayCaptainName(h)} vs ${displayCaptainName(a)}`;
      }
      function metaLine(m) {
        if (!isLeagueRound(m.round)) return roundLabel(m.round) + ' · ' + roundMinutes(m.round) + ' min';
        return m.display_order ? `League Stage · Match ${m.display_order}` : 'League Stage';
      }
      document.getElementById('nowPlayingTeams').textContent = teamLine(now);
      document.getElementById('nowPlayingMeta').textContent  = metaLine(now);
      document.getElementById('upNextTeams').textContent     = next ? teamLine(next) : '—';
      document.getElementById('upNextMeta').textContent      = next ? metaLine(next) : 'No more fixtures';
    }

    // The MVP is picked from buttons, the same way goal scorers are. The hidden <select id="mvpPlayer"> still holds the value
    // ('' = not chosen yet, 'none' = no MVP, otherwise a player id or a captain id) so finalizeMatch reads it as before.
    function populateMvpDropdown() {
      const sel = document.getElementById('mvpPlayer');
      if (!sel) return;
      const homeCap = allCaptains.find(c => c.id === pendingHomeId);
      const awayCap = allCaptains.find(c => c.id === pendingAwayId);
      const teamPlayers = allPlayers.filter(p => p.captain_id === pendingHomeId || p.captain_id === pendingAwayId);
      const captainOpts = [homeCap, awayCap].filter(Boolean)
        .map(c => `<option value="${c.id}">${c.name} (C) (${displayCaptainName(c)})</option>`).join('');
      sel.innerHTML = '<option value="">Select MVP (required)...</option><option value="none">No MVP for this game</option>' +
        captainOpts +
        teamPlayers.map(p => {
          const cap = allCaptains.find(c => c.id === p.captain_id);
          return `<option value="${p.id}">${p.name} (${cap ? displayCaptainName(cap) : '?'})</option>`;
        }).join('');
      sel.value = '';
      renderMvpGrid();
    }

    function renderMvpGrid() {
      const grid = document.getElementById('mvpGrid'), sel = document.getElementById('mvpPlayer');
      if (!grid || !sel) return;
      const chosen = sel.value;
      function btn(id, label, isCap) {
        const on = chosen === id;
        return '<button type="button" data-mvp="' + id + '" onclick="pickMvp(this.dataset.mvp)" style="width:100%;text-align:left;'
          + 'background:' + (on ? 'rgba(240,192,64,0.14)' : 'var(--surface2)') + ';border:1px solid ' + (on ? 'var(--accent)' : 'var(--border)') + ';border-radius:8px;'
          + 'padding:9px 12px;cursor:pointer;font-family:var(--font-body);font-size:13px;color:var(--text);display:flex;align-items:center;justify-content:space-between;">'
          + '<span>' + label + (isCap ? ' <span style="font-size:10px;color:#888;">(C)</span>' : '') + '</span>'
          + (on ? '<span style="color:var(--accent);">&#11088;</span>' : '') + '</button>';
      }
      function col(capId) {
        const cap = allCaptains.find(c => c.id === capId);
        if (!cap) return '<div class="text-muted">—</div>';
        return btn(cap.id, cap.name, true)
          + allPlayers.filter(p => p.captain_id === capId && p.is_sold).map(p => btn(p.id, p.name, false)).join('');
      }
      const homeCap = allCaptains.find(c => c.id === pendingHomeId), awayCap = allCaptains.find(c => c.id === pendingAwayId);
      const lbl = c => '<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);margin-bottom:8px;font-weight:500;">' + (c ? displayCaptainName(c) : '—') + '</div>';
      grid.innerHTML = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">'
        + '<div>' + lbl(homeCap) + '<div style="display:flex;flex-direction:column;gap:6px;">' + col(pendingHomeId) + '</div></div>'
        + '<div>' + lbl(awayCap) + '<div style="display:flex;flex-direction:column;gap:6px;">' + col(pendingAwayId) + '</div></div>'
        + '</div>'
        + '<div style="margin-top:8px;">' + btn('none', 'No MVP for this game', false) + '</div>';
    }

    function pickMvp(id) {
      const sel = document.getElementById('mvpPlayer');
      if (!sel) return;
      sel.value = sel.value === id ? '' : id;   // tap again to un-pick
      renderMvpGrid();
      const msg = document.getElementById('scorerMsg');
      if (msg) msg.textContent = '';
    }
