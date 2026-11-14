// Fixtures, match result entry, scorers, MVP, edit/delete match results
// Extracted from admin.html during Admin refactor.

function populateMatchDropdowns() {
      const home = document.getElementById('matchHome'), away = document.getElementById('matchAway');
      const currentHome = home.value, currentAway = away.value;
      const opts = '<option value="">Select team...</option>' + allCaptains.map(c => `<option value="${c.id}">${displayCaptainName(c)}</option>`).join('');
      home.innerHTML = opts; away.innerHTML = opts;
      if (currentHome) home.value = currentHome;
      if (currentAway) away.value = currentAway;
    }

    // ── loadFixtureForResult — scroll to result form ──
    function loadFixtureForResult(matchId) {
      loadFixture(matchId);
      setTimeout(() => {
        const el = document.getElementById('matchHome');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }

    // ── Sort helpers ──
    function fixtureSortValue(m) {
      const val = Number(m.display_order);
      return Number.isNaN(val) ? 9999 : val;
    }

    function sortMatchesForDisplay(matches) {
      return [...matches].sort((a, b) => {
        const diff = fixtureSortValue(a) - fixtureSortValue(b);
        if (diff !== 0) return diff;
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      });
    }

    // ── Round fixture cards with ↑↓ reorder ──
    function renderFixtures() {
      updateGenerateButtons();
      const wrap = document.getElementById('roundFixturesWrap');
      if (!wrap) return;
      let html = '';

      // ── League Stage — single flat group, ordered by display_order ──
      const leagueMatches = sortMatchesForDisplay(
        allMatches.filter(function(m) { return isLeagueRound(m.round); })
      );
      if (leagueMatches.length) {
        let leagueHtml = '<div style="margin-bottom:20px;">'
          + '<div class="section-title" style="margin-bottom:10px;">League Stage Fixtures</div>'
          + '<div style="display:flex;flex-direction:column;gap:8px;">';
        leagueMatches.forEach(function(m, i) {
          const h = allCaptains.find(function(c) { return c.id === m.home_captain_id; });
          const a = allCaptains.find(function(c) { return c.id === m.away_captain_id; });
          const label = m.display_order ? 'Match ' + m.display_order : 'Match ' + (i+1);
          const played = m.played;
          const borderColor = played ? 'rgba(62,207,142,0.3)' : 'var(--border)';
          const sameRound = leagueMatches;
          const roundIdx  = sameRound.findIndex(function(x) { return x.id === m.id; });
          leagueHtml += '<div style="background:var(--surface);border:1px solid ' + borderColor + ';border-radius:var(--radius);padding:12px 14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">'
            + '<div style="flex:1;min-width:0;">'
            + '<div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);margin-bottom:3px;">' + label + (played ? ' · <span style="color:var(--green);">Played</span>' : '') + '</div>'
            + '<div style="font-size:14px;font-weight:600;color:var(--text);">' + (h ? displayCaptainName(h) : 'TBD') + ' vs ' + (a ? displayCaptainName(a) : 'TBD') + '</div>'
            + (played ? '<div style="font-size:12px;color:var(--accent);font-family:var(--font-display);">' + m.home_score + ' – ' + m.away_score + '</div>' : '')
            + '</div>'
            + '<div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">'
            + (!played ? '<button class="btn-primary" onclick="loadFixtureForResult(\'' + m.id + '\')" style="width:auto;padding:7px 12px;font-size:0.8rem;">Enter Result</button>' : '')
            + '<button class="btn-sm" onclick="moveFixture(\'' + m.id + '\',\'' + m.round + '\',-1)" style="width:auto;padding:6px 10px;" ' + (roundIdx===0?'disabled':'') + '>↑</button>'
            + '<button class="btn-sm" onclick="moveFixture(\'' + m.id + '\',\'' + m.round + '\',1)" style="width:auto;padding:6px 10px;" ' + (roundIdx===sameRound.length-1?'disabled':'') + '>↓</button>'
            + '<button class="btn-danger" onclick="confirmDeleteFixture(\'' + m.id + '\')" style="padding:6px 10px;">✕</button>'
            + '</div></div>';
        });
        leagueHtml += '</div></div>';
        html += leagueHtml;
      }
      const koMatches = PLAYOFF_ROUNDS
        .map(function(r) { return allMatches.find(function(x) { return x.round === r.code; }); })
        .filter(Boolean);
      const bState = computeBracket(allCaptains, allMatches, allTiebreaks);
      if (bState.mismatches.length) {
        html += '<div style="background:rgba(224,90,43,0.1);border:1px solid rgba(224,90,43,0.4);border-radius:var(--radius);padding:12px 14px;margin-bottom:14px;font-size:13px;color:var(--red);">'
          + 'Fixture(s) ' + bState.mismatches.join(', ') + ' have different teams than the results now imply (a result was edited after they were generated). '
          + 'Delete those fixtures with the X button, then press Generate Next Playoff Round.</div>';
      }
      if (koMatches.length) {
        let koHtml = '<div style="margin-bottom:20px;">'
          + '<div class="section-title" style="margin-bottom:10px;">Playoff Fixtures</div>'
          + '<div style="display:flex;flex-direction:column;gap:8px;">';
        koMatches.forEach(function(m) {
          const h = allCaptains.find(function(c) { return c.id === m.home_captain_id; });
          const a = allCaptains.find(function(c) { return c.id === m.away_captain_id; });
          const played = m.played;
          const borderColor = played ? 'rgba(62,207,142,0.3)' : 'var(--border)';
          koHtml += '<div style="background:var(--surface);border:1px solid ' + borderColor + ';border-radius:var(--radius);padding:12px 14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">'
            + '<div style="flex:1;min-width:0;">'
            + '<div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);margin-bottom:3px;">' + roundLabel(m.round) + ' · ' + roundMinutes(m.round) + ' min' + (played ? ' · <span style="color:var(--green);">Played</span>' : '') + '</div>'
            + '<div style="font-size:14px;font-weight:600;color:var(--text);">' + (h ? displayCaptainName(h) : 'TBD') + ' vs ' + (a ? displayCaptainName(a) : 'TBD') + '</div>'
            + (played ? '<div style="font-size:12px;color:var(--accent);font-family:var(--font-display);">' + m.home_score + ' – ' + m.away_score + '</div>' : '')
            + '</div>'
            + '<div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">'
            + (!played ? '<button class="btn-primary" onclick="loadFixtureForResult(\'' + m.id + '\')" style="width:auto;padding:7px 12px;font-size:0.8rem;">Enter Result</button>' : '')
            + '<button class="btn-danger" onclick="confirmDeleteFixture(\'' + m.id + '\')" style="padding:6px 10px;">✕</button>'
            + '</div></div>';
        });
        koHtml += '</div></div>';
        html += koHtml;
      }

      if (!html) html = '<div class="text-muted" style="margin-bottom:20px;">No fixtures yet. Use Generate League Matches to start.</div>';
      wrap.innerHTML = html;
    }

    // ── Move fixture ↑↓ within round ──
    async function moveFixture(matchId, round, direction) {
      const rMatches = sortMatchesForDisplay(allMatches.filter(m => String(m.round) === String(round)));
      const idx = rMatches.findIndex(m => m.id === matchId);
      const swapIdx = idx + direction;
      if (idx === -1 || swapIdx < 0 || swapIdx >= rMatches.length) return;

      const a = rMatches[idx], b = rMatches[swapIdx];
      const aOrder = a.display_order, bOrder = b.display_order;

      // 3-step sequential write to avoid unique constraint violation
      await db.from('matches').update({ display_order: null }).eq('id', a.id);
      await db.from('matches').update({ display_order: aOrder }).eq('id', b.id);
      await db.from('matches').update({ display_order: bOrder }).eq('id', a.id);
      await loadData();
    }

    // ── Delete fixture ──
    let pendingDeleteFixtureId = null;

    function confirmDeleteFixture(matchId) {
      const m = allMatches.find(x => x.id === matchId);
      if (!m) return;
      pendingDeleteFixtureId = matchId;
      const h = allCaptains.find(c => c.id === m.home_captain_id);
      const a = allCaptains.find(c => c.id === m.away_captain_id);
      const label = m.round ? (isLeagueRound(m.round) ? 'League Stage' : m.round) : 'Fixture';
      document.getElementById('deleteFixtureLabel').textContent = `Delete: ${label} · ${displayCaptainName(h)} vs ${displayCaptainName(a)}?`;
      document.getElementById('deleteFixtureWrap').style.display = 'block';
      document.getElementById('deleteFixtureWrap').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function clearDeleteFixture() {
      pendingDeleteFixtureId = null;
      document.getElementById('deleteFixtureWrap').style.display = 'none';
    }

    async function deleteSelectedFixture() {
      if (!pendingDeleteFixtureId) return;
      await db.from('goals').delete().eq('match_id', pendingDeleteFixtureId);
      await db.from('matches').delete().eq('id', pendingDeleteFixtureId);
      clearDeleteFixture();
      await loadData();
    }

    // ── Generate rounds ──
    // ── Generate League Stage fixtures (single group, 4 matches per team) ──
    // Balanced schedule: each captain plays its 2 nearest + 2 next-nearest
    // neighbors in a fixed rotation (circulant graph, offsets 1 and 2).
    // Every team gets exactly 4 matches and the pairing is structurally
    // identical for every team regardless of captain order -- nobody's
    // schedule is harder or easier by construction. For 9 teams this
    // produces 18 matches; the same construction generalizes to any team
    // count where round(n*4/2) matches makes sense.
    async function generateLeagueMatches() {
      const msg = document.getElementById('generateMsg');

      const existing = allMatches.filter(m => isLeagueRound(m.round));
      if (existing.length) {
        msg.textContent = 'League fixtures already exist. Delete them first.';
        setTimeout(() => msg.textContent = '', 4000);
        return;
      }

      if (allCaptains.length < 3) {
        msg.textContent = 'Need at least 3 captains to generate League fixtures.';
        setTimeout(() => msg.textContent = '', 4000);
        return;
      }

      function buildLeagueFixtures(caps) {
        const n = caps.length;
        const seen = new Set();
        const pairs = [];
        for (let i = 0; i < n; i++) {
          for (const off of [1, 2]) {
            const a = i, b = (i + off) % n;
            if (a === b) continue;
            const key = Math.min(a, b) + '_' + Math.max(a, b);
            if (!seen.has(key)) {
              seen.add(key);
              pairs.push({ home: caps[a].id, away: caps[b].id });
            }
          }
        }
        return pairs;
      }

      // Order the fixtures so that:
      //  1. No team ever plays two matches back-to-back (gap of 0).
      //  2. No team plays the "alternate" pattern -- play, sit exactly one
      //     match out, play again -- more than once across their whole
      //     schedule. Random search with rejection; 9-team schedules
      //     typically resolve in a few thousand attempts, capped well
      //     above that so it can't hang.
      function buildValidOrder(pairs) {
        function isValid(order) {
          for (let i = 0; i < order.length - 1; i++) {
            const cur = order[i], next = order[i + 1];
            if (cur.home === next.home || cur.home === next.away || cur.away === next.home || cur.away === next.away) return false;
          }
          const positions = {};
          order.forEach((p, idx) => {
            (positions[p.home] = positions[p.home] || []).push(idx);
            (positions[p.away] = positions[p.away] || []).push(idx);
          });
          for (const t in positions) {
            const pos = positions[t];
            let altCount = 0;
            for (let i = 0; i < pos.length - 1; i++) {
              if (pos[i + 1] - pos[i] === 2) altCount++;
            }
            if (altCount > 1) return false;
          }
          return true;
        }

        for (let attempt = 0; attempt < 100000; attempt++) {
          const order = [...pairs];
          for (let i = order.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [order[i], order[j]] = [order[j], order[i]];
          }
          if (isValid(order)) return order;
        }

        // Fallback: shouldn't happen in practice (verified well under
        // 30000 attempts typical for 9 teams), but never hang forever --
        // fall back to just enforcing no-back-to-back if the stricter
        // search somehow can't find a fit.
        const rem = pairs.slice();
        const result = [];
        let last = null;
        while (rem.length) {
          let idx = rem.findIndex(p =>
            !last || (p.home !== last.home && p.home !== last.away && p.away !== last.home && p.away !== last.away)
          );
          if (idx === -1) idx = 0;
          last = rem.splice(idx, 1)[0];
          result.push(last);
        }
        return result;
      }

      const pairs = buildLeagueFixtures(allCaptains);
      const schedule = buildValidOrder(pairs);

      for (let i = 0; i < schedule.length; i++) {
        await db.from('matches').insert({
          home_captain_id: schedule[i].home,
          away_captain_id: schedule[i].away,
          home_score: 0, away_score: 0,
          played: false,
          round: 'League',
          display_order: i + 1
        });
      }

      msg.textContent = 'League fixtures generated! ' + schedule.length + ' matches (' + allCaptains.length + ' teams, no back-to-back, no repeated alternating gaps).';
      setTimeout(() => msg.textContent = '', 4000);
      await loadData();
    }

    // ── Playoff generation ──
    // The bracket is derived from results (see bracket.js). This button inserts a fixture row for every
    // slot whose two teams are now known and that has no fixture yet.
    function updateGenerateButtons() {
      const leagueBtn = document.getElementById('btnGenLeague');
      if (leagueBtn) {
        const leagueExists = allMatches.some(m => isLeagueRound(m.round));
        leagueBtn.disabled = leagueExists;
        leagueBtn.title = leagueExists ? 'League fixtures already exist.' : '';
        leagueBtn.style.opacity = leagueExists ? '0.5' : '1';
        leagueBtn.style.cursor = leagueExists ? 'not-allowed' : 'pointer';
      }
      const btn = document.getElementById('btnGenPlayoffs');
      if (btn) {
        const r = playoffReadiness(allCaptains, allMatches, allTiebreaks);
        btn.disabled = !r.ready;
        btn.title = r.reason;
        btn.textContent = r.ready
          ? '⚡ Generate ' + r.slots.map(s => s.code).join(' + ')
          : '⚡ Generate Next Playoff Round';
        btn.style.opacity = r.ready ? '1' : '0.5';
        btn.style.cursor = r.ready ? 'pointer' : 'not-allowed';
      }
    }

    async function generatePlayoffRound() {
      const msg = document.getElementById('generateMsg');
      const r = playoffReadiness(allCaptains, allMatches, allTiebreaks);
      if (!r.ready) {
        msg.textContent = r.reason;
        setTimeout(() => msg.textContent = '', 5000);
        return;
      }
      const maxOrder = allMatches.reduce((mx, m) => Math.max(mx, Number(m.display_order) || 0), 0);
      let n = 0;
      for (const s of r.slots) {
        const { error } = await db.from('matches').insert({
          home_captain_id: s.derivedHome, away_captain_id: s.derivedAway,
          home_score: 0, away_score: 0, played: false,
          round: s.code, display_order: maxOrder + (++n)
        });
        if (error) { msg.textContent = 'Error generating ' + s.code + ': ' + error.message; return; }
      }
      msg.textContent = 'Generated: ' + r.slots.map(s => roundLabel(s.code)).join(' · ');
      setTimeout(() => msg.textContent = '', 6000);
      await loadData();
    }

    // ── Load fixture into result form ──
    function loadFixture(matchId) {
      const match = allMatches.find(m => m.id === matchId);
      if (!match) return;
      selectedFixtureId = matchId;
      document.getElementById('matchType').value = match.round || 'League';
      populateMatchDropdowns();
      document.getElementById('matchHome').value = match.home_captain_id || '';
      document.getElementById('matchAway').value = match.away_captain_id || '';
      document.getElementById('matchHomeScore').value = match.home_score ?? '';
      document.getElementById('matchAwayScore').value = match.away_score ?? '';
      document.getElementById('matchPrefillHint').textContent = 'Fixture loaded — enter scores and save.';
      toggleMatchType();
    }

    function resetMatchForm() {
      selectedFixtureId = null;
      document.getElementById('matchType').value = 'League';
      document.getElementById('matchHome').value = '';
      document.getElementById('matchAway').value = '';
      document.getElementById('matchHomeScore').value = '';
      document.getElementById('matchAwayScore').value = '';
      document.getElementById('matchPrefillHint').textContent = '';
      document.getElementById('matchMsg').textContent = '';
    }

    function toggleMatchType() {
      const matchType = document.getElementById('matchType').value;
      const hint = document.getElementById('matchPrefillHint');
      if (isLeagueRound(matchType)) {
        hint.textContent = selectedFixtureId ? 'Loaded from League fixture.' : '';
        return;
      }
      // Playoff rounds: prefill from the derived bracket
      const slot = computeBracket(allCaptains, allMatches, allTiebreaks).slots.find(s => s.code === matchType);
      if (slot && !selectedFixtureId) {
        if (slot.derivedHome) document.getElementById('matchHome').value = slot.derivedHome;
        if (slot.derivedAway) document.getElementById('matchAway').value = slot.derivedAway;
        hint.textContent = roundLabel(matchType) + ' · ' + roundMinutes(matchType) + ' min' +
          (slot.derivedHome && slot.derivedAway ? ' — prefilled from the bracket.' : ' — teams not decided yet.');
      }
    }


    async function saveMatch() {
      const homeId = document.getElementById('matchHome').value, awayId = document.getElementById('matchAway').value;
      const hs = parseInt(document.getElementById('matchHomeScore').value), as_ = parseInt(document.getElementById('matchAwayScore').value);
      const round = document.getElementById('matchType').value;
      const msg = document.getElementById('matchMsg');
      if (!homeId || !awayId || isNaN(hs) || isNaN(as_)) { msg.textContent = 'Fill all fields.'; return; }
      if (homeId === awayId) { msg.textContent = 'Home and away must be different teams.'; return; }
      if (isKoRound(round) && hs === as_) { msg.textContent = 'Playoff games cannot end level. If it went to TGT, the TGT winner gets +1 goal (1–1 becomes 2–1).'; return; }

      // Entered through the form, not a fixture button: attach to the scheduled game instead of creating a duplicate
      // (games played out of order used to leave the real fixture showing "not played").
      if (!selectedFixtureId) {
        const samePair = m => (m.home_captain_id === homeId && m.away_captain_id === awayId) || (m.home_captain_id === awayId && m.away_captain_id === homeId);
        const fx = allMatches.find(m => !m.played && m.id !== pendingMatchId && m.round === round && (isKoRound(round) || samePair(m)));
        if (fx) selectedFixtureId = fx.id;
      }

      let data, error;
      if (selectedFixtureId) {
        const orig = allMatches.find(m => m.id === selectedFixtureId);
        if (orig && !(orig.id === pendingMatchId && pendingBackup)) pendingBackup = { home_captain_id: orig.home_captain_id, away_captain_id: orig.away_captain_id, round: orig.round };
        ({ data, error } = await db.from('matches').update({
          home_captain_id: homeId, away_captain_id: awayId,
          home_score: hs, away_score: as_, played: false,
          round, mvp_player_id: null
        }).eq('id', selectedFixtureId).select().single());
      } else {
        ({ data, error } = await db.from('matches').insert({
          home_captain_id: homeId, away_captain_id: awayId,
          home_score: hs, away_score: as_, played: false, round
        }).select().single());
      }
      if (error) { msg.textContent = 'Error: ' + error.message; return; }

      pendingMatchId = data.id; pendingHomeId = homeId; pendingAwayId = awayId; pendingHS = hs; pendingAS = as_;
      if (!selectedFixtureId) pendingBackup = null;
      // Goals are saved the moment they are tapped, so re-opening a half-entered game brings them back.
      const { data: savedGoals } = await db.from('goals').select('*').eq('match_id', data.id);
      pendingGoals = (savedGoals || []).map(g => ({ dbId: g.id, player_id: g.player_id, captain_id: g.captain_id, match_id: g.match_id, isCaptain: allCaptains.some(c => c.id === g.player_id) }));

      const totalGoals = hs + as_;
      const homeCap = allCaptains.find(c => c.id === homeId), awayCap = allCaptains.find(c => c.id === awayId);
      msg.textContent = `${displayCaptainName(homeCap)} ${hs} – ${as_} ${displayCaptainName(awayCap)} · Saved. Add ${totalGoals} goal scorer(s).`;

      const teamSel = document.getElementById('scorerTeam');
      teamSel.innerHTML = `<option value="${homeId}">${displayCaptainName(homeCap)}</option><option value="${awayId}">${displayCaptainName(awayCap)}</option>`;
      renderPlayerGrid();
      populateMvpDropdown();
      document.getElementById('goalScorerSection').style.display = 'block';
      renderPendingGoals();
    }

    function updateScorerPlayers() { renderPlayerGrid(); }

    function renderPlayerGrid() {
      const homeCap     = allCaptains.find(c => c.id === pendingHomeId);
      const awayCap     = allCaptains.find(c => c.id === pendingAwayId);
      const homePlayers = allPlayers.filter(p => p.captain_id === pendingHomeId && p.is_sold);
      const awayPlayers = allPlayers.filter(p => p.captain_id === pendingAwayId && p.is_sold);
      document.getElementById('homeTeamLabel').textContent = homeCap ? displayCaptainName(homeCap) : '—';
      document.getElementById('awayTeamLabel').textContent = awayCap ? displayCaptainName(awayCap) : '—';
      function playerBtn(pid, name, teamId, isCaptain) {
        const goals = pendingGoals.filter(g => g.player_id === pid && g.captain_id === teamId).length;
        const badge = goals > 0
          ? '<span style="background:rgba(240,192,64,0.2);color:var(--accent);border-radius:4px;padding:1px 6px;font-size:11px;font-weight:700;margin-left:6px;">&#x26BD; ' + goals + '</span>'
          : '';
        const capLabel = isCaptain ? ' <span style="font-size:10px;color:#888;">(C)</span>' : '';
        return '<button data-pid="' + pid + '" data-team="' + teamId + '" data-cap="' + (isCaptain ? '1' : '0') + '" onclick="addGoalDirect(this.dataset.pid,this.dataset.team,this.dataset.cap===&quot;1&quot;)"'
          + ' style="width:100%;text-align:left;background:var(--surface2);border:1px solid var(--border);border-radius:8px;'
          + 'padding:9px 12px;cursor:pointer;font-family:var(--font-body);font-size:13px;color:var(--text);'
          + 'display:flex;align-items:center;justify-content:space-between;transition:border-color 0.15s;">'
          + '<span>' + name + capLabel + '</span>'
          + badge + '</button>';
      }
      let homeHtml = homeCap ? playerBtn(homeCap.id, homeCap.name, pendingHomeId, true) : '';
      homePlayers.forEach(function(p) { homeHtml += playerBtn(p.id, p.name, pendingHomeId, false); });
      let awayHtml = awayCap ? playerBtn(awayCap.id, awayCap.name, pendingAwayId, true) : '';
      awayPlayers.forEach(function(p) { awayHtml += playerBtn(p.id, p.name, pendingAwayId, false); });
      document.getElementById('homePlayerGrid').innerHTML = homeHtml || '<div class="text-muted">No players</div>';
      document.getElementById('awayPlayerGrid').innerHTML = awayHtml || '<div class="text-muted">No players</div>';
    }

    let _goalBusy = false;
    async function addGoalDirect(pid, teamId, isCaptain) {
      if (_goalBusy || !pendingMatchId) return;
      _goalBusy = true;
      const msg = document.getElementById('scorerMsg');
      try {
        const { data, error } = await db.from('goals').insert({ player_id: pid, captain_id: teamId, match_id: pendingMatchId }).select().single();
        if (error || !data) { msg.textContent = 'Goal NOT saved: ' + (error ? error.message : 'no response') + '. Tap again.'; return; }
        pendingGoals.push({ dbId: data.id, player_id: pid, captain_id: teamId, match_id: pendingMatchId, isCaptain: !!isCaptain });
        renderPendingGoals();
        renderPlayerGrid();
        msg.textContent = '';
      } finally { _goalBusy = false; }
    }

    function addGoal() { /* legacy — no-op, replaced by addGoalDirect */ }

    function renderPendingGoals() {
      document.getElementById('goalsList').innerHTML = pendingGoals.length
        ? pendingGoals.map((g, i) => {
            const p = g.isCaptain
              ? allCaptains.find(x => x.id === g.player_id)
              : allPlayers.find(x => x.id === g.player_id);
            const c = allCaptains.find(x => x.id === g.captain_id);
            const pName = g.isCaptain ? `${p?.name || '?'} (C)` : (p?.name || '?');
            return `<div class="player-row" style="padding:8px 12px;">
              <span>⚽ ${pName}</span>
              <span class="player-row-meta">${c ? displayCaptainName(c) : '?'}</span>
              <button class="btn-danger" onclick="removeGoal(${i})">✕</button>
            </div>`;
          }).join('')
        : '<div class="text-muted" style="padding:8px 0;">No goals added yet.</div>';
      updateGoalCountWarning();
    }

    async function removeGoal(i) {
      const g = pendingGoals[i];
      if (!g) return;
      if (g.dbId) {
        const { error } = await db.from('goals').delete().eq('id', g.dbId);
        if (error) { document.getElementById('scorerMsg').textContent = 'Goal NOT removed: ' + error.message; return; }
      }
      pendingGoals.splice(i, 1); renderPendingGoals(); renderPlayerGrid();
    }

    function updateGoalCountWarning() {
      const warn = document.getElementById('goalCountWarning');
      if (!warn) return;
      const totalGoals = pendingHS + pendingAS;
      const entered = pendingGoals.length;
      if (entered === totalGoals) {
        warn.style.display = 'none';
        return;
      }
      warn.style.display = 'block';
      if (entered < totalGoals) {
        warn.textContent = `⚠️ Score is ${pendingHS}–${pendingAS} (${totalGoals} goals) but only ${entered} entered.`;
      } else {
        warn.textContent = `⚠️ ${entered} goals entered but score is ${pendingHS}–${pendingAS} (${totalGoals} goals).`;
      }
    }

    async function finalizeMatch(forceConfirm) {
      if (!pendingMatchId) return;
      // Soft goal count check — warn but allow override
      const totalGoals = pendingHS + pendingAS;
      if (!forceConfirm && pendingGoals.length !== totalGoals) {
        const diff = totalGoals - pendingGoals.length;
        const msg = diff > 0
          ? `Score is ${pendingHS}–${pendingAS} but only ${pendingGoals.length} goal(s) entered (missing ${diff}). Save anyway?`
          : `${pendingGoals.length} goal(s) entered but score is ${pendingHS}–${pendingAS} (${totalGoals} expected). Save anyway?`;
        if (!confirm(msg)) return;
      }
      // MVP is needed for the Tournament MVP table: pick a player or say there is none.
      const mvpRaw = document.getElementById('mvpPlayer').value;
      if (!mvpRaw) { document.getElementById('scorerMsg').textContent = 'Pick the match MVP, or choose "No MVP for this game", then confirm.'; return; }
      const mvpId = mvpRaw === 'none' ? null : mvpRaw;
      // Goals were already saved when tapped. Confirming just marks the game played.
      const { error: confirmErr } = await db.from('matches').update({ played: true, mvp_player_id: mvpId }).eq('id', pendingMatchId);
      if (confirmErr) { document.getElementById('scorerMsg').textContent = 'NOT confirmed: ' + confirmErr.message + '. Nothing was lost. Press Confirm again.'; return; }

      // Remember next fixture before clearing state
      const justFinishedId = pendingMatchId;
      pendingMatchId = null; pendingGoals = []; pendingBackup = null;
      selectedFixtureId = null;
      document.getElementById('goalScorerSection').style.display = 'none';
      document.getElementById('goalCountWarning').style.display = 'none';
      document.getElementById('matchHome').value = '';
      document.getElementById('matchAway').value = '';
      document.getElementById('matchHomeScore').value = '';
      document.getElementById('matchAwayScore').value = '';

      await loadData();

      // ── FEATURE 2: Load Next Match after confirming ──
      const upcoming = sortMatchesForDisplay(allMatches.filter(m => !m.played));
      const next = upcoming[0] || null;
      const matchMsg = document.getElementById('matchMsg');
      if (next) {
        const h = allCaptains.find(c => c.id === next.home_captain_id);
        const a = allCaptains.find(c => c.id === next.away_captain_id);
        const label = next.display_order ? `Match #${next.display_order} · ` : '';
        matchMsg.innerHTML = `✓ Match saved! &nbsp;<button class="btn-sm" onclick="loadFixtureForResult('${next.id}')" style="width:auto;">Load Next: ${label}${displayCaptainName(h)} vs ${displayCaptainName(a)} →</button>`;
      } else {
        matchMsg.textContent = '✓ All matches complete!';
      }
      setTimeout(() => { const el = document.getElementById('matchMsg'); if (el) el.innerHTML = ''; }, 8000);
    }

    // Cancel: throw away this entry (its goals), but never destroy a scheduled fixture. A fixture goes back to unplayed 0-0;
    // a match that was created by hand is deleted.
    async function cancelMatch() {
      const msg = document.getElementById('matchMsg');
      if (pendingMatchId) {
        const id = pendingMatchId;
        const { error: gErr } = await db.from('goals').delete().eq('match_id', id);
        if (gErr) { msg.textContent = 'Cancel failed (goals): ' + gErr.message; return; }
        if (selectedFixtureId) {
          const back = pendingBackup || {};
          const { error } = await db.from('matches').update(Object.assign({ home_score: 0, away_score: 0, played: false, mvp_player_id: null },
            back.home_captain_id ? { home_captain_id: back.home_captain_id, away_captain_id: back.away_captain_id, round: back.round } : {})).eq('id', id);
          if (error) { msg.textContent = 'Cancel failed: ' + error.message; return; }
        } else {
          const { error } = await db.from('matches').delete().eq('id', id);
          if (error) { msg.textContent = 'Cancel failed: ' + error.message; return; }
        }
      }
      pendingMatchId = null; pendingGoals = []; pendingBackup = null;
      selectedFixtureId = null;
      document.getElementById('goalScorerSection').style.display = 'none';
      document.getElementById('matchPrefillHint').textContent = '';
      msg.textContent = '';
      document.getElementById('matchHome').value = '';
      document.getElementById('matchAway').value = '';
      document.getElementById('matchHomeScore').value = '';
      document.getElementById('matchAwayScore').value = '';
      await loadData();
    }

    // ── Half-entered games: scores saved, goals tapped, but never confirmed ──
    function pendingConfirmMatches() {
      return allMatches.filter(m => !m.played && m.id !== pendingMatchId &&
        ((Number(m.home_score) || 0) + (Number(m.away_score) || 0) > 0 || allGoals.some(g => g.match_id === m.id)));
    }
    function renderPendingConfirm() {
      const wrap = document.getElementById('pendingConfirmWrap');
      if (!wrap) return;
      const rows = pendingConfirmMatches();
      if (!rows.length) { wrap.innerHTML = ''; return; }
      wrap.innerHTML = '<div class="form-card" style="border-color:var(--accent);margin-bottom:16px;">'
        + '<div style="font-weight:600;color:var(--accent);margin-bottom:8px;">&#9888; Awaiting confirmation</div>'
        + rows.map(m => {
          const h = allCaptains.find(c => c.id === m.home_captain_id), a = allCaptains.find(c => c.id === m.away_captain_id);
          const n = allGoals.filter(g => g.match_id === m.id).length;
          return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 0;flex-wrap:wrap;">'
            + '<span>' + (h ? displayCaptainName(h) : '?') + ' ' + m.home_score + ' &ndash; ' + m.away_score + ' ' + (a ? displayCaptainName(a) : '?')
            + ' <span class="text-muted">&middot; ' + n + ' goal(s) entered, not confirmed</span></span>'
            + '<button class="btn-sm" onclick="resumeMatch(\'' + m.id + '\')" style="width:auto;">Resume</button></div>';
        }).join('') + '</div>';
    }
    async function resumeMatch(matchId) {
      loadFixture(matchId);
      await saveMatch();   // re-opens the scorer panel with the goals already saved
      const el = document.getElementById('goalScorerSection');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    // "Enter result" on the Now Playing card: open the first unplayed game (or resume it if half-entered).
    function enterNowPlaying() {
      const next = sortMatchesForDisplay(allMatches.filter(m => !m.played))[0];
      if (!next) return;
      const half = (Number(next.home_score) || 0) + (Number(next.away_score) || 0) > 0 || allGoals.some(g => g.match_id === next.id);
      if (half) resumeMatch(next.id); else loadFixtureForResult(next.id);
    }
    function bumpScore(id, d) {
      const sel = document.getElementById(id);
      if (!sel) return;
      const v = parseInt(sel.value);
      sel.value = String(Math.max(0, Math.min(25, (isNaN(v) ? 0 : v) + d)));
    }

    function renderMatchesList() {
      renderPendingConfirm();
      const list = document.getElementById('matchesList');
      const played = allMatches.filter(m => m.played);
      if (!played.length) { list.innerHTML = '<div class="text-muted">No matches played yet.</div>'; return; }
      list.innerHTML = [...played].reverse().map(m => {
        const h = allCaptains.find(c => c.id === m.home_captain_id), a = allCaptains.find(c => c.id === m.away_captain_id);
        const mGoals = allGoals.filter(g => g.match_id === m.id);
        const scorers = mGoals.map(g => {
          const p = allPlayers.find(x => x.id === g.player_id);
          const c = !p ? allCaptains.find(x => x.id === g.player_id) : null;
          return p ? p.name : (c ? c.name + ' (C)' : '?');
        }).join(', ');
        const label = isLeagueRound(m.round) ? 'League' : roundLabel(m.round);
        return `
          <div class="player-row" style="flex-wrap:wrap;gap:8px;">
            <span class="unsold-badge">${label}</span>
            <span style="font-weight:500;">${h ? displayCaptainName(h) : '?'} <span style="color:var(--accent);font-family:var(--font-display);font-size:1.1rem;">${m.home_score}</span></span>
            <span style="color:var(--muted);">–</span>
            <span style="font-weight:500;"><span style="color:var(--accent);font-family:var(--font-display);font-size:1.1rem;">${m.away_score}</span> ${a ? displayCaptainName(a) : '?'}</span>
            ${scorers ? `<span class="player-row-meta" style="width:100%;margin-top:2px;">⚽ ${scorers}</span>` : ''}
            <div class="player-row-actions">
              <button class="btn-sm" onclick="editMatch('${m.id}')">Edit</button>
              <button class="btn-danger" onclick="deleteMatch('${m.id}')">Delete</button>
            </div>
          </div>`;
      }).join('');
    }

    function updateEditScorerPlayers() {
      const teamId = document.getElementById('editScorerTeam').value;
      const captain = allCaptains.find(c => c.id === teamId);
      const players = allPlayers.filter(p => p.captain_id === teamId && p.is_sold);
      const options = [];
      if (captain) options.push(`<option value="${captain.id}">${captain.name} (C)</option>`);
      players.forEach(p => options.push(`<option value="${p.id}">${p.name}</option>`));
      document.getElementById('editScorerPlayer').innerHTML =
        '<option value="">Select player...</option>' + options.join('');
    }

    let editMatchState = null;

    function editMatch(matchId) {
      const m = allMatches.find(x => x.id === matchId);
      if (!m) return;
      editMatchState = {
        matchId,
        goals: allGoals.filter(g => g.match_id === matchId).map(g => ({ ...g }))
      };
      const h = allCaptains.find(c => c.id === m.home_captain_id);
      const a = allCaptains.find(c => c.id === m.away_captain_id);
      document.getElementById('editMatchLabel').textContent =
        `${displayCaptainName(h)} vs ${displayCaptainName(a)}` +
        (m.round ? ` · ${isLeagueRound(m.round) ? 'League' : roundLabel(m.round)}` : '');
      const teamOpts = allCaptains.map(c => `<option value="${c.id}">${displayCaptainName(c)}</option>`).join('');
      document.getElementById('editMatchHome').innerHTML = teamOpts;
      document.getElementById('editMatchAway').innerHTML = teamOpts;
      document.getElementById('editMatchHome').value = m.home_captain_id;
      document.getElementById('editMatchAway').value = m.away_captain_id;
      document.getElementById('editMatchHomeScore').value = m.home_score;
      document.getElementById('editMatchAwayScore').value = m.away_score;
      // Scorer team dropdown — both teams
      const scorerTeamOpts = [h, a].filter(Boolean)
        .map(c => `<option value="${c.id}">${displayCaptainName(c)}</option>`).join('');
      document.getElementById('editScorerTeam').innerHTML = scorerTeamOpts;
      updateEditScorerPlayers();
      // MVP dropdown — captains + squad players from both teams
      const teamPlayers = allPlayers.filter(p => p.captain_id === m.home_captain_id || p.captain_id === m.away_captain_id);
      const captainOpts = [h, a].filter(Boolean)
        .map(c => `<option value="${c.id}" ${c.id === m.mvp_player_id ? 'selected' : ''}>${c.name} (C)</option>`).join('');
      document.getElementById('editMvpPlayer').innerHTML =
        '<option value="">No MVP</option>' + captainOpts +
        teamPlayers.map(p => `<option value="${p.id}" ${p.id === m.mvp_player_id ? 'selected' : ''}>${p.name} (${displayCaptainName(allCaptains.find(c=>c.id===p.captain_id))})</option>`).join('');
      document.getElementById('editMatchError').textContent = '';
      renderEditGoalsList();
      document.getElementById('editMatchModal').style.display = 'flex';
    }

    function addEditGoal() {
      const pid = document.getElementById('editScorerPlayer').value;
      const tid = document.getElementById('editScorerTeam').value;
      const msg = document.getElementById('editScorerMsg');
      if (!pid) { msg.textContent = 'Select a player.'; return; }
      editMatchState.goals.push({ player_id: pid, captain_id: tid, match_id: editMatchState.matchId });
      document.getElementById('editScorerPlayer').value = '';
      msg.textContent = '';
      renderEditGoalsList();
    }

    function removeEditGoal(i) {
      editMatchState.goals.splice(i, 1);
      renderEditGoalsList();
    }

    function renderEditGoalsList() {
      const el = document.getElementById('editGoalsList');
      if (!editMatchState?.goals.length) {
        el.innerHTML = '<div class="text-muted" style="padding:4px 0 8px;">No goals.</div>';
        return;
      }
      el.innerHTML = editMatchState.goals.map((g, i) => {
        const p = allPlayers.find(x => x.id === g.player_id) || allCaptains.find(x => x.id === g.player_id);
        const c = allCaptains.find(x => x.id === g.captain_id);
        const pName = p ? (allCaptains.find(x => x.id === p.id) ? p.name + ' (C)' : p.name) : '?';
        return `<div class="player-row" style="padding:6px 10px;margin-bottom:4px;">
          <span>⚽ ${pName}</span>
          <span class="player-row-meta">${c ? displayCaptainName(c) : '?'}</span>
          <button class="btn-danger" onclick="removeEditGoal(${i})">✕</button>
        </div>`;
      }).join('');
    }

    async function saveEditMatch() {
      if (!editMatchState) return;
      const { matchId } = editMatchState;
      const hs  = parseInt(document.getElementById('editMatchHomeScore').value);
      const as_ = parseInt(document.getElementById('editMatchAwayScore').value);
      const mvpId = document.getElementById('editMvpPlayer').value || null;
      const err = document.getElementById('editMatchError');
      if (isNaN(hs) || isNaN(as_) || hs < 0 || as_ < 0) { err.textContent = 'Enter valid scores.'; return; }
      const editing = allMatches.find(x => x.id === matchId);
      if (editing && isKoRound(editing.round) && hs === as_) { err.textContent = 'Playoff games cannot end level. TGT winner gets +1 goal (1–1 becomes 2–1).'; return; }
      await db.from('goals').delete().eq('match_id', matchId);
      if (editMatchState.goals.length) {
        const { error } = await db.from('goals').insert(
          editMatchState.goals.map(g => ({ player_id: g.player_id, captain_id: g.captain_id, match_id: matchId }))
        );
        if (error) { err.textContent = 'Error saving goals: ' + error.message; return; }
      }
      const { error } = await db.from('matches').update({
        home_score: hs, away_score: as_, mvp_player_id: mvpId
      }).eq('id', matchId);
      if (error) { err.textContent = 'Error: ' + error.message; return; }
      closeEditMatchModal();
      await loadData();
    }

    function closeEditMatchModal() {
      editMatchState = null;
      document.getElementById('editMatchModal').style.display = 'none';
    }

    async function deleteMatch(id) {
      if (!confirm('Clear this result? The fixture will remain but scores and goals will be reset.')) return;
      await db.from('goals').delete().eq('match_id', id);
      await db.from('matches').update({
        played: false,
        home_score: 0,
        away_score: 0,
        mvp_player_id: null
      }).eq('id', id);
      loadData();
    }

    async function saveCaptainField(captainId, field, inputId) {
      const input = document.getElementById(inputId);
      if (!input) return;
      const value = input.value.trim();
      if (!value) { input.style.borderColor = 'var(--red)'; return; }
      input.style.borderColor = 'var(--border)';
      const { error } = await db.from('captains').update({ [field]: value }).eq('id', captainId);
      if (error) { input.style.borderColor = 'var(--red)'; return; }
      input.style.borderColor = 'var(--green)';
      setTimeout(() => { input.style.borderColor = 'var(--border)'; }, 1500);
      await loadData();
    }
