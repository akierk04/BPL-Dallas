function renderBoardStandings() {
      renderBoardMatchDayBanner();
      document.getElementById('boardStandings').innerHTML = standingsTableHtml(allCaptains, allMatches, allTiebreaks);
    }

    function renderBoardMatchDayBanner() {
      const banner = document.getElementById('boardMatchDayBanner');
      const upcoming = [...allMatches]
        .filter(m => !m.played)
        .sort((a, b) => {
          const av = Number(a.display_order), bv = Number(b.display_order);
          const an = Number.isNaN(av) ? 9999 : av, bn = Number.isNaN(bv) ? 9999 : bv;
          if (an !== bn) return an - bn;
          return new Date(a.created_at||0) - new Date(b.created_at||0);
        });
      if (!upcoming.length) { banner.style.display = 'none'; return; }
      banner.style.display = 'block';
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
      document.getElementById('boardNowPlayingTeams').textContent = teamLine(now);
      document.getElementById('boardNowPlayingMeta').textContent  = metaLine(now);
      document.getElementById('boardUpNextTeams').textContent     = next ? teamLine(next) : '—';
      document.getElementById('boardUpNextMeta').textContent      = next ? metaLine(next) : 'No more fixtures';
    }

    function renderBoardStats() {
      const scorers=computeTopScorers(allPlayers,allGoals,allCaptains);
      document.getElementById('boardTopScorers').innerHTML=topScorersHtml(scorers);
      const mvps=computeMvpLeaderboard(allPlayers,allMatches);
      document.getElementById('boardMvp').innerHTML=mvpLeaderboardHtml(mvps,allMatches,allPlayers,allCaptains);
    }

    function renderBoardSchedule() {
      const standings = computeStandings(allCaptains, allMatches, allTiebreaks);
      document.getElementById('boardSchedule').innerHTML = matchScheduleHtml(allMatches, allCaptains, allPlayers, standings);
      renderBoardBracket();
    }

    function renderBoardBracket() {
      const container = document.getElementById('boardBracket');
      const card = document.getElementById('boardBracketCard');
      if (!container) return;

      const KO_ALL = ['QF1','QF2','QF3','QF4','SF1','SF2','Final'];
      const ko = allMatches.filter(m => KO_ALL.includes(m.round));
      if (!ko.length) { if (card) card.style.display = 'none'; return; }
      if (card) card.style.display = 'block';

      const standings = computeStandings(allCaptains, allMatches, allTiebreaks);
      function seed(i) { return standings[i]?.captain || null; }
      function getMatch(r) { return ko.find(m => m.round === r) || null; }
      function getWinner(m) {
        if (!m || !m.played) return null;
        return allCaptains.find(c => c.id === (m.home_score > m.away_score ? m.home_captain_id : m.away_captain_id));
      }

      function bm(m, homeC, awayC, label) {
        const played = m && m.played;
        const live = m && !m.played && (m?.home_captain_id || homeC) && (m?.away_captain_id || awayC);
        const homeN = (played ? allCaptains.find(c=>c.id===m.home_captain_id) : homeC) ? displayCaptainName(played ? allCaptains.find(c=>c.id===m.home_captain_id) : homeC) : 'TBD';
        const awayN = (played ? allCaptains.find(c=>c.id===m.away_captain_id) : awayC) ? displayCaptainName(played ? allCaptains.find(c=>c.id===m.away_captain_id) : awayC) : 'TBD';
        const homeWon = played && m.home_score > m.away_score;
        const awayWon = played && m.away_score > m.home_score;
        const cls = played ? 'winner' : live ? 'live' : '';
        return `<div class="bracket-match ${cls}">
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);margin-bottom:5px;">${label}</div>
          <div class="bracket-team ${played?(homeWon?'won':'lost'):((homeC||m?.home_captain_id)?'':'tbd')}">
            <span>${homeN}</span>${played?`<span class="bracket-score">${m.home_score}</span>`:''}
          </div>
          <div class="bracket-team ${played?(awayWon?'won':'lost'):((awayC||m?.away_captain_id)?'':'tbd')}">
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
