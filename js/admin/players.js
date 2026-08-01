// Player pool, bidding dropdowns, manual assign, roster assignments
// Extracted from admin.html during Admin refactor.

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
            <select onchange="updatePlayerGroup('${p.id}', this.value)" style="font-size:12px;padding:4px 8px;border-radius:6px;background:var(--surface2);border:1px solid var(--border);color:var(--text);font-family:var(--font-body);width:auto;">
              <option value="1" ${p.group_name === '1' ? 'selected' : ''}>Group 1</option>
              <option value="2" ${p.group_name === '2' ? 'selected' : ''}>Group 2</option>
              <option value="3" ${p.group_name === '3' ? 'selected' : ''}>Group 3</option>
              <option value="4" ${p.group_name === '4' ? 'selected' : ''}>Group 4</option>
              <option value="5" ${p.group_name === '5' ? 'selected' : ''}>Group 5</option>
              <option value="6" ${p.group_name === '6' ? 'selected' : ''}>Group 6</option>
            </select>
            <select onchange="updatePlayerStatus('${p.id}', this.value)" style="font-size:12px;padding:4px 8px;border-radius:6px;background:var(--surface2);border:1px solid ${isTentative ? 'rgba(240,192,64,0.5)' : 'var(--border)'};color:${isTentative ? 'var(--accent)' : 'var(--text)'};font-family:var(--font-body);width:auto;">
              <option value="confirmed" ${!isTentative ? 'selected' : ''}>Confirmed</option>
              <option value="tentative" ${isTentative ? 'selected' : ''}>Tentative</option>
            </select>
            <span class="player-row-meta">${p.base_price} pts base</span>
            ${p.is_sold ? `<span class="sold-badge">Sold → ${cap ? displayCaptainName(cap) : '?'} · ${p.sold_price} pts</span>` : `<span class="unsold-badge">Available</span>`}
            <div class="player-row-actions">
              ${!p.is_sold ? `<button class="btn-sm" onclick="quickAssign('${p.id}')">Assign →</button>` : ''}
              <button class="btn-danger" onclick="deletePlayer('${p.id}')">Delete</button>
            </div>
          </div>`;
      }).join('');
    }

    async function addPlayer() {
      const name = document.getElementById('playerName').value.trim(), group = document.getElementById('playerGroup').value;
      const status = document.getElementById('playerStatus').value;
      const msg = document.getElementById('playerMsg');
      if (!name) { msg.textContent = 'Enter a player name.'; return; }
      const basePrice = GROUP_BASE[group] || 0;
      const { error } = await db.from('players').insert({ name, group_name: group, base_price: basePrice, status });
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

    async function updatePlayerGroup(id, newGroup) {
      const basePrice = GROUP_BASE[newGroup] || 0;
      await db.from('players').update({ group_name: newGroup, base_price: basePrice }).eq('id', id);
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
      // Shuffle for random presentation order
      for (let i = unsold.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [unsold[i], unsold[j]] = [unsold[j], unsold[i]];
      }
      sel.innerHTML = '<option value="">Select player to go live...</option>' +
        unsold.map(p => `
          <option value="${p.id}" ${p.id === cur ? 'selected' : ''}>${p.name} · Group ${p.group_name} · ${p.base_price} pts${p.status === 'tentative' ? ' · Tentative' : ''}</option>`).join('');
      if (currentPlayerId) sel.value = currentPlayerId;
      updateRandomButtons();
    }

    // ── Random player picker ──
    function pickRandom(group) {
      const unsoldInGroup = allPlayers.filter(p => !p.is_sold && String(p.group_name) === String(group));
      if (!unsoldInGroup.length) return;
      const pick = unsoldInGroup[Math.floor(Math.random() * unsoldInGroup.length)];
      const sel  = document.getElementById('biddingPlayer');
      sel.value  = pick.id;
      const msg  = document.getElementById('biddingMsg');
      msg.textContent = pick.name + ' (G' + group + ') selected — click Go Live to confirm.';
      setTimeout(() => msg.textContent = '', 5000);
    }

    function updateRandomButtons() {
      ['1','2','3','4','5','6'].forEach(g => {
        const btn = document.getElementById('randG' + g);
        if (!btn) return;
        const available = allPlayers.filter(p => !p.is_sold && String(p.group_name) === g).length;
        btn.disabled = available === 0;
        btn.title    = available === 0 ? 'No G' + g + ' players left' : available + ' G' + g + ' player' + (available !== 1 ? 's' : '') + ' available';
        btn.style.opacity = available === 0 ? '0.35' : '1';
      });
    }

    async function setBiddingPlayer() {
      const pid = document.getElementById('biddingPlayer').value, msg = document.getElementById('biddingMsg');
      if (!pid) { msg.textContent = 'Select a player first.'; return; }
      await db.from('bidding_state').update({
        player_id: pid,
        current_bid: 0,
        current_bidder_id: null,
        bid_locked: false,
        bid_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq('id', 1);
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
      loadData();
    }

    function populateConsoleDropdowns() {
      const pSel  = document.getElementById('consolePlayer'), cSel = document.getElementById('consoleCaptain');
      const cur_p = pSel.value || currentPlayerId || '';
      const cur_c = cSel.value;
      pSel.innerHTML = '<option value="">Select player...</option>' +
        allPlayers.filter(p => !p.is_sold).map(p =>
          `<option value="${p.id}" ${p.id === cur_p ? 'selected' : ''}>${p.name} · Group ${p.group_name}${p.status === 'tentative' ? ' · Tentative' : ''}</option>`
        ).join('');
      cSel.innerHTML = '<option value="">Select captain...</option>' +
        allCaptains.map(c =>
          `<option value="${c.id}" ${c.id === cur_c ? 'selected' : ''}>${displayCaptainName(c)} · ${c.wallet.toLocaleString()} pts left</option>`
        ).join('');
    }

    function quickAssign(playerId) {
      switchTab('auction-control');
      setTimeout(() => {
        document.getElementById('consolePlayer').value = playerId;
      }, 50);
    }

    function updateConsoleWarning() {
      const captainId = document.getElementById('consoleCaptain').value;
      const playerId  = document.getElementById('consolePlayer').value;
      const warn      = document.getElementById('consoleWarning');
      if (!captainId) { warn.innerHTML = ''; return; }
      const captain    = allCaptains.find(c => c.id === captainId);
      const soldForCap = allPlayers.filter(p => p.captain_id === captainId && p.is_sold);
      let html = warningBadgeHtml(captain.wallet, captain.captain_group, soldForCap);

      // Show eligibility warning when a player is also selected
      if (playerId) {
        const player = allPlayers.find(p => p.id === playerId);
        if (player) {
          if (String(player.group_name) === String(captain.captain_group)) {
            html += `<div style="margin-top:6px;padding:7px 12px;border-radius:8px;background:rgba(224,90,43,0.1);border:1px solid rgba(224,90,43,0.4);font-size:13px;font-weight:500;color:var(--red);">❌ ${displayCaptainName(captain)} is a G${captain.captain_group} captain — cannot buy G${player.group_name} players.</div>`;
          } else {
            const needed = groupsStillNeeded(captain.captain_group, soldForCap);
            if (needed.indexOf(String(player.group_name)) === -1) {
              html += `<div style="margin-top:6px;padding:7px 12px;border-radius:8px;background:rgba(224,90,43,0.1);border:1px solid rgba(224,90,43,0.4);font-size:13px;font-weight:500;color:var(--red);">❌ No remaining G${player.group_name} slot for ${displayCaptainName(captain)}.</div>`;
            } else {
              html += `<div style="margin-top:6px;padding:7px 12px;border-radius:8px;background:rgba(62,207,142,0.08);border:1px solid rgba(62,207,142,0.35);font-size:13px;font-weight:500;color:var(--green);">✓ ${displayCaptainName(captain)} can buy G${player.group_name} players.</div>`;
            }
          }
        }
      }
      warn.innerHTML = html;
    }

    async function doAssign() {
      const playerId = document.getElementById('consolePlayer').value, captainId = document.getElementById('consoleCaptain').value;
      const price = parseInt(document.getElementById('consolePrice').value), msg = document.getElementById('consoleMsg');
      if (!playerId || !captainId || isNaN(price) || price < 0) { msg.textContent = 'Fill all fields.'; return; }
      const captain = allCaptains.find(c => c.id === captainId);
      const player  = allPlayers.find(p => p.id === playerId);

      // ── BLOCK: same group ──
      if (player && String(player.group_name) === String(captain.captain_group)) {
        msg.textContent = `❌ ${displayCaptainName(captain)} is a G${captain.captain_group} captain — cannot be assigned G${player.group_name} players.`;
        return;
      }

      // ── BLOCK: slot already filled ──
      const soldForCap = allPlayers.filter(p => p.captain_id === captainId && p.is_sold);
      const needed     = groupsStillNeeded(captain.captain_group, soldForCap);
      if (player && needed.indexOf(String(player.group_name)) === -1) {
        msg.textContent = `❌ ${displayCaptainName(captain)} has no remaining G${player.group_name} slot.`;
        return;
      }

      if (price > captain.wallet) { msg.textContent = `${displayCaptainName(captain)} only has ${captain.wallet} pts left.`; return; }

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
      msg.textContent = 'Player assigned!';
      setTimeout(() => msg.textContent = '', 3000);
      loadData();
    }

    async function unassignPlayer(playerId, captainId, soldPrice) {
      if (!confirm('Unassign this player and refund the points?')) return;
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
