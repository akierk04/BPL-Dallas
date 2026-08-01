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

      const currentBid = bidState?.current_bid || player.base_price;
      const currentBidder = bidState?.current_bidder_id
        ? allCaptains.find(c => c.id === bidState.current_bidder_id)
        : null;

      document.getElementById('liveBidPlayerName').textContent = player.name;
      document.getElementById('liveBidMeta').textContent = 'Group ' + player.group_name + ' · Base ' + player.base_price + ' pts';
      document.getElementById('liveBidAmount').textContent = currentBid.toLocaleString();
      document.getElementById('liveBidder').textContent = currentBidder ? displayCaptainName(currentBidder) : 'No bids yet';

      const afterEl = document.getElementById('liveBidWalletAfter');
      if (currentBidder) {
        const afterWallet = Math.max(0, (currentBidder.wallet || 0) - currentBid);
        afterEl.textContent = `Wallet after sale: ${afterWallet.toLocaleString()} pts`;
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
              <div class="captain-wallet">${c.wallet.toLocaleString()} <span style="font-size:0.75rem;color:var(--muted)">pts</span></div>
            </div>
            <div class="captain-status-meta">${bought}/5 players bought</div>
            ${warningBadgeHtml(c.wallet, c.captain_group, allPlayers.filter(p => p.captain_id === c.id && p.is_sold))}
          </div>`;
      }).join('');
    }

    function renderRecentSales() {
      const wrap = document.getElementById('recentSalesList');
      const sold = allPlayers.filter(p => p.is_sold);

      const sessionSale = lastSale
        ? [{
            id: `session-${lastSale.playerId}`,
            name: lastSale.playerName,
            captain_id: lastSale.captainId,
            sold_price: lastSale.soldPrice,
            created_at: new Date().toISOString()
          }]
        : [];

      const rows = [...sessionSale, ...sold]
        .filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i)
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
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
            <div class="captain-status-meta">${cap ? displayCaptainName(cap) : '—'} · ${p.sold_price || 0} pts</div>
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
        text.innerHTML = `No bids were placed for <strong>${player.name}</strong>. Return player to pool?`;
        document.getElementById('saleConfirmModal').style.display = 'flex';
        return;
      }

      const captain = allCaptains.find(c => c.id === currentBidderId);
      const isTentative = player?.status === 'tentative';
      const walletCost = isTentative ? 0 : currentBid;
      const afterWallet = Math.max(0, (captain?.wallet || 0) - walletCost);
      text.innerHTML = '<div><strong>Player:</strong> ' + player.name + ' (Group ' + (player.group_name||'?') + ')</div>'
        + '<div class="mt-8"><strong>Winner:</strong> ' + (captain ? displayCaptainName(captain) : '—') + '</div>'
        + '<div class="mt-8"><strong>Sold Price:</strong> ' + currentBid + ' pts</div>'
        + (isTentative ? '<div class="mt-8" style="color:var(--green);">Tentative — full refund if no-show</div>' : '')
        + '<div class="mt-8"><strong>Wallet After Sale:</strong> ' + afterWallet + ' pts</div>';

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
        await db.from('bidding_state').update({
          player_id: null,
          current_bid: 0,
          current_bidder_id: null,
          bid_locked: false,
          updated_at: new Date().toISOString()
        }).eq('id', 1);

        msg.textContent = 'No bids — player returned to pool.';
        setTimeout(() => msg.textContent = '', 3000);
        await loadData();
        const sel0 = document.getElementById('biddingPlayer');
        if (sel0) sel0.value = '';
        return;
      }

      const { data: freshCap } = await db.from('captains').select('wallet').eq('id', currentBidderId).single();
      const captain = allCaptains.find(c => c.id === currentBidderId);
      if (!captain && !freshCap) return;
      const currentWallet = freshCap?.wallet ?? captain?.wallet ?? 0;

      // ── BLOCK: captain cannot buy from their own group ──
      if (player && String(player.group_name) === String(captain.captain_group)) {
        msg.textContent = `❌ ${displayCaptainName(captain)} is a G${captain.captain_group} captain — cannot buy G${player.group_name} players. Sale blocked.`;
        setTimeout(() => msg.textContent = '', 6000);
        return;
      }

      // ── BLOCK: captain has no remaining slot for this group ──
      const soldForWinner = allPlayers.filter(p => p.captain_id === currentBidderId && p.is_sold);
      const neededForWinner = groupsStillNeeded(captain.captain_group, soldForWinner);
      if (player && neededForWinner.indexOf(String(player.group_name)) === -1) {
        msg.textContent = `❌ ${displayCaptainName(captain)} has no remaining G${player.group_name} slot. Sale blocked.`;
        setTimeout(() => msg.textContent = '', 6000);
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

      msg.textContent = `✓ ${displayCaptainName(captain)} wins for ${currentBid} pts!`;
      setTimeout(() => msg.textContent = '', 4000);
      await loadData();
      const sel1 = document.getElementById('biddingPlayer');
      if (sel1) sel1.value = '';
    }

    function showUndoBar() {
      if (!lastSale) return;
      const bar = document.getElementById('undoBar');
      const text = document.getElementById('undoBarText');
      text.textContent = `Sold: ${lastSale.playerName} → ${lastSale.captainName} for ${lastSale.soldPrice} pts`;
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
