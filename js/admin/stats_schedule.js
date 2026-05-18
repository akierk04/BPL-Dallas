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

      const KO_ALL = ['S8A','S8B','S8C','S8D','S4A','S4B','SF1_L1','SF1_L2','SF2_L1','SF2_L2','Final'];
      const ko = allMatches.filter(m => KO_ALL.includes(m.round));
      if (!ko.length) { if (card) card.style.display = 'none'; return; }
      if (card) card.style.display = 'block';

      const { groupA, groupB } = computeStandings(allCaptains, allMatches);
      function seedA(i) { return groupA[i]?.captain || null; }
      function seedB(i) { return groupB[i]?.captain || null; }
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

      function sfBm(sfPrefix, label) {
        const agg = computeSfAggregate(allMatches, allCaptains, sfPrefix);
        if (!agg) return `<div class="bracket-match"><div style="font-size:9px;color:var(--muted);">${label}</div><div class="bracket-team tbd">TBD</div><div class="bracket-team tbd">TBD</div></div>`;
        const homeC = allCaptains.find(c => c.id === agg.homeId);
        const awayC = allCaptains.find(c => c.id === agg.awayId);
        const homeN = homeC ? displayCaptainName(homeC) : 'TBD';
        const awayN = awayC ? displayCaptainName(awayC) : 'TBD';
        const done = agg.bothPlayed;
        const homeWon = done && agg.homeAgg > agg.awayAgg;
        const awayWon = done && agg.awayAgg > agg.homeAgg;
        const cls = done ? 'winner' : (agg.l1 || agg.l2) ? 'live' : '';
        const aggLine = done ? `<div style="font-size:10px;color:var(--muted);margin-top:4px;text-align:center;">Agg ${agg.homeAgg}–${agg.awayAgg}</div>` : '';
        return `<div class="bracket-match ${cls}">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);margin-bottom:5px;">${label}</div>
          <div class="bracket-team ${done?(homeWon?'won':'lost'):(homeC?'':'tbd')}">
            <span>${homeN}</span>${done?`<span class="bracket-score">${agg.homeAgg}</span>`:''}
          </div>
          <div class="bracket-team ${done?(awayWon?'won':'lost'):(awayC?'':'tbd')}">
            <span>${awayN}</span>${done?`<span class="bracket-score">${agg.awayAgg}</span>`:''}
          </div>
          ${aggLine}
        </div>`;
      }

      const s8a=getMatch('S8A'),s8b=getMatch('S8B'),s8c=getMatch('S8C'),s8d=getMatch('S8D');
      const s4a=getMatch('S4A'),s4b=getMatch('S4B');
      const fin=getMatch('Final');
      const sf1W = computeSfAggregate(allMatches,allCaptains,'SF1')?.winner||null;
      const sf2W = computeSfAggregate(allMatches,allCaptains,'SF2')?.winner||null;

      let html = '<div class="bracket-wrap">';

      if (s8a||s8b||s8c||s8d) {
        html += `<div class="bracket-round"><div class="bracket-round-title">Super 8</div>
          ${bm(s8a, seedA(1), seedB(4), 'S8A')}
          ${bm(s8b, seedB(1), seedA(4), 'S8B')}
          ${bm(s8c, seedA(2), seedB(3), 'S8C')}
          ${bm(s8d, seedB(2), seedA(3), 'S8D')}
        </div><div class="bracket-connector"><div class="bracket-connector-line"></div></div>`;
      }

      if (s4a||s4b) {
        html += `<div class="bracket-round"><div class="bracket-round-title">Super 4</div>
          ${bm(s4a, getWinner(s8a), getWinner(s8d), 'S4A')}
          ${bm(s4b, getWinner(s8b), getWinner(s8c), 'S4B')}
        </div><div class="bracket-connector"><div class="bracket-connector-line"></div></div>`;
      }

      const sfAny = allMatches.some(m => ['SF1_L1','SF1_L2','SF2_L1','SF2_L2'].includes(m.round));
      if (sfAny) {
        html += `<div class="bracket-round"><div class="bracket-round-title">Semi-Finals</div>
          ${sfBm('SF1','SF1')}
          ${sfBm('SF2','SF2')}
        </div><div class="bracket-connector"><div class="bracket-connector-line"></div></div>`;
      }

      html += `<div class="bracket-round"><div class="bracket-round-title">🏆 Final</div>
        ${bm(fin, sf1W, sf2W, 'Final')}
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
        const isLeague = ['A','B'].includes(String(m.round));
        const base = isLeague ? `Group ${m.round}` : (m.round || 'Fixture');
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
