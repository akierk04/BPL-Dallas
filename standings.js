// ── BPL Dallas · Shared Standings & Stats Logic ──
// Season 4 format: 8 teams, single prelim table (4 games each, 16 total, 10 min).
// Prelim ranking: Points (W3 D1 L0), then Goal Difference, then Goals Scored, then Head-to-Head
// (only when exactly two teams are still tied), then TGT (the recorded shootout/tiebreak result).
// If three or more teams are still tied after Points, GD and GF, it goes straight to TGT.
// Playoffs: all 8 qualify, double elimination (see bracket.js).

const PLAYOFF_TEAMS_COUNT = 8;

// Playoff slots in the order they are played. minutes = game length.
const PLAYOFF_ROUNDS = [
  { code: 'W1A', stage: 'WB', minutes: 10, label: 'Winners Round 1 · #1 vs #8' },
  { code: 'W1B', stage: 'WB', minutes: 10, label: 'Winners Round 1 · #2 vs #7' },
  { code: 'W1C', stage: 'WB', minutes: 10, label: 'Winners Round 1 · #3 vs #6' },
  { code: 'W1D', stage: 'WB', minutes: 10, label: 'Winners Round 1 · #4 vs #5' },
  { code: 'L1A', stage: 'LB', minutes: 10, label: 'Losers Round 1 · Match A' },
  { code: 'L1B', stage: 'LB', minutes: 10, label: 'Losers Round 1 · Match B' },
  { code: 'W2A', stage: 'WB', minutes: 10, label: 'Winners Round 2 · Match A' },
  { code: 'W2B', stage: 'WB', minutes: 10, label: 'Winners Round 2 · Match B' },
  { code: 'L2A', stage: 'LB', minutes: 10, label: 'Losers Round 2 · Match A' },
  { code: 'L2B', stage: 'LB', minutes: 10, label: 'Losers Round 2 · Match B' },
  { code: 'WF',  stage: 'WB', minutes: 10, label: 'Winners Final' },
  { code: 'L3',  stage: 'LB', minutes: 10, label: 'Losers Round 3' },
  { code: 'LF',  stage: 'LB', minutes: 10, label: 'Losers Final' },
  { code: 'GF',  stage: 'GF', minutes: 10, label: 'Grand Final' },
  { code: 'RF',  stage: 'GF', minutes: 10, label: 'Reset Final' }
];
const KO_ROUNDS = PLAYOFF_ROUNDS.map(r => r.code);

function isKoRound(round)     { return KO_ROUNDS.includes(String(round)); }
function isLeagueRound(round) { return !isKoRound(round); }

