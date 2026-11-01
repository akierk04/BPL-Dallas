// Auction control, live bidding, sale confirmation, undo
// Extracted from admin.html during Admin refactor.

function renderAuctionControl() {
      renderLiveAuctionCard();
      renderCaptainStatus();
      renderRecentSales();
    }

    function renderLiveAuctionCard() {
      const live = document.getElementById('liveBidStatus');
      const empty = document.getElementById('liveBidEmpty');
      const player = allPlayers.find(p => p.id === currentPlayerId);

      if (!player || player.is_sold) {
        live.style.display = 'none';
        empty.style.display = 'block';
        return;
      }

      live.style.display = 'block';
      empty.style.display = 'none';

      const currentBid = bidState?.current_bid || S4_BASE;
      const currentBidder = bidState?.current_bidder_id
        ? allCaptains.find(c => c.id === bidState.current_bidder_id)
        : null;

      document.getElementById('liveBidPlayerName').textContent = player.name;
      document.getElementById('liveBidMeta').textContent = 'Base ' + fmtM(S4_BASE) + (player.unsold_at ? ' · Back from unsold' : '');
      document.getElementById('liveBidAmount').textContent = fmtM(currentBid);
      document.getElementById('liveBidder').textContent = currentBidder ? displayCaptainName(currentBidder) : 'No bids yet';

      const afterEl = document.getElementById('liveBidWalletAfter');
      if (currentBidder) {
        const afterWallet = Math.max(0, (currentBidder.wallet || 0) - currentBid);
        afterEl.textContent = `Wallet after sale: ${fmtM(afterWallet)}`;
      } else {
        afterEl.textContent = '';
      }

      const pill = document.getElementById('auctionStatusPill');
      pill.className = 'auction-status-pill';
      if (!bidState?.current_bidder_id) {
        pill.textContent = 'Live';
        pill.classList.add('live');
      } else if (bidState?.bid_locked) {
        pill.textContent = 'Locked';
        pill.classList.add('locked');
      } else {
        pill.textContent = 'Ready to close';
        pill.classList.add('ready');
      }
    }

    function renderCaptainStatus() {
      const wrap = document.getElementById('captainStatusList');
      if (!allCaptains.length) {
        wrap.innerHTML = '<div class="text-muted">No captains found.</div>';
        return;
      }

      wrap.innerHTML = allCaptains.map(c => {
        const bought = allPlayers.filter(p => p.captain_id === c.id && p.is_sold).length;
        return `
          <div class="captain-status-row">
            <div class="captain-status-top">
              <div class="captain-status-name">${displayCaptainName(c)}</div>
              <div class="captain-wallet">${fmtM(c.wallet)}</div>
            </div>
            <div class="captain-status-meta">${bought}/${S4_SLOTS} players bought</div>
            ${warningBadgeHtml(c.wallet, c.captain_group, allPlayers.filter(p => p.captain_id === c.id && p.is_sold))}
          </div>`;
      }).join('');
    }

    function renderRecentSales() {
      const wrap = document.getElementById('recentSalesList');
      const sold = allPlayers.filter(p => p.is_sold);

      const rows = [...sold]
        .sort((a, b) => (b.sold_at ? new Date(b.sold_at).getTime() : 0) - (a.sold_at ? new Date(a.sold_at).getTime() : 0))
        .slice(0, 5);

      if (!rows.length) {
        wrap.innerHTML = '<div class="text-muted">No completed sales yet.</div>';
        return;
      }

      wrap.innerHTML = rows.map(p => {
        const cap = allCaptains.find(c => c.id === p.captain_id);
        return `
          <div class="recent-sale-row">
            <div style="font-weight:600;color:var(--text);">${p.name}</div>
            <div class="captain-status-meta">${cap ? displayCaptainName(cap) : '—'} · ${fmtM(p.sold_price || 0)}</div>
          </div>`;
      }).join('');
    }

    function hideSaleConfirm() {
      document.getElementById('saleConfirmModal').style.display = 'none';
    }

    function confirmCloseBidding() {
      if (!currentPlayerId) return;

      const player = allPlayers.find(p => p.id === currentPlayerId);
      if (!player) return;

      const currentBid = bidState?.current_bid || 0;
      const currentBidderId = bidState?.current_bidder_id;
      const text = document.getElementById('saleConfirmText');

      if (!currentBidderId || currentBid === 0) {
        text.innerHTML = `No bids were placed for <strong>${player.name}</strong>. Mark unsold and send to the back of the queue?`;
        document.getElementById('saleConfirmModal').style.display = 'flex';
        return;
      }

      const captain = allCaptains.find(c => c.id === currentBidderId);
      const isTentative = player?.status === 'tentative';
      const walletCost = isTentative ? 0 : currentBid;
      const afterWallet = Math.max(0, (captain?.wallet || 0) - walletCost);
      text.innerHTML = '<div><strong>Player:</strong> ' + player.name + '</div>'
        + '<div class="mt-8"><strong>Winner:</strong> ' + (captain ? displayCaptainName(captain) : '—') + '</div>'
        + '<div class="mt-8"><strong>Sold Price:</strong> ' + fmtM(currentBid) + '</div>'
        + (isTentative ? '<div class="mt-8" style="color:var(--green);">Tentative — full refund if no-show</div>' : '')
        + '<div class="mt-8"><strong>Wallet After Sale:</strong> ' + fmtM(afterWallet) + '</div>';

      document.getElementById('saleConfirmModal').style.display = 'flex';
    }

    async function finalizeCloseBidding() {
      if (!currentPlayerId) return;

      const msg = document.getElementById('closeMsg');
      const currentBid = bidState?.current_bid || 0;
      const currentBidderId = bidState?.current_bidder_id;
      const player = allPlayers.find(p => p.id === currentPlayerId);

      hideSaleConfirm();

      if (!currentBidderId || currentBid === 0) {
        // S4: an unsold player goes to the back of the queue. unsold_at is the
        // queue marker: players never offered come up first (random order),
        // then unsold players oldest-first. See nextFromQueue() in players.js.
        let unsoldErr = null;
        if (player) {
          const res = await db.from('players').update({ unsold_at: new Date().toISOString() }).eq('id', currentPlayerId);
          unsoldErr = res.error;
        }

        await db.from('bidding_state').update({
          player_id: null,
          current_bid: 0,
          current_bidder_id: null,
          bid_locked: false,
          updated_at: new Date().toISOString()
        }).eq('id', 1);

        if (unsoldErr) {
          msg.textContent = '⚠️ Could not mark ' + (player ? player.name : 'player') + ' unsold (' + unsoldErr.message + '). Run S4_migration.sql in Supabase, then re-queue them manually.';
          setTimeout(() => msg.textContent = '', 12000);
        } else {
          msg.textContent = 'No bids — ' + (player ? player.name : 'player') + ' goes to the back of the queue.';
          setTimeout(() => msg.textContent = '', 4000);
        }
        await loadData();
        const sel0 = document.getElementById('biddingPlayer');
        if (sel0) sel0.value = '';
        return;
      }

      const { data: freshCap } = await db.from('captains').select('wallet').eq('id', currentBidderId).single();
      const captain = allCaptains.find(c => c.id === currentBidderId);
      if (!captain && !freshCap) return;
      const currentWallet = freshCap?.wallet ?? captain?.wallet ?? 0;

      // ── BLOCK: max bid rule (also blocks a full roster and sub-base prices) ──
      const soldForWinner = allPlayers.filter(p => p.captain_id === currentBidderId && p.is_sold);
      const bidCheck = checkBid(currentWallet, soldForWinner, currentBid);
      if (!bidCheck.allowed) {
        msg.textContent = `❌ ${displayCaptainName(captain)}: ${bidCheck.reason} Sale blocked.`;
        setTimeout(() => msg.textContent = '', 8000);
        return;
      }

      await db.from('players').update({
        captain_id: currentBidderId,
        sold_price: currentBid,
        is_sold: true,
        sold_at: new Date().toISOString()
      }).eq('id', currentPlayerId);

      const tentativeBonus = player?.status === 'tentative' ? currentBid : 0;
      await db.from('captains').update({ wallet: currentWallet - currentBid + tentativeBonus }).eq('id', currentBidderId);
      await db.from('bidding_state').update({
        player_id: null,
        current_bid: 0,
        current_bidder_id: null,
        bid_locked: false,
        updated_at: new Date().toISOString()
      }).eq('id', 1);

      lastSale = {
        playerId: player.id,
        playerName: player.name,
        captainId: currentBidderId,
        captainName: displayCaptainName(captain),
        soldPrice: currentBid,
        wasTentative: player?.status === 'tentative'
      };

      showUndoBar();

      msg.textContent = `✓ ${displayCaptainName(captain)} wins for ${fmtM(currentBid)}!`;
      setTimeout(() => msg.textContent = '', 4000);
      await loadData();
      const sel1 = document.getElementById('biddingPlayer');
      if (sel1) sel1.value = '';
    }

    function showUndoBar() {
      if (!lastSale) return;
      const bar = document.getElementById('undoBar');
      const text = document.getElementById('undoBarText');
      text.textContent = `Sold: ${lastSale.playerName} → ${lastSale.captainName} for ${fmtM(lastSale.soldPrice)}`;
      bar.style.display = 'flex';
      if (undoTimer) clearTimeout(undoTimer);
      undoTimer = setTimeout(() => {
        bar.style.display = 'none';
        lastSale = null;
      }, 10000);
    }

    async function undoLastSale() {
      if (!lastSale) return;

      const { data: fresh } = await db.from('captains').select('wallet').eq('id', lastSale.captainId).single();
      const currentWallet = fresh?.wallet ?? allCaptains.find(c => c.id === lastSale.captainId)?.wallet ?? 0;

      await db.from('players').update({
        captain_id: null,
        sold_price: null,
        is_sold: false,
        sold_at: null
      }).eq('id', lastSale.playerId);

      await db.from('captains').update({
        wallet: currentWallet + lastSale.soldPrice - (lastSale.wasTentative ? lastSale.soldPrice : 0)
      }).eq('id', lastSale.captainId);

      document.getElementById('undoBar').style.display = 'none';
      if (undoTimer) clearTimeout(undoTimer);
      lastSale = null;
      loadData();
    }
