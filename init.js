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
      const wrap = document.getElementById('roundFixturesWrap');
      if (!wrap) return;
      let html = '';

      // ── Group Stage — interleaved A+B by display_order ──
      const groupMatches = sortMatchesForDisplay(
        allMatches.filter(function(m) { return ['A','B'].includes(String(m.round)); })
      );
      if (groupMatches.length) {
        let groupHtml = '<div style="margin-bottom:20px;">'
          + '<div class="section-title" style="margin-bottom:10px;">Group Stage Fixtures</div>'
          + '<div style="display:flex;flex-direction:column;gap:8px;">';
        groupMatches.forEach(function(m, i) {
          const h = allCaptains.find(function(c) { return c.id === m.home_captain_id; });
          const a = allCaptains.find(function(c) { return c.id === m.away_captain_id; });
          const grpBadge = '<span style="font-size:9px;padding:1px 5px;border-radius:3px;margin-left:4px;background:rgba(240,192,64,0.12);color:var(--accent);">Group ' + m.round + '</span>';
          const label = (m.display_order ? 'Match ' + m.display_order : 'Match ' + (i+1)) + grpBadge;
          const played = m.played;
          const borderColor = played ? 'rgba(62,207,142,0.3)' : 'var(--border)';
          const sameRound = groupMatches.filter(function(x) { return x.round === m.round; });
          const roundIdx  = sameRound.findIndex(function(x) { return x.id === m.id; });
          groupHtml += '<div style="background:var(--surface);border:1px solid ' + borderColor + ';border-radius:var(--radius);padding:12px 14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">'
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
        groupHtml += '</div></div>';
        html += groupHtml;
      }
      const KO_ORDER = ['S8A','S8B','S8C','S8D','S4A','S4B','SF1_L1','SF1_L2','SF2_L1','SF2_L2','Final'];
      const KO_LABELS = {
        'S8A':'S8A · A2 vs B5','S8B':'S8B · B2 vs A5','S8C':'S8C · A3 vs B4','S8D':'S8D · B3 vs A4',
        'S4A':'S4A · W(S8A) vs W(S8D)','S4B':'S4B · W(S8B) vs W(S8C)',
        'SF1_L1':'SF1 Leg 1','SF1_L2':'SF1 Leg 2','SF2_L1':'SF2 Leg 1','SF2_L2':'SF2 Leg 2',
        'Final':'🏆 Final'
      };
      const koMatches = allMatches.filter(function(m) { return KO_ORDER.includes(m.round); });
      if (koMatches.length) {
        let koHtml = '<div style="margin-bottom:20px;">'
          + '<div class="section-title" style="margin-bottom:10px;">Knockouts</div>'
          + '<div style="display:flex;flex-direction:column;gap:8px;">';
        KO_ORDER.forEach(function(r) {
          const m = koMatches.find(function(x) { return x.round === r; });
          if (!m) return;
          const h = allCaptains.find(function(c) { return c.id === m.home_captain_id; });
          const a = allCaptains.find(function(c) { return c.id === m.away_captain_id; });
          const played = m.played;
          const borderColor = played ? 'rgba(62,207,142,0.3)' : 'var(--border)';
          koHtml += '<div style="background:var(--surface);border:1px solid ' + borderColor + ';border-radius:var(--radius);padding:12px 14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">'
            + '<div style="flex:1;min-width:0;">'
            + '<div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);margin-bottom:3px;">' + (KO_LABELS[r]||r) + (played ? ' · <span style="color:var(--green);">Played</span>' : '') + '</div>'
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

      if (!html) html = '<div class="text-muted" style="margin-bottom:20px;">No fixtures yet. Use Generate Group Matches to start.</div>';
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
      const label = m.round ? (['A','B'].includes(m.round) ? `Group ${m.round}` : m.round) : 'Fixture';
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
    // ── Generate group stage fixtures (round-robin within group) ──
    // ── Generate all group stage fixtures (interleaved A/B, no back-to-back) ──
    async function generateGroupMatches() {
      const msg = document.getElementById('generateMsg');

      // Check nothing already exists
      const existing = allMatches.filter(m => ['A','B'].includes(String(m.round)));
      if (existing.length) {
        msg.textContent = 'Group fixtures already exist. Delete them first.';
        setTimeout(() => msg.textContent = '', 4000);
        return;
      }

      const capsA = allCaptains.filter(c => c.group_name === 'A');
      const capsB = allCaptains.filter(c => c.group_name === 'B');
      if (capsA.length < 2 || capsB.length < 2) {
        msg.textContent = 'Need at least 2 captains in each group. Assign group_name first.';
        setTimeout(() => msg.textContent = '', 4000);
        return;
      }

      // ── Round-robin schedule for N teams using circle method ──
      // Returns array of {home, away} pairs in a good playing order (no team back-to-back)
      function roundRobinSchedule(caps) {
        const n = caps.length;
        // If odd number of teams, add a bye
        const teams = n % 2 === 0 ? caps.slice() : [...caps, null];
        const half = teams.length / 2;
        const rounds = teams.length - 1;
        const pairs = [];
        // Fix first team, rotate the rest
        for (let r = 0; r < rounds; r++) {
          for (let i = 0; i < half; i++) {
            const home = teams[i];
            const away = teams[teams.length - 1 - i];
            if (home && away) pairs.push({ home: home.id, away: away.id });
          }
          // Rotate all except first
          const last = teams[teams.length - 1];
          for (let i = teams.length - 1; i > 1; i--) teams[i] = teams[i - 1];
          teams[1] = last;
        }
        return pairs;
      }

      const pairsA = roundRobinSchedule(capsA); // 10 matches
      const pairsB = roundRobinSchedule(capsB); // 10 matches

      // ── Interleave A and B ensuring no team plays back-to-back ──
      function teamsIn(pair) {
        return new Set([pair.home, pair.away]);
      }

      function conflicts(pair, prevPair) {
        if (!prevPair) return false;
        const prev = teamsIn(prevPair);
        return prev.has(pair.home) || prev.has(pair.away);
      }

      // Greedy interleave: at each slot pick one from A then one from B,
      // backtracking within each group's remaining list to avoid conflicts.
      function interleave(listA, listB) {
        const remA = listA.slice(), remB = listB.slice();
        const result = [];
        let lastPair = null;

        while (remA.length || remB.length) {
          // Try to pick from A first
          let pickedA = false;
          for (let i = 0; i < remA.length; i++) {
            if (!conflicts(remA[i], lastPair)) {
              lastPair = remA.splice(i, 1)[0];
              result.push({ ...lastPair, group: 'A' });
              pickedA = true;
              break;
            }
          }
          // If couldn't pick A without conflict, just take first available
          if (!pickedA && remA.length) {
            lastPair = remA.shift();
            result.push({ ...lastPair, group: 'A' });
          }

          // Then pick from B
          let pickedB = false;
          for (let i = 0; i < remB.length; i++) {
            if (!conflicts(remB[i], lastPair)) {
              lastPair = remB.splice(i, 1)[0];
              result.push({ ...lastPair, group: 'B' });
              pickedB = true;
              break;
            }
          }
          if (!pickedB && remB.length) {
            lastPair = remB.shift();
            result.push({ ...lastPair, group: 'B' });
          }
        }
        return result;
      }

      const schedule = interleave(pairsA, pairsB);

      // Insert all fixtures with sequential display_order
      for (let i = 0; i < schedule.length; i++) {
        await db.from('matches').insert({
          home_captain_id: schedule[i].home,
          away_captain_id: schedule[i].away,
          home_score: 0, away_score: 0,
          played: false,
          round: schedule[i].group,
          display_order: i + 1
        });
      }

      msg.textContent = 'Group fixtures generated! ' + schedule.length + ' matches (interleaved A/B, no back-to-back).';
      setTimeout(() => msg.textContent = '', 4000);
      await loadData();
    }

    // ── Generate Super 8 ──
    async function generateSuper8() {
      const msg = document.getElementById('generateMsg');
      const { groupA, groupB } = computeStandings(allCaptains, allMatches);
      if (groupA.length < 5 || groupB.length < 5) {
        msg.textContent = 'Need 5 captains in each group and league matches played to generate Super 8.';
        setTimeout(() => msg.textContent = '', 4000);
        return;
      }
      const existing = allMatches.filter(m => ['S8A','S8B','S8C','S8D'].includes(m.round));
      if (existing.length) {
        msg.textContent = 'Super 8 fixtures already exist.';
        setTimeout(() => msg.textContent = '', 3000);
        return;
      }
      // S8A: A2 vs B5, S8B: B2 vs A5, S8C: A3 vs B4, S8D: B3 vs A4
      const fixtures = [
        { round: 'S8A', home: groupA[1]?.captain?.id, away: groupB[4]?.captain?.id },
        { round: 'S8B', home: groupB[1]?.captain?.id, away: groupA[4]?.captain?.id },
        { round: 'S8C', home: groupA[2]?.captain?.id, away: groupB[3]?.captain?.id },
        { round: 'S8D', home: groupB[2]?.captain?.id, away: groupA[3]?.captain?.id }
      ];
      for (const f of fixtures) {
        await db.from('matches').insert({
          home_captain_id: f.home || null,
          away_captain_id: f.away || null,
          home_score: 0, away_score: 0,
          played: false, round: f.round, display_order: null
        });
      }
      msg.textContent = 'Super 8 fixtures generated!';
      setTimeout(() => msg.textContent = '', 3000);
      await loadData();
    }

    // ── Generate Super 4 ──
    async function generateSuper4() {
      const msg = document.getElementById('generateMsg');
      const existing = allMatches.filter(m => ['S4A','S4B'].includes(m.round));
      if (existing.length) {
        msg.textContent = 'Super 4 fixtures already exist.';
        setTimeout(() => msg.textContent = '', 3000);
        return;
      }
      function koWinnerId(round) {
        const m = allMatches.find(x => x.round === round && x.played);
        if (!m) return null;
        return m.home_score > m.away_score ? m.home_captain_id : m.away_captain_id;
      }
      const fixtures = [
        { round: 'S4A', home: koWinnerId('S8A'), away: koWinnerId('S8D') },
        { round: 'S4B', home: koWinnerId('S8B'), away: koWinnerId('S8C') }
      ];
      for (const f of fixtures) {
        await db.from('matches').insert({
          home_captain_id: f.home || null,
          away_captain_id: f.away || null,
          home_score: 0, away_score: 0,
          played: false, round: f.round, display_order: null
        });
      }
      msg.textContent = 'Super 4 fixtures generated!';
      setTimeout(() => msg.textContent = '', 3000);
      await loadData();
    }

    // ── Generate Semis (H&A legs) ──
    async function generateSemis() {
      const msg = document.getElementById('generateMsg');
      const existing = allMatches.filter(m => ['SF1_L1','SF1_L2','SF2_L1','SF2_L2'].includes(m.round));
      if (existing.length) {
        msg.textContent = 'Semi-final legs already exist.';
        setTimeout(() => msg.textContent = '', 3000);
        return;
      }
      function koWinnerId(round) {
        const m = allMatches.find(x => x.round === round && x.played);
        if (!m) return null;
        return m.home_score > m.away_score ? m.home_captain_id : m.away_captain_id;
      }
      const { groupA, groupB } = computeStandings(allCaptains, allMatches);
      const a1 = groupA[0]?.captain?.id || null;
      const b1 = groupB[0]?.captain?.id || null;
      const s4aWinner = koWinnerId('S4A');
      const s4bWinner = koWinnerId('S4B');
      // SF1: B1 vs W(S4B) — Leg1 home=B1, Leg2 home=W(S4B)
      // SF2: A1 vs W(S4A) — Leg1 home=A1, Leg2 home=W(S4A)
      const fixtures = [
        { round: 'SF1_L1', home: b1, away: s4bWinner },
        { round: 'SF1_L2', home: s4bWinner, away: b1 },
        { round: 'SF2_L1', home: a1, away: s4aWinner },
        { round: 'SF2_L2', home: s4aWinner, away: a1 }
      ];
      for (const f of fixtures) {
        await db.from('matches').insert({
          home_captain_id: f.home || null,
          away_captain_id: f.away || null,
          home_score: 0, away_score: 0,
          played: false, round: f.round, display_order: null
        });
      }
      msg.textContent = 'Semi-final legs generated!';
      setTimeout(() => msg.textContent = '', 3000);
      await loadData();
    }

    // ── Generate Final ──
    async function generateFinal() {
      const msg = document.getElementById('generateMsg');
      const existing = allMatches.find(m => m.round === 'Final');
      if (existing) {
        msg.textContent = 'Final fixture already exists.';
        setTimeout(() => msg.textContent = '', 3000);
        return;
      }
      const sf1Agg = computeSfAggregate(allMatches, allCaptains, 'SF1');
      const sf2Agg = computeSfAggregate(allMatches, allCaptains, 'SF2');
      const sf1Winner = sf1Agg?.winner?.id || null;
      const sf2Winner = sf2Agg?.winner?.id || null;
      await db.from('matches').insert({
        home_captain_id: sf1Winner,
        away_captain_id: sf2Winner,
        home_score: 0, away_score: 0,
        played: false, round: 'Final', display_order: null
      });
      msg.textContent = 'Final fixture generated!';
      setTimeout(() => msg.textContent = '', 3000);
      await loadData();
    }

    // ── Load fixture into result form ──
    function loadFixture(matchId) {
      const match = allMatches.find(m => m.id === matchId);
      if (!match) return;
      selectedFixtureId = matchId;
      document.getElementById('matchType').value = match.round || 'A';
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
      document.getElementById('matchType').value = 'A';
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
      const LEAGUE = ['A','B'];
      if (LEAGUE.includes(matchType)) {
        hint.textContent = selectedFixtureId ? `Loaded from Group ${matchType} fixture.` : '';
        return;
      }
      // KO rounds — prefill from standings/results
      const { groupA, groupB } = computeStandings(allCaptains, allMatches);
      function koWinnerId(round) {
        const m = allMatches.find(x => x.round === round && x.played);
        if (!m) return null;
        return m.home_score > m.away_score ? m.home_captain_id : m.away_captain_id;
      }
      function sfAggWinnerId(sfPrefix) {
        const agg = computeSfAggregate(allMatches, allCaptains, sfPrefix);
        return agg?.winner?.id || null;
      }
      const map = {
        'S8A': { home: groupA[1]?.captain?.id, away: groupB[4]?.captain?.id, label: 'S8A · A2 vs B5' },
        'S8B': { home: groupB[1]?.captain?.id, away: groupA[4]?.captain?.id, label: 'S8B · B2 vs A5' },
        'S8C': { home: groupA[2]?.captain?.id, away: groupB[3]?.captain?.id, label: 'S8C · A3 vs B4' },
        'S8D': { home: groupB[2]?.captain?.id, away: groupA[3]?.captain?.id, label: 'S8D · B3 vs A4' },
        'S4A': { home: koWinnerId('S8A'), away: koWinnerId('S8D'), label: 'S4A · W(S8A) vs W(S8D)' },
        'S4B': { home: koWinnerId('S8B'), away: koWinnerId('S8C'), label: 'S4B · W(S8B) vs W(S8C)' },
        'SF1_L1': { home: groupB[0]?.captain?.id, away: koWinnerId('S4B'), label: 'SF1 Leg 1 · B1 vs W(S4B)' },
        'SF1_L2': { home: koWinnerId('S4B'), away: groupB[0]?.captain?.id, label: 'SF1 Leg 2 · W(S4B) vs B1' },
        'SF2_L1': { home: groupA[0]?.captain?.id, away: koWinnerId('S4A'), label: 'SF2 Leg 1 · A1 vs W(S4A)' },
        'SF2_L2': { home: koWinnerId('S4A'), away: groupA[0]?.captain?.id, label: 'SF2 Leg 2 · W(S4A) vs A1' },
        'Final':  { home: sfAggWinnerId('SF1'), away: sfAggWinnerId('SF2'), label: 'Final' }
      };
      const seed = map[matchType];
      if (seed && !selectedFixtureId) {
        if (seed.home) document.getElementById('matchHome').value = seed.home;
        if (seed.away) document.getElementById('matchAway').value = seed.away;
        hint.textContent = seed.label + ' — prefilled from standings.';
      }
    }


    async function saveMatch() {
      const homeId = document.getElementById('matchHome').value, awayId = document.getElementById('matchAway').value;
      const hs = parseInt(document.getElementById('matchHomeScore').value), as_ = parseInt(document.getElementById('matchAwayScore').value);
      const round = document.getElementById('matchType').value;
      const msg = document.getElementById('matchMsg');
      if (!homeId || !awayId || isNaN(hs) || isNaN(as_)) { msg.textContent = 'Fill all fields.'; return; }
      if (homeId === awayId) { msg.textContent = 'Home and away must be different teams.'; return; }

      let data, error;
      if (selectedFixtureId) {
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
      pendingGoals = [];

      const totalGoals = hs + as_;
      const homeCap = allCaptains.find(c => c.id === homeId), awayCap = allCaptains.find(c => c.id === awayId);
      msg.textContent = `${displayCaptainName(homeCap)} ${hs} – ${as_} ${displayCaptainName(awayCap)} · Saved. Add ${totalGoals} goal scorer(s).`;

      const teamSel = document.getElementById('scorerTeam');
      teamSel.innerHTML = `<option value="${homeId}">${displayCaptainName(homeCap)}</option><option value="${awayId}">${displayCaptainName(awayCap)}</option>`;
      renderPlayerGrid();
      populateMvpDropdown();
      document.getElementById('goalScorerSection').style.display = 'block';
      document.getElementById('goalsList').innerHTML = '';
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

    function addGoalDirect(pid, teamId, isCaptain) {
      pendingGoals.push({ player_id: pid, captain_id: teamId, match_id: pendingMatchId, isCaptain: !!isCaptain });
      renderPendingGoals();
      renderPlayerGrid();
      document.getElementById('scorerMsg').textContent = '';
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

    function removeGoal(i) { pendingGoals.splice(i, 1); renderPendingGoals(); renderPlayerGrid(); }

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
      if (pendingGoals.length) {
        const goalsToInsert = pendingGoals.map(({ player_id, captain_id, match_id }) => ({ player_id, captain_id, match_id }));
        const { error } = await db.from('goals').insert(goalsToInsert);
        if (error) { alert('Error saving goals: ' + error.message); return; }
      }
      const mvpId = document.getElementById('mvpPlayer').value || null;
      await db.from('matches').update({ played: true, mvp_player_id: mvpId }).eq('id', pendingMatchId);

      // Remember next fixture before clearing state
      const justFinishedId = pendingMatchId;
      pendingMatchId = null; pendingGoals = [];
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

    async function cancelMatch() {
      if (pendingMatchId) await db.from('matches').delete().eq('id', pendingMatchId);
      pendingMatchId = null; pendingGoals = [];
      selectedFixtureId = null;
      document.getElementById('goalScorerSection').style.display = 'none';
      selectedFixtureId = null;
      document.getElementById('matchPrefillHint').textContent = '';
      document.getElementById('matchMsg').textContent = '';
      document.getElementById('matchHome').value = '';
      document.getElementById('matchAway').value = '';
      document.getElementById('matchHomeScore').value = '';
      document.getElementById('matchAwayScore').value = '';
    }

    function renderMatchesList() {
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
        const KO_ROUNDS_ADMIN = ['S8A','S8B','S8C','S8D','S4A','S4B','SF1_L1','SF1_L2','SF2_L1','SF2_L2','Final'];
        const label = KO_ROUNDS_ADMIN.includes(m.round) ? m.round : (['A','B'].includes(m.round) ? `Group ${m.round}` : (m.round || '—'));
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
        (m.round ? ` · ${['A','B'].includes(m.round) ? 'Group ' + m.round : m.round}` : '');
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
      if (!confirm('Delete this match result?')) return;
      await db.from('goals').delete().eq('match_id', id);
      await db.from('matches').delete().eq('id', id);
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