// ── Compute standings (single flat table, all captains) ──
function computeStandings(captains, matches, tiebreakResults) {
  tiebreakResults = tiebreakResults || [];
  const table = {};
  captains.forEach(c => {
    table[c.id] = { captain: c, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, results: {} };
  });

  matches.filter(m => m.played && isLeagueRound(m.round)).forEach(m => {
    const h = table[m.home_captain_id];
    const a = table[m.away_captain_id];
    if (!h || !a) return;
    const hs = m.home_score, as_ = m.away_score;
    h.p++; a.p++;
    h.gf += hs; h.ga += as_; h.gd += hs - as_;
    a.gf += as_; a.ga += hs; a.gd += as_ - hs;
    if (!h.results[a.captain.id]) h.results[a.captain.id] = { gf: 0, ga: 0, pts: 0 };
    if (!a.results[h.captain.id]) a.results[h.captain.id] = { gf: 0, ga: 0, pts: 0 };
    if (hs > as_) {
      h.w++; h.pts += 3; a.l++;
      h.results[a.captain.id].pts += 3;
    } else if (hs < as_) {
      a.w++; a.pts += 3; h.l++;
      a.results[h.captain.id].pts += 3;
    } else {
      h.d++; h.pts++; a.d++; a.pts++;
      h.results[a.captain.id].pts++;
      a.results[h.captain.id].pts++;
    }
    h.results[a.captain.id].gf += hs; h.results[a.captain.id].ga += as_;
    a.results[h.captain.id].gf += as_; a.results[h.captain.id].ga += hs;
  });

  function tiebreakWinner(idA, idB) {
    const rec = tiebreakResults.find(t =>
      (t.team_a === idA && t.team_b === idB) || (t.team_a === idB && t.team_b === idA)
    );
    return rec ? rec.winner : null;
  }

  const rows = Object.values(table);
  // Teams sharing the same Pts/GD/GF form a tie group. Exactly two -> head-to-head, then TGT.
  // Three or more -> straight to TGT (no head-to-head).
  const tieKey = r => r.pts + '|' + r.gd + '|' + r.gf;
  const tieSize = {};
  rows.forEach(r => { const k = tieKey(r); tieSize[k] = (tieSize[k] || 0) + 1; });

  return rows.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.gd  !== a.gd)  return b.gd  - a.gd;
    if (b.gf  !== a.gf)  return b.gf  - a.gf;
    if (tieSize[tieKey(a)] === 2) {
      const h2h_a = a.results[b.captain.id];
      const h2h_b = b.results[a.captain.id];
      if (h2h_a && h2h_b && h2h_b.pts !== h2h_a.pts) return h2h_b.pts - h2h_a.pts;
    }
    const winner = tiebreakWinner(a.captain.id, b.captain.id);
    if (winner) return winner === a.captain.id ? -1 : 1;
    return 0;
  });
}

// Scans the sorted standings for adjacent teams that are still completely
// tied after every tiebreaker (Pts/GD/GF/GA/H2H) with no recorded shootout
// result -- a genuine deadlock per the rules doc, not just "close."
// A 3-way tie shows up as two adjacent pairs sharing the middle team,
// which is an accurate, simple representation rather than something that
// needs special-case handling.
function detectDeadlocks(rows, matches, tiebreakResults) {
  tiebreakResults = tiebreakResults || [];
  // Only meaningful once the league stage has actually finished. Before
  // that, teams sharing an identical 0-0-0-0 line (or any other
  // still-evolving line) are just mid-season -- not a genuine
  // unresolvable tie that needs a shootout.
  const leagueMatches = matches.filter(m => isLeagueRound(m.round));
  const leagueComplete = leagueMatches.length > 0 && leagueMatches.every(m => m.played);
  if (!leagueComplete) return [];

  const deadlocks = [];
  const tieKey = r => r.pts + '|' + r.gd + '|' + r.gf;
  const tieSize = {};
  rows.forEach(r => { const k = tieKey(r); tieSize[k] = (tieSize[k] || 0) + 1; });
  for (let i = 0; i < rows.length - 1; i++) {
    const a = rows[i], b = rows[i + 1];
    if (tieKey(a) !== tieKey(b)) continue;
    if (tieSize[tieKey(a)] === 2) {
      const h2h_a = a.results[b.captain.id];
      const h2h_b = b.results[a.captain.id];
      if (h2h_a && h2h_b && h2h_a.pts !== h2h_b.pts) continue; // head-to-head already resolved it
    }
    const hasResult = tiebreakResults.some(t =>
      (t.team_a === a.captain.id && t.team_b === b.captain.id) ||
      (t.team_a === b.captain.id && t.team_b === a.captain.id)
    );
    if (hasResult) continue; // already resolved
    deadlocks.push({ teamA: a.captain, teamB: b.captain, position: i + 1 });
  }
  return deadlocks;
}

