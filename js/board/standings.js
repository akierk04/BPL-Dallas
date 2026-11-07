function renderBoardStandings() {
      renderBoardMatchDayBanner();
      renderMyTeamBar();
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

    // "My team" picker + "your next game" line. Per phone, same stored choice as the auction pin.
    function renderMyTeamBar() {
      const bar = document.getElementById('myTeamBar'), sel = document.getElementById('myTeamSelect'), line = document.getElementById('myNextLine');
      if (!bar || !sel || !line) return;
      if (!allCaptains.length || (typeof auctionInProgress === 'function' && auctionInProgress())) { bar.style.display = 'none'; return; }
      bar.style.display = 'block';
      const teams = [...allCaptains].sort((a, b) => displayCaptainName(a).localeCompare(displayCaptainName(b)));
      const key = teams.map(c => c.id + displayCaptainName(c)).join('|');
      if (sel.getAttribute('data-key') !== key) {
        sel.innerHTML = '<option value="">Pick your team</option>' + teams.map(c => '<option value="' + c.id + '">' + displayCaptainName(c) + '</option>').join('');
        sel.setAttribute('data-key', key);
      }
      sel.value = pinnedCaptainId && teams.some(c => c.id === pinnedCaptainId) ? pinnedCaptainId : '';
      const my = sel.value;
      if (!my) { line.textContent = 'Pick your team to highlight it and see your next game.'; return; }
      const ups = upcomingMatches();
      const i = ups.findIndex(m => m.home_captain_id === my || m.away_captain_id === my);
      if (i === -1) { line.textContent = 'No more games scheduled for your team.'; return; }
      const m = ups[i], oppId = m.home_captain_id === my ? m.away_captain_id : m.home_captain_id;
      const opp = allCaptains.find(c => c.id === oppId);
      const vs = 'vs ' + (opp ? displayCaptainName(opp) : 'TBD');
      line.textContent = i === 0 ? 'You are up now: ' + vs
        : i === 1 ? 'You are up next: ' + vs
        : 'Your next game: ' + vs + ' (' + i + ' games before yours)';
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
