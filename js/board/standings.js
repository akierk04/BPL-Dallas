function renderBoardStandings() {
      renderBoardMatchDayBanner();
      document.getElementById('boardStandings').innerHTML = standingsTableHtml(allCaptains, allMatches, allTiebreaks);
      const prev = document.getElementById('boardSeedPreview');
      if (prev) prev.innerHTML = seedPreviewHtml(allCaptains, allMatches, allTiebreaks);
    }

    // Unplayed games in running order (same ordering the schedule uses).
    function upcomingMatches() {
      return [...allMatches]
        .filter(m => !m.played)
        .sort((a, b) => {
          const av = Number(a.display_order), bv = Number(b.display_order);
          const an = Number.isNaN(av) ? 9999 : av, bn = Number.isNaN(bv) ? 9999 : bv;
          if (an !== bn) return an - bn;
          return new Date(a.created_at||0) - new Date(b.created_at||0);
        });
    }

    function renderBoardMatchDayBanner() {
      const banner = document.getElementById('boardMatchDayBanner');
      if (!banner) return;
      const upcoming = upcomingMatches();
      // Only once the auction is over: during the auction nobody needs a game strip.
      if (!upcoming.length || (typeof auctionInProgress === 'function' && auctionInProgress())) { banner.style.display = 'none'; return; }
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
      const chips = document.getElementById('bracketChips');
      if (!container) return;
      const html = bracketHtml(allCaptains, allMatches, allTiebreaks, { provisional: true });
      container.innerHTML = html || '<div class="text-muted" style="padding:14px 4px;">The bracket appears after the first prelim result.</div>';
      if (chips) chips.style.display = html ? 'flex' : 'none';
    }
