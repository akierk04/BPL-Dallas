function isPreAuctionMode() {
      var soldCount = allPlayers.filter(function(p) { return p.is_sold; }).length;
      return soldCount === 0 && !currentPlayerId;
    }

    function updateCountdown() {
      if (!bidState || !bidState.auction_start_time) return;

      var target = new Date(bidState.auction_start_time).getTime();
      var now = Date.now();

      var diff = Math.max(0, target - now);

      var days = Math.floor(diff / 86400000);
      var hours = Math.floor((diff % 86400000) / 3600000);
      var minutes = Math.floor((diff % 3600000) / 60000);
      var seconds = Math.floor((diff % 60000) / 1000);

      var d = document.getElementById('cdDays');
      var h = document.getElementById('cdHours');
      var m = document.getElementById('cdMinutes');
      var s = document.getElementById('cdSeconds');

      if (d) d.textContent = String(days);
      if (h) h.textContent = String(hours).padStart(2, '0');
      if (m) m.textContent = String(minutes).padStart(2, '0');
      if (s) s.textContent = String(seconds).padStart(2, '0');
    }

    function renderAuctionState() {
      var preAuction = isPreAuctionMode();
      var soldCount = allPlayers.filter(function(p) { return p.is_sold; }).length;
      var prePanel = document.getElementById('preAuctionPanel');
      var auctionGrid = document.getElementById('auctionGrid');
      var statsBar = document.getElementById('auctionStatsBar');
      var waiting = document.getElementById('waitingBanner');
      var poolFilters = document.getElementById('poolFilters');
      var playerPoolTitle = document.getElementById('playerPoolSectionTitle');
      var title = document.getElementById('auctionEventTitle');
      var copy = document.getElementById('auctionEventCopy');

      if (prePanel) prePanel.style.display = preAuction ? 'block' : 'none';
      if (auctionGrid) auctionGrid.style.display = preAuction ? 'none' : 'grid';
      if (statsBar) statsBar.style.display = preAuction ? 'none' : 'flex';
      if (waiting) waiting.style.display = preAuction ? 'none' : waiting.style.display;
      if (poolFilters) poolFilters.style.display = preAuction ? 'none' : 'flex';
      if (playerPoolTitle) playerPoolTitle.style.display = preAuction ? 'none' : 'block';

      if (title && copy) {
        if (preAuction) {
          title.textContent = 'Auction Begins Soon';
          copy.textContent = 'Auction begins soon.';
        } else if (currentPlayerId || soldCount > 0) {
          title.textContent = 'Live Auction In Progress';
          copy.textContent = 'Watch bids rise, squads fill up, and the board update in real time.';
        }
      }
      updateCountdown();
    }


    function triggerBidPulse() {
      const el = document.getElementById('nowBidding');
      if (!el || el.style.display === 'none') return;
      el.classList.remove('bid-pulse');
      void el.offsetWidth;
      el.classList.add('bid-pulse');
    }

    function handleAuctionDrama() {
      const currentBid = bidState?.current_bid || 0;
      if (currentPlayerId && previousBidPlayerId === currentPlayerId && currentBid > previousBidValue) {
        triggerBidPulse();
      }
      if (lastSoldEvent?.key && lastSoldEvent.key !== previousSoldKey) {
        previousSoldKey = lastSoldEvent.key;
      }
      previousBidValue = currentBid;
      previousBidPlayerId = currentPlayerId || null;
    }

    function renderCurrentPlayer() {
      const nb  = document.getElementById('nowBidding');
      const wb  = document.getElementById('waitingBanner');
      const nm  = document.getElementById('nowBiddingName');
      const bp  = document.getElementById('nowBiddingBase');
      const liveSection = document.getElementById('nowBiddingLive');
      const amountEl    = document.getElementById('boardBidAmount');
      const bidderEl    = document.getElementById('boardBidder');
      const statusEl    = document.getElementById('boardAuctionStatus');

      if (currentPlayerId) {
        const p = allPlayers.find(x => x.id === currentPlayerId);
        if (p && !p.is_sold) {
          nm.textContent = p.name;
          const grpColor = p.group_name === '1' ? '#e05a2b' : p.group_name === '2' ? '#f0c040' : p.group_name === '3' ? '#3ecf8e' : p.group_name === '4' ? '#7c8cf8' : '#a78bfa';
          bp.innerHTML =
            `Base price ${p.base_price} pts` +
            ` <span style="margin-left:6px;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:${grpColor}18;border:1px solid ${grpColor}55;color:${grpColor};">Group ${p.group_name}</span>` +
            (p.status === 'tentative' ? ' <span style="margin-left:4px;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:rgba(62,207,142,0.1);border:1px solid rgba(62,207,142,0.3);color:var(--green);">Tentative</span>' : '');

          const currentBid    = bidState?.current_bid || 0;
          const currentBidder = bidState?.current_bidder_id
            ? allCaptains.find(c => c.id === bidState.current_bidder_id)
            : null;

          statusEl.className = 'now-bidding-status';
          if (bidState?.bid_locked) {
            statusEl.textContent = 'Bid Locked';
            statusEl.classList.add('locked');
          } else {
            statusEl.textContent = 'Live Auction';
            statusEl.classList.add('live');
          }

          if (currentBid > 0) {
            amountEl.textContent    = currentBid.toLocaleString() + ' pts';
            bidderEl.textContent    = currentBidder ? `Highest bid · ${displayCaptainName(currentBidder)}` : '—';
            liveSection.style.display = 'block';
          } else {
            liveSection.style.display = 'none';
          }

          nb.style.display = 'block';
          wb.style.display = 'none';
          return;
        }
      }
      nb.style.display = 'none';
      wb.style.display = isPreAuctionMode() ? 'none' : 'block';
    }

    function renderSoldBanner() {
      const banner = document.getElementById('soldBanner');
      const main = document.getElementById('soldBannerMain');
      const sub = document.getElementById('soldBannerSub');

      // Use in-memory event if fresh (within 25s), otherwise fall back to DB data
      if (lastSoldEvent && (Date.now() - lastSoldEvent.at) <= 25000) {
        main.textContent = lastSoldEvent.player;
        sub.textContent = `Sold to ${lastSoldEvent.captain} for ${lastSoldEvent.price} pts`;
        banner.style.display = 'block';
        return;
      }

      // Fallback: show the most recently sold player from allPlayers (survives page refresh)
      const latestSold = [...allPlayers]
        .filter(p => p.is_sold && p.captain_id)
        .sort((a, b) => (b.sold_at ? new Date(b.sold_at).getTime() : 0) - (a.sold_at ? new Date(a.sold_at).getTime() : 0))[0];

      if (!latestSold) {
        banner.style.display = 'none';
        return;
      }

      const cap = allCaptains.find(c => c.id === latestSold.captain_id);
      main.textContent = latestSold.name;
      sub.textContent = `Sold to ${cap ? displayCaptainName(cap) : '—'} for ${latestSold.sold_price || 0} pts`;
      banner.style.display = 'block';
    }

    function renderStory() {
      const wrap = document.getElementById('boardStory');
      const sold = allPlayers.filter(p => p.is_sold);
      const available = allPlayers.filter(p => !p.is_sold);
      const sortedWallets = [...allCaptains].sort((a,b) => b.wallet - a.wallet);
      const fullest = allCaptains.map(c => ({
        captain: c,
        count: allPlayers.filter(p => p.captain_id === c.id).length
      })).sort((a,b)=>b.count-a.count || a.captain.wallet-b.captain.wallet);
      const topSale = sold.reduce((best,p)=>!best || (p.sold_price||0) > (best.sold_price||0) ? p : best, null);
      const lines = [];

      if (isPreAuctionMode()) {
        wrap.innerHTML = '<div class="story-line"><span>Countdown to auction</span> is live. Wallet details are hidden until the first nomination.</div>';
        return;
      }

      if (currentPlayerId) {
        const p = allPlayers.find(x => x.id === currentPlayerId);
        if (p && !p.is_sold) {
          const currentBid = bidState?.current_bid || 0;
          const bidder = bidState?.current_bidder_id ? allCaptains.find(c=>c.id===bidState.current_bidder_id) : null;
          if (currentBid > 0 && bidder) {
            lines.push(`<span>${p.name}</span> is live at <span>${currentBid} pts</span>, led by <span>${displayCaptainName(bidder)}</span>.`);
          } else {
            lines.push(`<span>${p.name}</span> is live now. Opening price is <span>${p.base_price} pts</span>.`);
          }
        }
      } else {
        // Show most recent sale from DB (works on refresh), prefer in-memory event if fresh
        const recentSale = lastSoldEvent
          ? lastSoldEvent
          : (() => {
              const p = [...allPlayers].filter(s => s.is_sold && s.captain_id)
                .sort((a,b) => (b.sold_at ? new Date(b.sold_at).getTime() : 0) - (a.sold_at ? new Date(a.sold_at).getTime() : 0))[0];
              if (!p) return null;
              const cap = allCaptains.find(c => c.id === p.captain_id);
              return { player: p.name, captain: cap ? displayCaptainName(cap) : '—', price: p.sold_price || 0 };
            })();
        if (recentSale) {
          lines.push(`<span>${recentSale.player}</span> just went to <span>${recentSale.captain}</span> for <span>${recentSale.price} pts</span>.`);
        } else {
          lines.push(`Auction is between nominations right now. <span>${available.length}</span> players are still available.`);
        }
      }

      if (sortedWallets[0]) {
        lines.push(`<span>${displayCaptainName(sortedWallets[0])}</span> has the biggest purse left at <span>${sortedWallets[0].wallet.toLocaleString()} pts</span>.`);
      }
      if (fullest[0]) {
        lines.push(`<span>${displayCaptainName(fullest[0].captain)}</span> currently has the fullest squad with <span>${fullest[0].count}</span> player${fullest[0].count !== 1 ? 's' : ''} bought.`);
      }
      if (topSale) {
        const cap = allCaptains.find(c=>c.id===topSale.captain_id);
        lines.push(`Highest sale so far: <span>${topSale.name}</span> to <span>${cap ? displayCaptainName(cap) : '—'}</span> for <span>${topSale.sold_price || 0} pts</span>.`);
      }

      wrap.innerHTML = lines.slice(0,4).map(line => `<div class="story-line">${line}</div>`).join('');
    }

    function renderBoardPhase() {
      const el = document.getElementById('boardPhase');
      const tournamentBanner = document.getElementById('tournamentModeBanner');
      const auctionTab = document.getElementById('btab-auction');
      const waitingBanner = document.getElementById('waitingBanner');

      const unsoldCount = allPlayers.filter(p => !p.is_sold).length;
      const auctionDone = allPlayers.length > 0 && unsoldCount === 0;

      if (isPreAuctionMode()) {
        el.textContent = 'Pre-auction mode · countdown live';
        tournamentBanner.style.display = 'none';
      } else if (auctionDone) {
        // #10 Tournament mode: hide auction UI, show tournament banner, auto-switch to standings
        el.textContent = 'Tournament mode · auction complete';
        tournamentBanner.style.display = 'block';

        // Hide the auction-specific elements
        const nowBidding = document.getElementById('nowBidding');
        const soldBanner = document.getElementById('soldBanner');
        const eventBanner = auctionTab.querySelector('.event-banner');
        if (nowBidding) nowBidding.style.display = 'none';
        if (waitingBanner) waitingBanner.style.display = 'none';
        if (soldBanner) soldBanner.style.display = 'none';
        if (eventBanner) eventBanner.style.display = 'none';

        // Auto-switch to standings tab if still on auction tab
        const activeTab = document.querySelector('.tab.active');
        if (!activeTab || activeTab.textContent === 'Auction') {
          switchBoardTab('standings');
        }
      } else {
        tournamentBanner.style.display = 'none';
        if (currentPlayerId) {
          el.textContent = 'Auction phase live · board updates in real time';
        } else {
          el.textContent = 'Auction room standing by for the next player';
        }
      }
    }

    function renderSpotlights() {
      if (isPreAuctionMode()) {
        document.getElementById('topSpenderName').textContent = 'Auction begins soon';
        document.getElementById('topSpenderCopy').textContent = 'Spending leaders will appear once bidding starts.';
        document.getElementById('pressureWatchName').textContent = 'Wallets hidden';
        document.getElementById('pressureWatchCopy').textContent = 'Budget pressure will appear after the first sale.';
        return;
      }
      const sold = allPlayers.filter(p => p.is_sold);
      const spendRows = allCaptains.map(c => {
        const spent = sold.filter(p => p.captain_id === c.id).reduce((sum, p) => sum + (p.sold_price || 0), 0);
        const roster = sold.filter(p => p.captain_id === c.id).length;
        return { captain: c, spent, roster };
      }).sort((a,b) => b.spent - a.spent || b.roster - a.roster);

      const top = spendRows[0];
      const pressure = [...allCaptains].map(c => {
        const soldForCap = sold.filter(p => p.captain_id === c.id);
        const roster = soldForCap.length;
        const safe = budgetWarning(c.wallet, c.captain_group, soldForCap, getActiveBidGroup()).safe;
        return { captain: c, roster, safe, wallet: c.wallet };
      }).sort((a,b) => a.safe - b.safe || a.wallet - b.wallet)[0];

      document.getElementById('topSpenderName').textContent = top && top.spent > 0 ? displayCaptainName(top.captain) : 'No leader yet';
      document.getElementById('topSpenderCopy').textContent = top && top.spent > 0
        ? `${top.spent} pts spent across ${top.roster}/5 slots. They are setting the auction pace.`
        : 'The board is waiting for the first statement buy.';

      document.getElementById('pressureWatchName').textContent = pressure ? displayCaptainName(pressure.captain) : 'No alert';
      document.getElementById('pressureWatchCopy').textContent = pressure && allPlayers.filter(p => p.is_sold).length
        ? `${pressure.wallet} pts left with ${Math.max(0, 5 - pressure.roster)} slots remaining. Safe spend: ${pressure.safe} pts.`
        : 'Nobody is under purse pressure yet.';
    }

    function renderStoryline() {
      const el = document.getElementById('boardStory');
      const sold = allPlayers.filter(p => p.is_sold).sort((a,b) => (b.sold_at ? new Date(b.sold_at).getTime() : 0) - (a.sold_at ? new Date(a.sold_at).getTime() : 0));
      const lines = [];
      const topSale = sold.reduce((best,p)=>!best || (p.sold_price||0) > (best.sold_price||0) ? p : best, null);
      const current = currentPlayerId ? allPlayers.find(p => p.id === currentPlayerId) : null;
      const currentBidder = bidState?.current_bidder_id ? allCaptains.find(c => c.id === bidState.current_bidder_id) : null;
      const spendRows = allCaptains.map(c => ({
        captain: c,
        spent: sold.filter(p => p.captain_id === c.id).reduce((sum,p) => sum + (p.sold_price||0), 0),
        roster: sold.filter(p => p.captain_id === c.id).length,
        safe: budgetWarning(c.wallet, c.captain_group, sold.filter(p => p.captain_id === c.id), getActiveBidGroup()).safe
      })).sort((a,b) => b.spent - a.spent);
      const topSpender = spendRows[0];
      const pressure = [...spendRows].sort((a,b) => a.safe - b.safe || a.captain.wallet - b.captain.wallet)[0];

      if (current && currentBidder && bidState?.current_bid) {
        lines.push(`<div class="story-line"><span>${current.name}</span> is live at <span>${bidState.current_bid} pts</span>, led by <span>${displayCaptainName(currentBidder)}</span>.</div>`);
      } else if (current) {
        lines.push(`<div class="story-line"><span>${current.name}</span> is on the block. Opening value is <span>${current.base_price} pts</span>.</div>`);
      }
      if (lastSoldEvent) {
        lines.push(`<div class="story-line"><span>${lastSoldEvent.player}</span> just moved to <span>${lastSoldEvent.captain}</span> for <span>${lastSoldEvent.price} pts</span>.</div>`);
      } else if (sold[0]) {
        const cap = allCaptains.find(c => c.id === sold[0].captain_id);
        lines.push(`<div class="story-line">Most recent sale: <span>${sold[0].name}</span> to <span>${cap ? displayCaptainName(cap) : '—'}</span> for <span>${sold[0].sold_price || 0} pts</span>.</div>`);
      }
      if (topSale) {
        const cap = allCaptains.find(c => c.id === topSale.captain_id);
        lines.push(`<div class="story-line">Highest ticket so far is <span>${topSale.sold_price} pts</span> for <span>${topSale.name}</span>${cap ? `, landed by <span>${displayCaptainName(cap)}</span>` : ''}.</div>`);
      }
      if (topSpender && topSpender.spent > 0) {
        lines.push(`<div class="story-line"><span>${displayCaptainName(topSpender.captain)}</span> leads spending at <span>${topSpender.spent} pts</span> across <span>${topSpender.roster}</span> players.</div>`);
      }
      if (pressure && sold.length) {
        lines.push(`<div class="story-line"><span>${displayCaptainName(pressure.captain)}</span> is under the most purse pressure with only <span>${pressure.safe} pts</span> safe to spend.</div>`);
      }
      if (!lines.length) lines.push('<div class="story-line">Auction room is warming up. First bid will set the tone.</div>');
      el.innerHTML = lines.slice(0,4).join('');
    }

