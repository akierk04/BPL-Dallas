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
        if (!isLeagueRound(m.round)) return roundLabel(m.round) + ' · ' + roundMinutes(m.round) + ' min';
        return m.display_order ? `League Stage · Match ${m.display_order}` : 'League Stage';
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
      const html = bracketHtml(allCaptains, allMatches, allTiebreaks);
      if (!html) { if (card) card.style.display = 'none'; return; }
      if (card) card.style.display = 'block';
      container.innerHTML = html;
    }
