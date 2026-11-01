function isPreAuctionMode() {
      var soldCount = allPlayers.filter(function(p) { return p.is_sold; }).length;
      return soldCount === 0 && !currentPlayerId;
    }

    // "Friday, November 6, 2026 · 6:00 PM CT" from the same DB value the countdown uses.
    function formatAuctionStart(iso) {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      var tz = 'America/Chicago';
      var day = d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: tz });
      var time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tz });
      return day + ' \u00b7 ' + time + ' CT';
    }

    function updateCountdown() {
      var whenEl = document.getElementById('auctionStartText');
      if (whenEl) {
        var txt = (bidState && bidState.auction_start_time) ? formatAuctionStart(bidState.auction_start_time) : '';
        whenEl.textContent = txt;
        whenEl.style.display = txt ? 'block' : 'none';
      }
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
      var poolSearchEl = document.getElementById('poolSearch');
      if (poolSearchEl) poolSearchEl.style.display = preAuction ? 'none' : 'block';
      if (playerPoolTitle) playerPoolTitle.style.display = preAuction ? 'none' : 'block';

      if (title) title.textContent = preAuction ? 'Auction Begins Soon' : 'Live Auction In Progress';
      // While a player is live the Now Bidding card says it all; keep the banner for the quiet moments
      var banner = document.getElementById('auctionEventBanner');
      if (banner) banner.style.display = currentPlayerId ? 'none' : 'block';
      var bb = document.getElementById('budgetBoard');
      if (bb && preAuction) bb.style.display = 'none';
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
          bp.innerHTML =
            `Base price ${fmtM(S4_BASE)}` +
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
            amountEl.textContent    = fmtM(currentBid);
            bidderEl.textContent    = currentBidder ? `Highest bid · ${displayCaptainName(currentBidder)}` : '—';
            liveSection.style.display = 'block';
          } else {
            liveSection.style.display = 'none';
          }

          nb.style.display = 'block';
          wb.style.display = 'none';
          var stripName = document.getElementById('liveStripName');
          if (stripName) stripName.textContent = p.name;
          updateLiveStrip();
          return;
        }
      }
      nb.style.display = 'none';
      wb.style.display = isPreAuctionMode() ? 'none' : 'block';
      updateLiveStrip();
    }

    // Compact "Now bidding" strip pinned to the top of the screen once the big card scrolls away
    function updateLiveStrip() {
      var strip = document.getElementById('liveStrip');
      var nb = document.getElementById('nowBidding');
      if (!strip || !nb) return;
      var live = nb.style.display !== 'none' && typeof activeBoardTab !== 'undefined' && activeBoardTab === 'auction';
      var gone = live && nb.getBoundingClientRect().bottom < 0;
      strip.style.display = gone ? 'flex' : 'none';
    }
    window.addEventListener('scroll', updateLiveStrip, { passive: true });

    // Team budgets at a glance: spots, purse and max bid for every team, sorted by who can bid the most
    function renderBudgetBoard() {
      var wrap = document.getElementById('budgetBoard');
      if (!wrap) return;
      if (isPreAuctionMode() || !allCaptains.length) { wrap.style.display = 'none'; return; }
      var rows = allCaptains.map(function(c) {
        var sold = allPlayers.filter(function(p) { return p.captain_id === c.id && p.is_sold; });
        return { c: c, bought: sold.length, left: spotsLeft(sold), max: maxBid(c.wallet, sold) };
      }).sort(function(a, b) {
        if ((a.left === 0) !== (b.left === 0)) return a.left === 0 ? 1 : -1;
        return b.max - a.max || String(displayCaptainName(a.c)).localeCompare(String(displayCaptainName(b.c)));
      });
      rows = pinFirst(rows, function(r) { return r.c.id; });
      var html = '<div class="bb-title">Team Budgets</div>'
        + '<div class="bb-row bb-head"><span>Team</span><span>Spots</span><span>Purse</span><span>Max bid</span></div>'
        + rows.map(function(r) {
            var pips = '';
            for (var i = 0; i < S4_SLOTS; i++) pips += '<i class="bb-pip' + (i < r.bought ? ' on' : '') + '"></i>';
            var full = r.left === 0;
            var cls = full ? 'full' : r.max <= S4_BASE ? 'low' : r.max <= 15 ? 'mid' : 'ok';
            var pinned = r.c.id === pinnedCaptainId;
            return '<div class="bb-row' + (full ? ' bb-full' : '') + (pinned ? ' bb-pinned' : '') + '">'
              + '<span class="bb-name"><button type="button" class="pin-btn' + (pinned ? ' on' : '') + '" onclick="togglePin(\'' + r.c.id + '\')" aria-label="' + (pinned ? 'Unpin' : 'Pin') + ' ' + displayCaptainName(r.c) + '">' + (pinned ? '\u2605' : '\u2606') + '</button>' + displayCaptainName(r.c) + '</span>'
              + '<span class="bb-pips" title="' + r.bought + ' of ' + S4_SLOTS + ' bought">' + pips + '</span>'
              + '<span class="bb-purse">' + fmtM(r.c.wallet) + '</span>'
              + '<span class="bb-max ' + cls + '">' + (full ? 'Full' : fmtM(r.max)) + '</span>'
              + '</div>';
          }).join('')
        + '<div class="bb-note">Max bid = purse minus $' + S4_BASE + 'M for each spot still to fill after this player.</div>';
      wrap.innerHTML = html;
      wrap.style.display = 'block';
    }

    function renderSoldBanner() {
      const banner = document.getElementById('soldBanner');
      const main = document.getElementById('soldBannerMain');
      const sub = document.getElementById('soldBannerSub');

      // Use in-memory event if fresh (within 25s), otherwise fall back to DB data
      if (lastSoldEvent && (Date.now() - lastSoldEvent.at) <= 25000) {
        main.textContent = lastSoldEvent.player;
        sub.textContent = `Sold to ${lastSoldEvent.captain} for ${fmtM(lastSoldEvent.price)}`;
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
      sub.textContent = `Sold to ${cap ? displayCaptainName(cap) : '—'} for ${fmtM(latestSold.sold_price || 0)}`;
      banner.style.display = 'block';
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
        return;
      }
      const sold = allPlayers.filter(p => p.is_sold);
      const spendRows = allCaptains.map(c => {
        const spent = sold.filter(p => p.captain_id === c.id).reduce((sum, p) => sum + (p.sold_price || 0), 0);
        const roster = sold.filter(p => p.captain_id === c.id).length;
        return { captain: c, spent, roster };
      }).sort((a,b) => b.spent - a.spent || b.roster - a.roster);

      const top = spendRows[0];

      document.getElementById('topSpenderName').textContent = top && top.spent > 0 ? displayCaptainName(top.captain) : 'No leader yet';
      document.getElementById('topSpenderCopy').textContent = top && top.spent > 0
        ? `${fmtM(top.spent)} spent across ${top.roster}/${S4_SLOTS} spots. They are setting the auction pace.`
        : 'The board is waiting for the first statement buy.';

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
            <div class="recent-sale-meta">${cap ? displayCaptainName(cap) : '—'} · ${fmtM(p.sold_price || 0)}</div>
          </div>`;
      }).join('');
    }

    function renderStats_() {
      const sold=allPlayers.filter(p=>p.is_sold), spent=sold.reduce((s,p)=>s+(p.sold_price||0),0);
      const topSale = sold.reduce((best,p)=>!best || (p.sold_price||0) > (best.sold_price||0) ? p : best, null);
      document.getElementById('statSold').textContent=sold.length;
      document.getElementById('statAvail').textContent=allPlayers.filter(p=>!p.is_sold).length;
      document.getElementById('statSpent').textContent=fmtM(spent);
      document.getElementById('statTopSale').textContent=topSale ? fmtM(topSale.sold_price) : '—';
      var prog = document.getElementById('auctionProgress');
      if (prog) {
        var total = allPlayers.length, backlog = allPlayers.filter(p=>!p.is_sold && p.unsold_at).length;
        if (isPreAuctionMode() || !total) { prog.style.display = 'none'; }
        else {
          document.getElementById('apText').textContent = sold.length + ' of ' + total + ' sold' + (backlog ? ' · ' + backlog + ' unsold, back in queue' : '');
          document.getElementById('apFill').style.width = Math.round(sold.length / total * 100) + '%';
          prog.style.display = 'block';
        }
      }
    }

    function renderCaptains() {
      const grid=document.getElementById('boardCaptains');
      if (!allCaptains.length) { grid.innerHTML='<div class="text-muted">Loading...</div>'; return; }

      const sorted = pinFirst([...allCaptains].sort((a,b) => a.name.localeCompare(b.name)), c => c.id);

      grid.innerHTML=sorted.map(c=>{
        const roster = allPlayers.filter(p=>p.captain_id===c.id && p.is_sold);
        const slotsUsed    = roster.length;
        const totalSlots   = S4_SLOTS; // 5 auction players per captain (6 total including captain)
        const teamName     = c.team_name ? displayTeamName(c.team_name) : null;

        const rHtml = roster.length
          ? roster.map(p=>`
              <div class="board-player-row">
                <span class="board-player-name">
                  ${p.name}
                  ${p.status==='tentative' ? '<span style="font-size:10px;background:rgba(62,207,142,0.1);color:var(--green);padding:1px 5px;border-radius:3px;margin-left:2px;">T</span>' : ''}
                </span>
                <span class="board-player-price">${fmtM(p.sold_price)}</span>
              </div>`).join('')
          : '<div class="board-empty">No players yet</div>';

        const isPinned = c.id === pinnedCaptainId;
        return `
          <div class="board-captain-card${isPinned ? ' pinned' : ''}">
            <div class="board-captain-header">
              <div style="flex:1;min-width:0;">
                ${teamName
                  ? `<div class="board-captain-name" style="font-size:16px;font-weight:700;">${teamFlag(teamName)} ${teamName}</div>
                     <div style="font-size:12px;color:var(--muted);margin-top:2px;">Cap: ${c.name}</div>`
                  : `<div class="board-captain-name">${c.name}</div>`
                }
                <div style="margin-top:4px;display:flex;align-items:center;gap:6px;">
                  <button type="button" class="pin-btn${isPinned ? ' on' : ''}" onclick="togglePin('${c.id}')" aria-label="${isPinned ? 'Unpin' : 'Pin'} ${c.name}">${isPinned ? '\u2605 My team' : '\u2606 Pin'}</button>
                  <span style="font-size:11px;color:var(--muted);">${slotsUsed}/${totalSlots} players</span>
                </div>
              </div>
              <div class="board-purse-wrap">
                <div class="board-purse-label">Purse</div>
                <div class="board-purse">${fmtM(c.wallet)}</div>
                <div class="board-purse-label">left</div>
              </div>
            </div>
            <div style="padding:8px 16px 0;">${warningBadgeHtml(c.wallet, c.captain_group, roster)}</div>
            <div class="board-roster">${rHtml}</div>
          </div>`;
      }).join('');
    }

    function renderPool() {
      const grid=document.getElementById('boardPool');
      let filtered=allPlayers;
      if (currentFilter==='available') filtered=allPlayers.filter(p=>!p.is_sold);
      else if (currentFilter==='sold') filtered=allPlayers.filter(p=>p.is_sold);
      else if (currentFilter==='unsold') filtered=allPlayers.filter(p=>!p.is_sold && p.unsold_at);
      if (poolSearch) filtered=filtered.filter(p=>String(p.name||'').toLowerCase().includes(poolSearch));
      if (!filtered.length) { grid.innerHTML='<div class="text-muted">No players match this filter.</div>'; return; }
      grid.innerHTML=filtered.map(p=>{
        const cap=allCaptains.find(c=>c.id===p.captain_id), isCurrent=p.id===currentPlayerId&&!p.is_sold;
        return `
          <div class="pool-player-card ${p.is_sold?'is-sold':''} ${isCurrent?'is-current':''}">
            <div class="pool-player-card-name">${p.name}${isCurrent?' <span style="font-size:10px;color:var(--accent);">● Bidding</span>':''}</div>
            ${p.is_sold?`<div class="pool-player-card-sold">✓ ${cap?displayCaptainName(cap):'?'} · ${fmtM(p.sold_price)}</div>`:`<div style="font-size:11px;color:var(--muted);margin-top:4px;">${isCurrent?'Live now':(p.unsold_at?'Unsold · back in queue':'Available')}</div>`}
          </div>`;
      }).join('');
    }