// ── Tiebreaker badge ──
function _tiebreakLabel(r, i, rows, tiebreakResults) {
  if (i === 0) return null;
  const prev = rows[i - 1];
  if (!prev || prev.pts !== r.pts) return null;
  if (prev.gd !== r.gd) return 'GD';
  if (prev.gf !== r.gf) return 'GF';
  const size = rows.filter(x => x.pts === r.pts && x.gd === r.gd && x.gf === r.gf).length;
  if (size === 2) {
    const h2h  = r.results[prev.captain.id];
    const ph2h = prev.results[r.captain.id];
    if (h2h && ph2h && h2h.pts !== ph2h.pts) return 'H2H';
  }
  const hasTgt = (tiebreakResults || []).some(t =>
    (t.team_a === r.captain.id && t.team_b === prev.captain.id) ||
    (t.team_a === prev.captain.id && t.team_b === r.captain.id));
  return hasTgt ? 'TGT' : null;
}

// ── Standings table HTML (single flat table) ──
function standingsTableHtml(captains, matches, tiebreakResults) {
  tiebreakResults = tiebreakResults || [];
  const rows = computeStandings(captains, matches, tiebreakResults);
  if (!rows.length) return '<div class="text-muted">No matches played yet.</div>';

  const deadlocks = detectDeadlocks(rows, matches, tiebreakResults);
  function deadlockPartner(captainId) {
    const d = deadlocks.find(x => x.teamA.id === captainId || x.teamB.id === captainId);
    if (!d) return null;
    return d.teamA.id === captainId ? d.teamB : d.teamA;
  }

  // Season 4: all 8 teams qualify; the prelim table only decides seeding.
  function qualBadge(i) {
    if (i < PLAYOFF_TEAMS_COUNT) {
      return `<span style="font-size:10px;background:rgba(62,207,142,0.15);color:var(--green);padding:2px 6px;border-radius:4px;margin-left:6px;">Seed #${i + 1}</span>`;
    }
    return `<span style="font-size:10px;background:rgba(224,90,43,0.15);color:var(--red);padding:2px 6px;border-radius:4px;margin-left:6px;">Eliminated</span>`;
  }

  const rowsHtml = rows.map((r, i) => {
    const tb = _tiebreakLabel(r, i, rows, tiebreakResults);
    const tbBadge = tb
      ? `<span style="font-size:10px;background:rgba(224,90,43,0.15);color:var(--red);padding:2px 5px;border-radius:4px;margin-left:5px;font-weight:600;" title="Separated by ${tb}">↑${tb}</span>`
      : '';
    const partner = deadlockPartner(r.captain.id);
    const deadlockBadge = partner
      ? `<span style="font-size:10px;background:rgba(240,192,64,0.15);color:var(--accent);padding:2px 6px;border-radius:4px;margin-left:6px;" title="Tied with ${partner.team_name || partner.name} on every tiebreaker -- needs a shootout">⚠ Shootout Pending</span>`
      : '';
    const rowBg = i < PLAYOFF_TEAMS_COUNT ? 'background:rgba(62,207,142,0.04);' : 'background:rgba(224,90,43,0.03);';
    return `
      <tr style="border-bottom:0.5px solid var(--border);${rowBg}">
        <td style="padding:10px 10px;color:var(--muted);">${i+1}</td>
        <td style="padding:10px 10px;font-weight:500;color:var(--text);">${r.captain.team_name || r.captain.name}${qualBadge(i)}${tbBadge}${deadlockBadge}</td>
        <td style="padding:10px 6px;text-align:center;color:var(--muted);">${r.p}</td>
        <td style="padding:10px 6px;text-align:center;color:var(--green);">${r.w}</td>
        <td style="padding:10px 6px;text-align:center;color:var(--muted);">${r.d}</td>
        <td style="padding:10px 6px;text-align:center;color:var(--red);">${r.l}</td>
        <td style="padding:10px 6px;text-align:center;color:var(--muted);">${r.gf}</td>
        <td style="padding:10px 6px;text-align:center;color:var(--muted);">${r.ga}</td>
        <td style="padding:10px 6px;text-align:center;color:${r.gd>0?'var(--green)':r.gd<0?'var(--red)':'var(--muted)'};">${r.gd>0?'+':''}${r.gd}</td>
        <td style="padding:10px 8px;text-align:center;font-family:var(--font-display);font-size:1.1rem;color:var(--accent);">${r.pts}</td>
      </tr>`;
  }).join('');

  return `
    <div style="overflow-x:auto;margin-bottom:24px;">
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="border-bottom:1px solid var(--border);">
            <th style="text-align:left;padding:8px 10px;color:var(--muted);font-weight:500;">#</th>
            <th style="text-align:left;padding:8px 10px;color:var(--muted);font-weight:500;">Team</th>
            <th style="padding:8px 6px;color:var(--muted);font-weight:500;">P</th>
            <th style="padding:8px 6px;color:var(--muted);font-weight:500;">W</th>
            <th style="padding:8px 6px;color:var(--muted);font-weight:500;">D</th>
            <th style="padding:8px 6px;color:var(--muted);font-weight:500;">L</th>
            <th style="padding:8px 6px;color:var(--muted);font-weight:500;">GF</th>
            <th style="padding:8px 6px;color:var(--muted);font-weight:500;">GA</th>
            <th style="padding:8px 6px;color:var(--muted);font-weight:500;">GD</th>
            <th style="padding:8px 8px;color:var(--muted);font-weight:500;">Pts</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>
    <div style="font-size:11px;color:var(--muted);margin-top:4px;padding:0 4px;">
      <span style="color:var(--green);">●</span> All 8 teams qualify for the playoffs. Rank sets the seed. Tiebreakers: Pts, GD, GF, Head-to-Head, TGT.
      ${deadlocks.length ? '&nbsp; <span style="color:var(--accent);">●</span> ' + deadlocks.length + ' shootout' + (deadlocks.length > 1 ? 's' : '') + ' pending' : ''}
    </div>`;
}

