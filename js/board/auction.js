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
      var statsBar = document.getElementById('auctionStatsBar');
      var waiting = document.getElementById('waitingBanner');
      var poolFilters = document.getElementById('poolFilters');
      var playerPoolTitle = document.getElementById('playerPoolSectionTitle');
      var title = document.getElementById('auctionEventTitle');
      var copy = document.getElementById('auctionEventCopy');

      if (prePanel) prePanel.style.display = preAuction ? 'block' : 'none';
      if (statsBar) statsBar.style.display = preAuction ? 'none' : 'block';
      if (waiting) waiting.style.display = preAuction ? 'none' : waiting.style.display;
      // Before the auction only "All" and "Starred" make sense (nothing is sold or unsold yet), so captains can
      // build their watchlist; Available/Unsold/Sold appear once the auction starts.
      if (poolFilters) {
        poolFilters.style.display = 'flex';
        poolFilters.querySelectorAll('.filter-btn').forEach(function(b) {
          var f = b.getAttribute('data-filter');
          b.style.display = (preAuction && f !== 'all' && f !== 'starred') ? 'none' : '';
        });
      }
      var poolSearchEl = document.getElementById('poolSearch');
      if (poolSearchEl) poolSearchEl.style.display = 'block';
      if (playerPoolTitle) playerPoolTitle.style.display = 'block';

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

    // Player headshots: photos/<name-as-slug>.jpg (e.g. "Soham M" -> photos/soham-m.jpg).
    // Players without a file show their initials. A missing file is only requested once per page load.
    var PHOTO_VERSION = 3;
    var PHOTO_MISSING = {};
    function photoSlug(name) { return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
    function playerInitials(name) {
      var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
      if (!parts.length) return '';
      return (parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    function setPlayerPhoto(el, name) {
      if (!el || el.dataset.forName === name) return;   // already showing this player: no flicker on realtime refreshes
      el.dataset.forName = name;
      el.textContent = playerInitials(name);
      var slug = photoSlug(name);
      if (!slug || PHOTO_MISSING[slug]) return;
      var img = new Image();
      img.alt = '';
      img.decoding = 'async';
      img.onload = function() { if (el.dataset.forName === name) { el.textContent = ''; el.appendChild(img); } };
      img.onerror = function() { PHOTO_MISSING[slug] = 1; };
      img.src = 'photos/' + slug + '.jpg?v=' + PHOTO_VERSION;
    }

    // Tap a photo to see it larger. Tap anywhere (or press Escape) to close. It also closes by itself when the player
    // on the block changes, so nobody misses the next bid or a sale because a photo was left open.
    var lightboxForPlayer = null;
    function openPhotoLightbox(name) {
      var slug = photoSlug(name), box = document.getElementById('photoLightbox');
      if (!box || !slug || PHOTO_MISSING[slug]) return;
      var img = document.getElementById('plImg');
      img.onerror = function() { PHOTO_MISSING[slug] = 1; closePhotoLightbox(); };
      img.onload = function() { box.style.display = 'flex'; };
      img.src = 'photos/' + slug + '.jpg?v=' + PHOTO_VERSION;
      document.getElementById('plName').textContent = name;
    }
    function closePhotoLightbox() {
      var box = document.getElementById('photoLightbox');
      if (box) box.style.display = 'none';
    }
    document.addEventListener('click', function(e) {
      var el = e.target && e.target.closest ? e.target.closest('.player-photo[data-for-name]') : null;
      if (el && el.querySelector('img')) openPhotoLightbox(el.getAttribute('data-for-name') || el.dataset.forName);
    });
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closePhotoLightbox(); });

    // "On your list" tag on the Now Bidding card, with the private limit and a check against the pinned team's max bid.
    function renderWatchTag(p, currentBid) {
      var el = document.getElementById('nowBiddingWatch');
      if (!el) return;
      if (!isStarred(p.id)) { el.style.display = 'none'; el.innerHTML = ''; return; }
      var lim = watchLimit(p.id), html = '<span class="watch-tag">\u2605 On your list</span>';
      if (lim) {
        html += ' <span class="watch-limit' + (currentBid >= lim ? ' hit' : '') + '">Your limit ' + fmtM(lim) + (currentBid >= lim ? ' \u00b7 reached' : '') + '</span>';
        var team = pinnedCaptainId ? allCaptains.find(function(c) { return c.id === pinnedCaptainId; }) : null;
        if (team) {
          var roster = allPlayers.filter(function(x) { return x.captain_id === team.id && x.is_sold; });
          var mb = maxBid(team.wallet, roster);
          if (lim > mb) html += '<div class="watch-warn">Above your max bid of ' + fmtM(mb) + '</div>';
        }
      }
      el.innerHTML = html; el.style.display = 'block';
    }

    function renderCurrentPlayer() {
      if (lightboxForPlayer !== (currentPlayerId || null)) { lightboxForPlayer = currentPlayerId || null; closePhotoLightbox(); }
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
          setPlayerPhoto(document.getElementById('nowBiddingPhoto'), p.name);
          bp.innerHTML =
            `Base price ${fmtM(S4_BASE)}` +
            (p.status === 'tentative' ? ' <span style="margin-left:4px;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:rgba(62,207,142,0.1);border:1px solid rgba(62,207,142,0.3);color:var(--green);">Tentative</span>' : '');

          const currentBid    = bidState?.current_bid || 0;
          const currentBidder = bidState?.current_bidder_id
            ? allCaptains.find(c => c.id === bidState.current_bidder_id)
            : null;

          statusEl.className = 'now-bidding-status';
          // The plain 'Live Auction' pill was dropped (the banner already says Now Bidding).
          // Only show a pill when bidding is locked.
          if (bidState?.bid_locked) {
            statusEl.textContent = 'Bid Locked';
            statusEl.classList.add('locked');
            statusEl.style.display = 'inline-flex';
          } else {
            statusEl.style.display = 'none';
          }

          if (currentBid > 0) {
            amountEl.textContent    = fmtM(currentBid);
            bidderEl.textContent    = currentBidder ? `Highest bid · ${displayCaptainName(currentBidder)}` : '—';
            liveSection.style.display = 'block';
          } else {
            liveSection.style.display = 'none';
          }

          renderWatchTag(p, currentBid);
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

    // Small round photo for list rows (player pool, captain cards): loads the ~3 KB thumbnail lazily and
    // falls back to initials. A missing thumbnail is requested once per page load, not on every re-render.
    function photoHtml(name, sizeClass) {
      var slug = photoSlug(name), ini = playerInitials(name);
      var inner = (!slug || PHOTO_MISSING[slug])
        ? ini
        : '<img src="photos/thumb/' + slug + '.jpg?v=' + PHOTO_VERSION + '" loading="lazy" decoding="async" alt="" data-slug="' + slug + '" data-ini="' + ini + '" onerror="photoThumbMissing(this)">';
      return '<span class="player-photo ' + sizeClass + '" data-for-name="' + String(name || '').replace(/"/g, '&quot;') + '">' + inner + '</span>';
    }
    function photoThumbMissing(img) {
      PHOTO_MISSING[img.getAttribute('data-slug')] = 1;
      if (img.parentNode) img.parentNode.textContent = img.getAttribute('data-ini') || '';
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
        // Highest purse first (ties by name)
        return b.c.wallet - a.c.wallet || String(displayCaptainName(a.c)).localeCompare(String(displayCaptainName(b.c)));
      });
      rows = pinFirst(rows, function(r) { return r.c.id; });
      var html = '<div class="bb-title">Team Budgets</div>'
        + '<div class="bb-row bb-head"><span>Team</span><span>Spots</span><span>Purse</span><span>Max bid</span></div>'
        + rows.map(function(r) {
            var pips = '';
            for (var i = 0; i < S4_SLOTS; i++) pips += '<i class="bb-pip' + (i < r.bought ? ' on' : '') + '"></i>';
            var full = r.left === 0;
            var cls = full ? 'full' : r.max <= S4_BASE ? 'low' : r.max <= S4_BASE * 3 ? 'mid' : 'ok';
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
      const photo = document.getElementById('soldBannerPhoto');

      // Use in-memory event if fresh (within 25s), otherwise fall back to DB data
      if (lastSoldEvent && (Date.now() - lastSoldEvent.at) <= 25000) {
        main.textContent = lastSoldEvent.player;
        setPlayerPhoto(photo, lastSoldEvent.player);
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
      setPlayerPhoto(photo, latestSold.name);
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
        tournamentBanner.style.display = 'none';   // the big banner pushes the tabs off screen on phones; the header line below says the auction is complete

        // Hide the auction-specific elements
        const nowBidding = document.getElementById('nowBidding');
        const soldBanner = document.getElementById('soldBanner');
        const eventBanner = auctionTab.querySelector('.event-banner');
        if (nowBidding) nowBidding.style.display = 'none';
        if (waitingBanner) waitingBanner.style.display = 'none';
        if (soldBanner) soldBanner.style.display = 'none';
        if (eventBanner) eventBanner.style.display = 'none';

        // Land on the post-auction home tab once per page load. The Auction tab stays available
        // afterwards, so a manual visit to it must not be switched away again.
        const activeTab = document.querySelector('.tab.active');
        if (!window._homeSwitched && (!activeTab || activeTab.textContent === 'Auction')) {
          window._homeSwitched = true;
          switchBoardTab(typeof HOME_TAB_AFTER_AUCTION === 'string' ? HOME_TAB_AFTER_AUCTION : 'teams');
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

    function renderStats_() {
      const sold=allPlayers.filter(p=>p.is_sold);
      document.getElementById('statSold').textContent=sold.length;
      document.getElementById('statAvail').textContent=allPlayers.filter(p=>!p.is_sold).length;
      var total = allPlayers.length, backlog = allPlayers.filter(p=>!p.is_sold && p.unsold_at).length;
      document.getElementById('statQueue').textContent = backlog;
      var pct = function(n) { return total ? (n / total * 100).toFixed(1) + '%' : '0%'; };
      document.getElementById('sbarSoldFill').style.width = pct(sold.length);
      document.getElementById('sbarUnsoldFill').style.width = pct(backlog);
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
              ${photoHtml(c.name, 'ph-md')}
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
      else if (currentFilter==='starred') filtered=allPlayers.filter(p=>isStarred(p.id));
      if (poolSearch) filtered=filtered.filter(p=>String(p.name||'').toLowerCase().includes(poolSearch));
      if (!filtered.length) { grid.innerHTML='<div class="text-muted">' + (currentFilter==='starred' ? (Object.keys(watchlist).length ? 'No starred players match your search.' : 'No starred players yet. Tap the star on a player to add them to your list.') : 'No players match this filter.') + '</div>'; return; }
      grid.innerHTML=filtered.map(p=>{
        const cap=allCaptains.find(c=>c.id===p.captain_id), isCurrent=p.id===currentPlayerId&&!p.is_sold;
        return `
          <div class="pool-player-card ${p.is_sold?'is-sold':''} ${isCurrent?'is-current':''}">
            ${photoHtml(p.name, 'ph-xs')}
            <div class="pool-card-text">
              <div class="pool-player-card-name">${p.name}${isCurrent?' <span style="font-size:10px;color:var(--accent);">● Bidding</span>':''}</div>
              ${p.is_sold?`<div class="pool-player-card-sold">✓ ${cap?displayCaptainName(cap):'?'} · ${fmtM(p.sold_price)}</div>`:`<div style="font-size:11px;color:var(--muted);margin-top:4px;">${isCurrent?'Live now':(p.unsold_at?'Unsold · back in queue':'Available')}</div>`}
            </div>
            ${watchControls(p)}
          </div>`;
      }).join('');
    }

    // Star button (and an optional private limit) on a pool card. Hidden once the player is sold.
    function watchControls(p) {
      if (p.is_sold) return isStarred(p.id) ? '<span class="star-btn on static" aria-hidden="true">\u2605</span>' : '';
      var on = isStarred(p.id);
      var out = '<button type="button" class="star-btn' + (on ? ' on' : '') + '" onclick="toggleStar(\'' + p.id + '\')" aria-label="' + (on ? 'Remove from my list' : 'Add to my list') + '">' + (on ? '\u2605' : '\u2606') + '</button>';
      if (on) {
        var cur = watchLimit(p.id), opts = '<option value="0">No limit</option>';
        for (var v = S4_BASE; v <= S4_BUDGET * 0.6; v += S4_INCREMENT) opts += '<option value="' + v + '"' + (cur === v ? ' selected' : '') + '>Limit ' + fmtM(v) + '</option>';
        out += '<select class="limit-select" aria-label="My limit for ' + String(p.name).replace(/"/g, '') + '" onchange="setWatchLimit(\'' + p.id + '\', this.value)">' + opts + '</select>';
      }
      return out;
    }
