let allCaptains=[], allPlayers=[], allMatches=[], allGoals=[], allPayments=[], paymentSummary=[], topPayers=[], allHallOfFame=[], currentFilter='all', currentPlayerId=null, bidState=null, allTiebreaks=[], duesSpent=0;
    let activeBoardTab='auction';
    let duesLoaded=false, hallOfFameLoaded=false;

    function displayCaptainName(c) { return c ? (c.team_name || c.name) : '—'; }

    function teamFlag(teamName) {

    var flags = {
      Spain: 'es',
      Croatia: 'hr',
      Germany: 'de',
      Netherlands: 'nl',
      France: 'fr',
      India: 'in',
      Brazil: 'br',
      England: 'gb-eng',
      Argentina: 'ar',
      Portugal: 'pt'
    };

    var code = flags[teamName];
  
    if (!code) return '';
  
    return '<img src="https://flagcdn.com/28x21/' + code + '.png" ' +
           'style="width:22px;height:16px;object-fit:cover;border-radius:2px;' +
           'vertical-align:middle;margin-right:10px;box-shadow:0 0 0 1px rgba(255,255,255,0.08)">';
  }

    function displayTeamName(teamName) {
      return teamName === 'North Korea' ? 'India' : teamName;
    }

    let previousSoldState = new Map();
    let lastSoldEvent = null;
    let previousBidValue = 0;
    let previousBidPlayerId = null;
    let previousSoldKey = '';
    

    const BTABS=['auction','standings','stats','schedule','teams','dues','hall'];

    function switchBoardTab(tab) {
      activeBoardTab = tab;
      BTABS.forEach(t=>document.getElementById('btab-'+t).style.display=t===tab?'block':'none');
      document.querySelectorAll('.tab').forEach((el,i)=>el.classList.toggle('active',BTABS[i]===tab));

      // Lazy-load heavier/static tabs only when opened.
      if (tab === 'dues') loadDuesData();
      if (tab === 'hall') loadHallOfFameData();
    }

    // Season 4: while the auction is running (or has not started), the only tab people need is
    // Auction, so the tab bar is hidden. Once every player is sold the bar comes back, but only
    // with the tabs listed in TABS_AFTER_AUCTION (rosters, fixtures, standings, stats). Dues and Hall of
    // Fame stay hidden; add their names to the list to bring them back for match day.
    // Set HIDE_TABS_DURING_AUCTION to false to always show every tab.
    var HIDE_TABS_DURING_AUCTION = true;
    var TABS_AFTER_AUCTION = ['auction', 'standings', 'stats', 'schedule', 'teams'];
    function applyTabVisibility() {
      var bar = document.querySelector('.tabs');
      if (!bar) return;
      var inAuction = HIDE_TABS_DURING_AUCTION && typeof auctionInProgress === 'function' && auctionInProgress();
      bar.style.display = inAuction ? 'none' : '';
      document.querySelectorAll('.tabs .tab').forEach(function(btn) {
        var name = btn.getAttribute('data-tab');
        btn.style.display = (HIDE_TABS_DURING_AUCTION && TABS_AFTER_AUCTION.indexOf(name) === -1) ? 'none' : '';
      });
      var allowed = !HIDE_TABS_DURING_AUCTION || TABS_AFTER_AUCTION.indexOf(activeBoardTab) !== -1;
      if ((inAuction && activeBoardTab !== 'auction') || !allowed) switchBoardTab('auction');
      if (typeof renderBoardMatchDayBanner === 'function') renderBoardMatchDayBanner();
    }

    // Per-phone view preferences. Nothing here is sent to the server.
    var poolSearch = '';
    var pinnedCaptainId = null;
    try { pinnedCaptainId = localStorage.getItem('bplPinnedCaptain') || null; } catch (e) {}
    function togglePin(id) {
      pinnedCaptainId = pinnedCaptainId === id ? null : id;
      try {
        if (pinnedCaptainId) localStorage.setItem('bplPinnedCaptain', pinnedCaptainId);
        else localStorage.removeItem('bplPinnedCaptain');
      } catch (e) {}
      renderBudgetBoard();
      renderCaptains();
    }
    function pinFirst(rows, idOf) {
      if (!pinnedCaptainId) return rows;
      return rows.filter(function(r) { return idOf(r) === pinnedCaptainId; })
        .concat(rows.filter(function(r) { return idOf(r) !== pinnedCaptainId; }));
    }
    // Watchlist: stars and an optional private limit per player, kept on this phone only (never sent to the server).
    var watchlist = {};
    try { watchlist = JSON.parse(localStorage.getItem('bplWatchlist') || '{}') || {}; } catch (e) { watchlist = {}; }
    function saveWatchlist() { try { localStorage.setItem('bplWatchlist', JSON.stringify(watchlist)); } catch (e) {} }
    function isStarred(id) { return Object.prototype.hasOwnProperty.call(watchlist, id); }
    function watchLimit(id) { return isStarred(id) ? (Number(watchlist[id]) || 0) : 0; }
    function toggleStar(id) {
      if (isStarred(id)) delete watchlist[id]; else watchlist[id] = 0;
      saveWatchlist(); renderPool(); renderCurrentPlayer(); updateStarredCount();
    }
    function setWatchLimit(id, v) {
      if (!isStarred(id)) return;
      watchlist[id] = Number(v) || 0;
      saveWatchlist(); renderPool(); renderCurrentPlayer();
    }
    function updateStarredCount() {
      var el = document.getElementById('starredCount');
      if (el) el.textContent = Object.keys(watchlist).length ? ' (' + Object.keys(watchlist).length + ')' : '';
    }
    function setPoolSearch(v) { poolSearch = String(v || '').trim().toLowerCase(); renderPool(); }

    function setFilter(f,btn) {
      currentFilter=f;
      document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      renderPool();
    }

    function detectSoldTransition(nextPlayers) {
      for (const p of nextPlayers) {
        const prev = previousSoldState.get(p.id);
        if (p.is_sold && (!prev || !prev.is_sold || prev.captain_id !== p.captain_id || prev.sold_price !== p.sold_price || prev.sold_at !== p.sold_at)) {
          const cap = allCaptains.find(c => c.id === p.captain_id);
          lastSoldEvent = {
            player: p.name,
            captain: cap ? displayCaptainName(cap) : '—',
            price: p.sold_price || 0,
            at: Date.now(),
            key: `${p.id}:${p.captain_id || ''}:${p.sold_price || 0}:${p.sold_at || Date.now()}`
          };
        }
      }
      previousSoldState = new Map(nextPlayers.map(p => [p.id, { is_sold: p.is_sold, captain_id: p.captain_id, sold_price: p.sold_price, sold_at: p.sold_at }]));
    }