// ── Top scorers ──
// matches (optional): when given, only goals from CONFIRMED (played) matches count, so goals entered for a game that
// is still being entered never show up early.
function computeTopScorers(players, goals, captains, matches) {
  if (matches) {
    const done = new Set(matches.filter(m => m.played).map(m => m.id));
    goals = goals.filter(g => done.has(g.match_id));
  }
  const scored = {};
  goals.forEach(g => {
    if (!scored[g.player_id]) scored[g.player_id] = 0;
    scored[g.player_id]++;
  });
  return Object.entries(scored)
    .map(([pid, count]) => {
      const p = players.find(x => x.id === pid);
      const capAsPlayer = !p ? captains.find(x => x.id === pid) : null;
      if (p) {
        const c = captains.find(x => x.id === p.captain_id);
        return { player: p, team: c, goals: count };
      } else if (capAsPlayer) {
        return { player: { id: capAsPlayer.id, name: capAsPlayer.name + ' (C)' }, team: capAsPlayer, goals: count };
      }
      return null;
    })
    .filter(x => x)
    .sort((a, b) => b.goals - a.goals);
}

function topScorersHtml(scorers) {
  if (!scorers.length) return '<div class="text-muted">No goals recorded yet.</div>';
  return scorers.map((s, i) => `
    <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:0.5px solid var(--border);">
      <div style="font-family:var(--font-display);font-size:1.4rem;color:var(--muted);min-width:28px;">${i+1}</div>
      <div style="flex:1;">
        <div style="font-weight:500;color:var(--text);font-size:14px;">${s.player.name}</div>
        <div style="font-size:12px;color:var(--muted);">${s.team ? (s.team.team_name || s.team.name) : '—'}</div>
      </div>
      <div style="font-family:var(--font-display);font-size:1.6rem;color:var(--accent);">${s.goals}</div>
      <div style="font-size:11px;color:var(--muted);">goals</div>
    </div>`).join('');
}