function renderRecentSales() {
      const wrap = document.getElementById('recentSales');
      const sold = [...allPlayers]
        .filter(p => p.is_sold)
        .sort((a,b) => (b.sold_at ? new Date(b.sold_at).getTime() : 0) - (a.sold_at ? new Date(a.sold_at).getTime() : 0))
        .slice(0,5);

      if (!sold.length) {
        wrap.innerHTML = '<div class="text-muted">No completed sales yet.</div>';
        return;
      }

      wrap.innerHTML = sold.map(p => {
        const cap = allCaptains.find(c => c.id === p.captain_id);
        return `
          <div class="recent-sale-row">
            <div class="recent-sale-name">${p.name}</div>
            <div class="recent-sale-meta">${cap ? displayCaptainName(cap) : '—'} · ${p.sold_price || 0} pts</div>
          </div>`;
      }).join('');
    }

    function renderStats_() {
      const sold=allPlayers.filter(p=>p.is_sold), spent=sold.reduce((s,p)=>s+(p.sold_price||0),0);
      const topSale = sold.reduce((best,p)=>!best || (p.sold_price||0) > (best.sold_price||0) ? p : best, null);
      document.getElementById('statSold').textContent=sold.length;
      document.getElementById('statAvail').textContent=allPlayers.filter(p=>!p.is_sold).length;
      document.getElementById('statSpent').textContent=spent.toLocaleString();
      document.getElementById('statTopSale').textContent=topSale ? `${topSale.sold_price}` : '—';
    }

    function renderCaptains() {
      const grid=document.getElementById('boardCaptains');
      if (!allCaptains.length) { grid.innerHTML='<div class="text-muted">Loading...</div>'; return; }

      const sorted = [...allCaptains].sort((a,b) => a.name.localeCompare(b.name));

      grid.innerHTML=sorted.map(c=>{
        const roster = allPlayers.filter(p=>p.captain_id===c.id && p.is_sold);
        const slotsUsed    = roster.length;
        const totalSlots   = 5; // 5 bids per captain (6 total including captain)
        const teamName     = c.team_name ? displayTeamName(c.team_name) : null;

        const rHtml = roster.length
          ? roster.map(p=>`
              <div class="board-player-row">
                <span class="board-player-name">
                  ${p.name}
                  <span style="font-size:10px;background:rgba(240,192,64,0.1);color:var(--muted);padding:1px 5px;border-radius:3px;margin-left:4px;">G${p.group_name}</span>
                  ${p.status==='tentative' ? '<span style="font-size:10px;background:rgba(62,207,142,0.1);color:var(--green);padding:1px 5px;border-radius:3px;margin-left:2px;">T</span>' : ''}
                </span>
                <span class="board-player-price">${p.sold_price} pts</span>
              </div>`).join('')
          : '<div class="board-empty">No players yet</div>';

        return `
          <div class="board-captain-card">
            <div class="board-captain-header">
              <div style="flex:1;min-width:0;">
                ${teamName
                  ? `<div class="board-captain-name" style="font-size:16px;font-weight:700;">${teamFlag(teamName)} ${teamName}</div>
                     <div style="font-size:12px;color:var(--muted);margin-top:2px;">Cap: ${c.name}</div>`
                  : `<div class="board-captain-name">${c.name}</div>`
                }
                <div style="margin-top:4px;display:flex;align-items:center;gap:6px;">
                  <span style="font-size:11px;color:var(--muted);">${slotsUsed}/${totalSlots} players</span>
                </div>
              </div>
              <div class="board-purse-wrap">
                <div class="board-purse-label">Purse</div>
                <div class="board-purse">${c.wallet.toLocaleString()}</div>
                <div class="board-purse-label">pts left</div>
              </div>
            </div>
            <div style="padding:8px 16px 0;">${warningBadgeHtml(c.wallet, c.captain_group, roster, getActiveBidGroup())}</div>
            <div class="board-roster">${rHtml}</div>
          </div>`;
      }).join('');
    }

    function renderPool() {
      const grid=document.getElementById('boardPool');
      let filtered=allPlayers;
      if (currentFilter==='available') filtered=allPlayers.filter(p=>!p.is_sold);
      else if (currentFilter==='sold') filtered=allPlayers.filter(p=>p.is_sold);
      if (!filtered.length) { grid.innerHTML='<div class="text-muted">No players match this filter.</div>'; return; }
      grid.innerHTML=filtered.map(p=>{
        const cap=allCaptains.find(c=>c.id===p.captain_id), isCurrent=p.id===currentPlayerId&&!p.is_sold;
        return `
          <div class="pool-player-card ${p.is_sold?'is-sold':''} ${isCurrent?'is-current':''}">
            <div class="pool-player-card-name">${p.name}${isCurrent?' <span style="font-size:10px;color:var(--accent);">● Bidding</span>':''}</div>
            ${p.is_sold?`<div class="pool-player-card-sold">✓ ${cap?displayCaptainName(cap):'?'} · ${p.sold_price} pts</div>`:`<div style="font-size:11px;color:var(--muted);margin-top:4px;">${isCurrent?'Live now':'Available'}</div>`}
          </div>`;
      }).join('');
    }
