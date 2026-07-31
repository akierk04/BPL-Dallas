// Standings, stats, public schedule, knockout bracket, matchday banner
// Extracted from admin.html during Admin refactor.

function renderStandings() {
      document.getElementById('standingsTable').innerHTML = standingsTableHtml(allCaptains, allMatches);
    }

    function renderStats() {
      const scorers = computeTopScorers(allPlayers, allGoals, allCaptains);
      const el = document.getElementById('topScorers');
      if (el) el.innerHTML = topScorersHtml(scorers);
      const mvps = computeMvpLeaderboard(allPlayers, allMatches);
      const el2 = document.getElementById('mvpLeaderboard');
      if (el2) el2.innerHTML = mvpLeaderboardHtml(mvps, allMatches, allPlayers, allCaptains);
    }

    function renderSchedule() {
      const standings = computeStandings(allCaptains, allMatches);
      document.getElementById('adminSchedule').innerHTML = matchScheduleHtml(allMatches, allCaptains, allPlayers, standings);
      renderKnockoutBracket('adminBracket', 'bracketCard');
    }

    function renderKnockoutBracket(containerId, cardId) {
      const container = document.getElementById(containerId);
      const card = cardId ? document.getElementById(cardId) : null;
      if (!container) return;

      const KO_ALL = ['QF1','QF2','QF3','QF4','SF1','SF2','Final'];
      const ko = allMatches.filter(m => KO_ALL.includes(m.round));
      if (!ko.length) { if (card) card.style.display = 'none'; return; }
      if (card) card.style.display = 'block';

      const standings = computeStandings(allCaptains, allMatches);
      function seed(i) { return standings[i]?.captain || null; }
      function getMatch(r) { return ko.find(m => m.round === r) || null; }
      function getWinner(m) {
        if (!m || !m.played) return null;
        return allCaptains.find(c => c.id === (m.home_score > m.away_score ? m.home_captain_id : m.away_captain_id));
      }

      function bm(m, homeC, awayC, label) {
        const played = m && m.played;
        const live = m && !m.played && (m.home_captain_id || homeC) && (m.away_captain_id || awayC);
        const actualHome = played ? allCaptains.find(c => c.id === m.home_captain_id) : homeC;
        const actualAway = played ? allCaptains.find(c => c.id === m.away_captain_id) : awayC;
        const homeN = actualHome ? displayCaptainName(actualHome) : (homeC ? displayCaptainName(homeC) : 'TBD');
        const awayN = actualAway ? displayCaptainName(actualAway) : (awayC ? displayCaptainName(awayC) : 'TBD');
        const homeWon = played && m.home_score > m.away_score;
        const awayWon = played && m.away_score > m.home_score;
        const cls = played ? 'winner' : live ? 'live' : '';
        return `<div class="bracket-match ${cls}">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);margin-bottom:5px;">${label}</div>
          <div class="bracket-team ${played?(homeWon?'won':'lost'):(actualHome?'':'tbd')}">
            <span>${homeN}</span>${played?`<span class="bracket-score">${m.home_score}</span>`:''}
          </div>
          <div class="bracket-team ${played?(awayWon?'won':'lost'):(actualAway?'':'tbd')}">
            <span>${awayN}</span>${played?`<span class="bracket-score">${m.away_score}</span>`:''}
          </div>
        </div>`;
      }

      const qf1=getMatch('QF1'), qf2=getMatch('QF2'), qf3=getMatch('QF3'), qf4=getMatch('QF4');
      const sf1=getMatch('SF1'), sf2=getMatch('SF2');
      const fin=getMatch('Final');

      let html = '<div class="bracket-wrap">';

      if (qf1||qf2||qf3||qf4) {
        html += `<div class="bracket-round"><div class="bracket-round-title">Quarterfinals</div>
          ${bm(qf1, seed(0), seed(7), 'QF1 · 1 vs 8')}
          ${bm(qf2, seed(1), seed(6), 'QF2 · 2 vs 7')}
          ${bm(qf3, seed(2), seed(5), 'QF3 · 3 vs 6')}
          ${bm(qf4, seed(3), seed(4), 'QF4 · 4 vs 5')}
        </div><div class="bracket-connector"><div class="bracket-connector-line"></div></div>`;
      }

      if (sf1||sf2) {
        html += `<div class="bracket-round"><div class="bracket-round-title">Semifinals</div>
          ${bm(sf1, getWinner(qf1), getWinner(qf4), 'SF1 · W(QF1) vs W(QF4)')}
          ${bm(sf2, getWinner(qf2), getWinner(qf3), 'SF2 · W(QF2) vs W(QF3)')}
        </div><div class="bracket-connector"><div class="bracket-connector-line"></div></div>`;
      }

      html += `<div class="bracket-round"><div class="bracket-round-title">🏆 Final</div>
        ${bm(fin, getWinner(sf1), getWinner(sf2), 'Final')}
      </div></div>`;

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
        const base = isLeagueRound(m.round) ? 'League Stage' : (m.round || 'Fixture');
        return m.display_order ? `${base} · Match ${m.display_order}` : base;
      }
      document.getElementById('nowPlayingTeams').textContent = teamLine(now);
      document.getElementById('nowPlayingMeta').textContent  = metaLine(now);
      document.getElementById('upNextTeams').textContent     = next ? teamLine(next) : '—';
      document.getElementById('upNextMeta').textContent      = next ? metaLine(next) : 'No more fixtures';
    }

    function populateMvpDropdown() {
      const sel = document.getElementById('mvpPlayer');
      if (!sel) return;
      const homeCap = allCaptains.find(c => c.id === pendingHomeId);
      const awayCap = allCaptains.find(c => c.id === pendingAwayId);
      const teamPlayers = allPlayers.filter(p => p.captain_id === pendingHomeId || p.captain_id === pendingAwayId);
      const captainOpts = [homeCap, awayCap].filter(Boolean)
        .map(c => `<option value="${c.id}">${c.name} (C) (${displayCaptainName(c)})</option>`).join('');
      sel.innerHTML = '<option value="">Select MVP (optional)...</option>' +
        captainOpts +
        teamPlayers.map(p => {
          const cap = allCaptains.find(c => c.id === p.captain_id);
          return `<option value="${p.id}">${p.name} (${cap ? displayCaptainName(cap) : '?'})</option>`;
        }).join('');
    }