// ── MVP leaderboard ──
// captains (optional): captains play too, so a captain can be MVP. matches.mvp_player_id holds a player id OR a captain id.
function computeMvpLeaderboard(players, matches, captains) {
  captains = captains || [];
  const counts = {};
  matches.filter(m => m.played && m.mvp_player_id).forEach(m => {
    counts[m.mvp_player_id] = (counts[m.mvp_player_id] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([pid, awards]) => {
      const p = players.find(x => x.id === pid);
      if (p) return { player: p, awards };
      const c = captains.find(x => x.id === pid);
      return c ? { player: { id: c.id, name: c.name + ' (C)', captain_id: c.id }, awards } : { player: null, awards };
    })
    .filter(x => x.player)
    .sort((a, b) => b.awards - a.awards);
}

function mvpLeaderboardHtml(leaders, matches, players, captains) {
  if (!leaders.length) return '<div class="text-muted">No MVPs awarded yet.</div>';
  return leaders.map((s, i) => {
    const cap = captains.find(c => c.id === s.player.captain_id);
    const trophy = i === 0 ? '🏆' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
    return `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:0.5px solid var(--border);">
        <div style="font-size:1.3rem;min-width:28px;">${trophy || `<span style="font-family:var(--font-display);color:var(--muted);font-size:1.2rem;">${i+1}</span>`}</div>
        <div style="flex:1;">
          <div style="font-weight:500;color:var(--text);font-size:14px;">${s.player.name}</div>
          <div style="font-size:12px;color:var(--muted);">${cap ? (cap.team_name || cap.name) : '—'}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-family:var(--font-display);font-size:1.6rem;color:var(--accent);">${s.awards}</div>
          <div style="font-size:11px;color:var(--muted);">MVP award${s.awards !== 1 ? 's' : ''}</div>
        </div>
      </div>`;
  }).join('');
}

// ── Match schedule HTML ──
function matchScheduleHtml(matches, captains, players, standings) {
  const rows = standings || [];

  // "Inter OD (Oneil)": team name with the captain beside it. A team without a name just shows the captain.
  function cname(c) {
    if (!c) return '<span style="color:var(--muted)">TBD</span>';
    if (!c.team_name || c.team_name === c.name) return c.name;
    return c.team_name + ' <span style="color:var(--muted);font-weight:400;">(' + c.name + ')</span>';
  }

  function matchCard(m, label) {
    const h = captains.find(c => c.id === m.home_captain_id);
    const a = captains.find(c => c.id === m.away_captain_id);
    const mvp = m.mvp_player_id
      ? (players.find(p => p.id === m.mvp_player_id) || captains.find(c => c.id === m.mvp_player_id))
      : null;
    const winner = m.home_score > m.away_score ? 'home' : m.home_score < m.away_score ? 'away' : 'draw';
    return `
      <div style="background:var(--surface2);border-radius:var(--radius);padding:12px 14px;margin-bottom:8px;">
        ${label ? `<div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);margin-bottom:6px;">${label}</div>` : ''}
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="flex:1;text-align:right;font-weight:${winner==='home'?'600':'400'};color:${winner==='home'?'var(--text)':'var(--muted)'};">${cname(h)}</span>
          <span style="font-family:var(--font-display);font-size:1.4rem;color:var(--accent);min-width:52px;text-align:center;">${m.home_score} – ${m.away_score}</span>
          <span style="flex:1;font-weight:${winner==='away'?'600':'400'};color:${winner==='away'?'var(--text)':'var(--muted)'};">${cname(a)}</span>
        </div>
        ${mvp ? `<div style="text-align:center;font-size:11px;color:var(--accent);margin-top:6px;">⭐ MVP: ${mvp.name}</div>` : ''}
      </div>`;
  }

  function upcomingCard(homeC, awayC, label) {
    return `
      <div style="background:var(--surface);border:0.5px solid var(--border);border-radius:var(--radius);padding:12px 14px;margin-bottom:8px;">
        ${label ? `<div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);margin-bottom:6px;">${label}</div>` : ''}
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="flex:1;text-align:right;color:var(--text);font-weight:500;">${cname(homeC)}</span>
          <span style="font-size:12px;color:var(--muted);min-width:52px;text-align:center;">vs</span>
          <span style="flex:1;color:var(--text);font-weight:500;">${cname(awayC)}</span>
        </div>
      </div>`;
  }

  function sectionHeader(title) {
    return `<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);margin:16px 0 10px;font-weight:500;">${title}</div>`;
  }

  function sortedLeague() {
    return matches
      .filter(m => isLeagueRound(m.round))
      .sort((a, b) => {
        const av = Number(a.display_order), bv = Number(b.display_order);
        const an = isNaN(av) ? 9999 : av, bn = isNaN(bv) ? 9999 : bv;
        return an !== bn ? an - bn : new Date(a.created_at||0) - new Date(b.created_at||0);
      });
  }

  let html = '';

  // ── League Stage ──
  const leagueMatches = sortedLeague();
  if (leagueMatches.length) {
    html += sectionHeader('League Stage');
    leagueMatches.forEach((m, i) => {
      const h = captains.find(c => c.id === m.home_captain_id);
      const a = captains.find(c => c.id === m.away_captain_id);
      const label = `Match ${m.display_order || (i+1)}`;
      html += m.played ? matchCard(m, label) : upcomingCard(h, a, label);
    });
  }

  // ── Playoffs (double elimination): list the generated fixtures in play order ──
  const playoffMatches = PLAYOFF_ROUNDS
    .map(r => matches.find(m => m.round === r.code))
    .filter(Boolean);
  if (playoffMatches.length) {
    html += sectionHeader('Playoffs');
    playoffMatches.forEach(m => {
      const label = roundLabel(m.round) + ' · ' + roundMinutes(m.round) + ' min';
      const h = captains.find(c => c.id === m.home_captain_id);
      const a = captains.find(c => c.id === m.away_captain_id);
      html += m.played ? matchCard(m, label) : upcomingCard(h, a, label);
    });
  }

  return html || '<div class="text-muted">No fixtures loaded yet.</div>';
}


