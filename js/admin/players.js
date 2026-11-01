// Player pool, bidding dropdowns, manual assign, roster assignments
// Extracted from admin.html during Admin refactor.
// Season 4: no player groups. Random draw + back-of-queue + max bid rule.

function renderPlayersList() {
      const list = document.getElementById('playersList'), count = document.getElementById('playerCount');
      const avail = allPlayers.filter(p => !p.is_sold).length;
      count.textContent = `(${avail} available · ${allPlayers.length - avail} sold · ${allPlayers.length} total)`;
      if (!allPlayers.length) { list.innerHTML = '<div class="text-muted">No players in pool yet.</div>'; return; }
      list.innerHTML = allPlayers.map(p => {
        const cap = allCaptains.find(c => c.id === p.captain_id);
        const isTentative = p.status === 'tentative';
        return `
          <div class="player-row">
            <span class="player-row-name">${p.name}</span>
            <select onchange="updatePlayerStatus('${p.id}', this.value)" style="font-size:12px;padding:4px 8px;border-radius:6px;background:var(--surface2);border:1px solid ${isTentative ? 'rgba(240,192,64,0.5)' : 'var(--border)'};color:${isTentative ? 'var(--accent)' : 'var(--text)'};font-family:var(--font-body);width:auto;">
              <option value="confirmed" ${!isTentative ? 'selected' : ''}>Confirmed</option>
              <option value="tentative" ${isTentative ? 'selected' : ''}>Tentative</option>
            </select>
            <span class="player-row-meta">${fmtM(S4_BASE)} base</span>
            ${p.is_sold ? `<span class="sold-badge">Sold → ${cap ? displayCaptainName(cap) : '?'} · ${fmtM(p.sold_price)}</span>` : `<span class="unsold-badge">${p.unsold_at ? 'Unsold · back of queue' : 'Available'}</span>`}
            <div class="player-row-actions">
              ${!p.is_sold ? `<button class="btn-sm" onclick="quickAssign('${p.id}')">Assign →</button>` : ''}
              <button class="btn-danger" onclick="deletePlayer('${p.id}')">Delete</button>
            </div>
          </div>`;
      }).join('');
    }

    async function addPlayer() {
      const name = document.getElementById('playerName').value.trim();
      const status = document.getElementById('playerStatus').value;
      const msg = document.getElementById('playerMsg');
      if (!name) { msg.textContent = 'Enter a player name.'; return; }
      // group_name is a legacy column; S4 writes a constant so DB constraints still pass.
      const { error } = await db.from('players').insert({ name, group_name: S4_LEGACY_GROUP, base_price: S4_BASE, status });
      if (error) { msg.textContent = 'Error: ' + error.message; return; }
      document.getElementById('playerName').value = '';
      msg.textContent = `${name} added.`;
      setTimeout(() => msg.textContent = '', 3000);
      loadData();
    }

    async function deletePlayer(id) {
      if (!confirm('Delete this player?')) return;
      await db.from('players').delete().eq('id', id);
      loadData();
    }

    async function updatePlayerStatus(id, newStatus) {
      await db.from('players').update({ status: newStatus }).eq('id', id);
      loadData();
    }

    function populateBiddingDropdown() {
      const sel = document.getElementById('biddingPlayer');
      const cur = sel.value;
      const unsold = allPlayers.filter(p => !p.is_sold);
      // Shuffle so the manual list does not reveal the draw order
      for (let i = unsold.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [unsold[i], unsold[j]] = [unsold[j], unsold[i]];
      }
      sel.innerHTML = '<option value="">Pick a specific player (manual)...</option>' +
        unsold.map(p => `
          <option value="${p.id}" ${p.id === cur ? 'selected' : ''}>${p.name} · ${fmtM(S4_BASE)}${p.unsold_at ? ' · Unsold' : ''}${p.status === 'tentative' ? ' · Tentative' : ''}</option>`).join('');
      if (currentPlayerId) sel.value = currentPlayerId;
      updateQueueStatus();
    }

    // ── Queue: random draw, unsold players go to the back ──
    // Order of play:
    //   1. Players who have never been offered, drawn at random.
    //   2. Once every fresh player has been offered, unsold players come back
    //      oldest-first (the first player to go unsold is the first to return).
    // unsold_at is stamped when bidding closes with no bids (auction.js).
    function liveUnsoldPlayer() {
      return currentPlayerId ? allPlayers.find(p => p.id === currentPlayerId && !p.is_sold) : null;
    }

    function queueCounts() {
      const pool = allPlayers.filter(p => !p.is_sold && p.id !== currentPlayerId);
      const fresh = pool.filter(p => !p.unsold_at).length;
      return { fresh, returned: pool.length - fresh, total: pool.length };
    }

    function nextFromQueue() {
      const pool = allPlayers.filter(p => !p.is_sold && p.id !== currentPlayerId);
      if (!pool.length) return null;
      const fresh = pool.filter(p => !p.unsold_at);
      if (fresh.length) return fresh[Math.floor(Math.random() * fresh.length)];
      return pool.slice().sort((a, b) => new Date(a.unsold_at) - new Date(b.unsold_at))[0];
    }

    function updateQueueStatus() {
      const btn = document.getElementById('drawNextBtn');
      const info = document.getElementById('queueStatus');
      const q = queueCounts();
      const live = !!liveUnsoldPlayer();
      if (btn) {
        btn.disabled = live || q.total === 0;
        btn.style.opacity = (live || q.total === 0) ? '0.45' : '1';
        btn.textContent = q.total === 0
          ? '\uD83C\uDFB2 Queue empty'
          : '\uD83C\uDFB2 Draw Next Player \u00b7 ' + q.total + ' left' + (q.returned ? ' (' + q.returned + ' unsold)' : '');
      }
      if (info) info.style.display = 'none';
    }

    async function goLive(pid) {
      const { error } = await db.from('bidding_state').update({
        player_id: pid,
        current_bid: 0,
        current_bidder_id: null,
        bid_locked: false,
        bid_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq('id', 1);
      return error;
    }

    async function drawNextPlayer() {
      const msg = document.getElementById('biddingMsg');
      if (liveUnsoldPlayer()) { msg.textContent = 'A player is already live. Close bidding or cancel first.'; return; }
      const pick = nextFromQueue();
      if (!pick) { msg.textContent = 'No players left in the queue.'; return; }
      const err = await goLive(pick.id);
      if (err) { msg.textContent = 'Error: ' + err.message; return; }
      msg.textContent = pick.name + ' is live' + (pick.unsold_at ? ' (back from unsold).' : '.');
      setTimeout(() => msg.textContent = '', 4000);
      await loadData();
      document.getElementById('consolePlayer').value = pick.id;
      updateConsoleWarning();
    }

    // Manual pick from the dropdown (override for the random draw)
    async function setBiddingPlayer() {
      const pid = document.getElementById('biddingPlayer').value, msg = document.getElementById('biddingMsg');
      if (!pid) { msg.textContent = 'Select a player first.'; return; }
      const err = await goLive(pid);
      if (err) { msg.textContent = 'Error: ' + err.message; return; }
      msg.textContent = 'Player set live!';
      setTimeout(() => msg.textContent = '', 3000);
      await loadData();
      // Pre-select the live player in Manual Override console
      document.getElementById('consolePlayer').value = pid;
      updateConsoleWarning();
    }

    async function clearBiddingPlayer() {
      await db.from('bidding_state').update({
        player_id: null,
        current_bid: 0,
        current_bidder_id: null,
        bid_locked: false,
        updated_at: new Date().toISOString()
      }).eq('id', 1);
      document.getElementById('biddingMsg').textContent = 'Cleared.';
      setTimeout(() => document.getElementById('biddingMsg').textContent = '', 2000);
      await loadData();
      // populateBiddingDropdown() preserves whatever the dropdown was showing
      // before the rebuild -- which is Sushrut's stale selection, not the
      // cleared state -- so force it back to the placeholder explicitly.
      const sel = document.getElementById('biddingPlayer');
      if (sel) sel.value = '';
    }

    let _assigning = false;

    function populateConsoleDropdowns() {
      const pSel  = document.getElementById('consolePlayer'), cSel = document.getElementById('consoleCaptain');
      const cur_p = pSel.value || currentPlayerId || '';
      const cur_c = cSel.value;
      pSel.innerHTML = '<option value="">Select player...</option>' +
        allPlayers.filter(p => !p.is_sold).map(p =>
          `<option value="${p.id}" ${p.id === cur_p ? 'selected' : ''}>${p.name}${p.status === 'tentative' ? ' · Tentative' : ''}</option>`
        ).join('');
      cSel.innerHTML = '<option value="">Select captain...</option>' +
        allCaptains.map(c => {
          const sold = allPlayers.filter(p => p.captain_id === c.id && p.is_sold);
          return `<option value="${c.id}" ${c.id === cur_c ? 'selected' : ''}>${displayCaptainName(c)} · ${fmtM(c.wallet)} left · max ${fmtM(maxBid(c.wallet, sold))}</option>`;
        }).join('');
      renderCaptainPicker();
    }

    // Tap-to-pick captain buttons. The hidden #consoleCaptain select stays the source of truth
    // so doAssign() and updateConsoleWarning() are unchanged.
    function renderCaptainPicker() {
      const wrap = document.getElementById('captainPicker');
      const sel = document.getElementById('consoleCaptain');
      if (!wrap || !sel) return;
      const chosen = sel.value;
      wrap.innerHTML = allCaptains.map(c => {
        const sold = allPlayers.filter(p => p.captain_id === c.id && p.is_sold);
        const left = spotsLeft(sold);
        const full = left === 0;
        const sub = full ? 'Squad full' : 'max ' + fmtM(maxBid(c.wallet, sold)) + ' \u00b7 ' + left + ' left';
        return `<button type="button" class="cap-btn${c.id === chosen ? ' selected' : ''}${full ? ' full' : ''}" ${full ? 'disabled' : ''} onclick="pickCaptain('${c.id}')">`
          + `<span class="cap-btn-name">${displayCaptainName(c)}</span><span class="cap-btn-sub">${sub}</span></button>`;
      }).join('');
    }

    function pickCaptain(id) {
      document.getElementById('consoleCaptain').value = id;
      renderCaptainPicker();
      updateConsoleWarning();
      const price = document.getElementById('consolePrice');
      if (price) price.focus();
    }

    function quickAssign(playerId) {
      switchTab('auction-control');
      setTimeout(() => {
        document.getElementById('consolePlayer').value = playerId;
      }, 50);
    }

    function updateConsoleWarning() {
      const captainId = document.getElementById('consoleCaptain').value;
      const warn      = document.getElementById('consoleWarning');
      if (!captainId) { warn.innerHTML = ''; return; }
      const captain    = allCaptains.find(c => c.id === captainId);
      const soldForCap = allPlayers.filter(p => p.captain_id === captainId && p.is_sold);
      let html = warningBadgeHtml(captain.wallet, captain.captain_group, soldForCap);

      // Check the typed price against the max bid rule as soon as one is entered
      const raw = document.getElementById('consolePrice').value;
      if (raw !== '') {
        const chk = checkBid(captain.wallet, soldForCap, parseInt(raw, 10));
        html += chk.allowed
          ? `<div style="margin-top:6px;padding:7px 12px;border-radius:8px;background:rgba(62,207,142,0.08);border:1px solid rgba(62,207,142,0.35);font-size:13px;font-weight:500;color:var(--green);">✓ ${fmtM(parseInt(raw, 10))} is a legal bid for ${displayCaptainName(captain)}.</div>`
          : `<div style="margin-top:6px;padding:7px 12px;border-radius:8px;background:rgba(224,90,43,0.1);border:1px solid rgba(224,90,43,0.4);font-size:13px;font-weight:500;color:var(--red);">❌ ${chk.reason}</div>`;
      }
      warn.innerHTML = html;
    }

    async function doAssign(thenDraw) {
      const playerId = document.getElementById('consolePlayer').value, captainId = document.getElementById('consoleCaptain').value;
      const price = parseInt(document.getElementById('consolePrice').value), msg = document.getElementById('consoleMsg');
      if (_assigning) return; // ignore a second tap while a sale is being written
      if (!playerId || !captainId || isNaN(price) || price < 0) { msg.textContent = 'Pick a player, a captain and a price.'; return; }
      const captain = allCaptains.find(c => c.id === captainId);

      // ── BLOCK: max bid rule (also blocks a full roster and sub-base prices) ──
      const soldForCap = allPlayers.filter(p => p.captain_id === captainId && p.is_sold);
      const chk = checkBid(captain.wallet, soldForCap, price);
      if (!chk.allowed) { msg.textContent = `❌ ${displayCaptainName(captain)}: ${chk.reason}`; return; }

      _assigning = true;
      try {

      await db.from('players').update({
        captain_id: captainId,
        sold_price: price,
        is_sold: true,
        sold_at: new Date().toISOString()
      }).eq('id', playerId);

      const assignedPlayer = allPlayers.find(p => p.id === playerId);
      const tentativeBonus = assignedPlayer?.status === 'tentative' ? price : 0;
      await db.from('captains').update({ wallet: captain.wallet - price + tentativeBonus }).eq('id', captainId);
      if (playerId === currentPlayerId) {
        await db.from('bidding_state').update({
          player_id: null,
          current_bid: 0,
          current_bidder_id: null,
          bid_locked: false,
          updated_at: new Date().toISOString()
        }).eq('id', 1);
      }

      lastSale = {
        playerId,
        playerName: allPlayers.find(p => p.id === playerId)?.name || 'Player',
        captainId,
        captainName: displayCaptainName(captain),
        soldPrice: price
      };
      showUndoBar();

      document.getElementById('consolePlayer').value = '';
      document.getElementById('consoleCaptain').value = '';
      document.getElementById('consolePrice').value = '';
      document.getElementById('consoleWarning').innerHTML = '';
      msg.textContent = 'Player assigned!';
      setTimeout(() => msg.textContent = '', 3000);
      const wasLivePlayer = playerId === currentPlayerId;
      await loadData();
      if (wasLivePlayer) {
        const sel = document.getElementById('biddingPlayer');
        if (sel) sel.value = '';
      }
      if (thenDraw === true) await drawNextPlayer();
      } finally {
        _assigning = false;
      }
    }

    async function unassignPlayer(playerId, captainId, soldPrice) {
      if (!confirm('Unassign this player and refund the purse?')) return;
      const { data: fresh } = await db.from('captains').select('wallet').eq('id', captainId).single();
      const currentWallet = fresh?.wallet ?? allCaptains.find(c => c.id === captainId)?.wallet ?? 0;
      const player = allPlayers.find(p => p.id === playerId);
      // Tentative bonus = sold price (full refund given at sale, so reverse it on unassign)
      const tentativeBonus = player?.status === 'tentative' ? soldPrice : 0;
      await db.from('players').update({ captain_id: null, sold_price: null, is_sold: false, sold_at: null }).eq('id', playerId);
      // Refund sold price but reverse the tentative bonus that was given at purchase
      await db.from('captains').update({ wallet: currentWallet + soldPrice - tentativeBonus }).eq('id', captainId);
      loadData();
    }