// ── Playoff preview: what Round 1 would look like if the prelims ended now ──
// Only while prelims are in progress (at least one played, at least one left). Once the last prelim game
// is in, the real bracket takes over on the Schedule tab.
function seedPreviewHtml(captains, matches, tiebreakResults) {
  const league = (matches || []).filter(m => isLeagueRound(m.round));
  const played = league.filter(m => m.played).length;
  if (!league.length || !played || played === league.length) return '';
  const rows = computeStandings(captains, matches, tiebreakResults || []);
  if (rows.length < PLAYOFF_TEAMS_COUNT) return '';
  function team(i) {
    const c = rows[i].captain;
    return '<span style="font-weight:500;color:var(--text);">' + (c.team_name || c.name) + '</span>';
  }
  const pairs = [[0, 7], [1, 6], [2, 5], [3, 4]];
  const lines = pairs.map(p =>
    '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:0.5px solid var(--border);">'
    + '<span style="flex:1;text-align:right;"><i style="color:var(--muted);font-style:normal;font-size:11px;">#' + (p[0] + 1) + '</i> ' + team(p[0]) + '</span>'
    + '<span style="color:var(--muted);font-size:12px;min-width:24px;text-align:center;">vs</span>'
    + '<span style="flex:1;"><i style="color:var(--muted);font-style:normal;font-size:11px;">#' + (p[1] + 1) + '</i> ' + team(p[1]) + '</span></div>').join('');
  return '<div class="section-title" style="margin-top:20px;">Playoff Preview</div>'
    + '<div class="form-card" style="padding:12px 14px;">'
    + '<div style="font-size:12px;color:var(--muted);margin-bottom:4px;">If the prelims ended now, Winners Round 1 would be:</div>'
    + lines
    + '<div style="font-size:11px;color:var(--muted);margin-top:10px;">Not final. ' + played + ' of ' + league.length + ' prelim games played. Seeds lock after the last one.</div>'
    + '</div>';
}
