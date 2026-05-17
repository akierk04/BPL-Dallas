// ── BPL Dallas · Shared Standings & Stats Logic ──
// Tournament format: 10 teams, 2 groups of 5, round-robin within group
// Knockouts: Super 8 → Super 4 → Semis (H&A) → Final

const LEAGUE_ROUNDS = ['A','B','1','2','3','4','5','6','7','8','9','10'];
const S8_ROUNDS     = ['S8A','S8B','S8C','S8D'];
const S4_ROUNDS     = ['S4A','S4B'];
const SF_ROUNDS     = ['SF1_L1','SF1_L2','SF2_L1','SF2_L2'];
const KO_ROUNDS     = [...S8_ROUNDS, ...S4_ROUNDS, ...SF_ROUNDS, 'Final'];

function isLeagueRound(round) { return LEAGUE_ROUNDS.includes(String(round)); }
function isKoRound(round)     { return KO_ROUNDS.includes(String(round)); }
function isS8Round(round)     { return S8_ROUNDS.includes(String(round)); }
function isS4Round(round)     { return S4_ROUNDS.includes(String(round)); }
function isSfRound(round)     { return SF_ROUNDS.includes(String(round)); }

// ── Compute standings for one group ──
function computeGroupStandings(captains, matches, group) {
  const groupCaps = captains.filter(c => c.group_name === group);
  const table = {};
  groupCaps.forEach(c => {
    table[c.id] = { captain: c, p:0, w:0, d:0, l:0, gf:0, ga:0, gd:0, pts:0, results:{} };
  });

  matches.filter(m => m.played && (isLeagueRound(m.round) || String(m.round) === group)).forEach(m => {
    const h = table[m.home_captain_id];
    const a = table[m.away_captain_id];
    if (!h || !a) return;
    const hs = m.home_score, as_ = m.away_score;
    h.p++; a.p++;
    h.gf += hs; h.ga += as_; h.gd += hs - as_;
    a.gf += as_; a.ga += hs; a.gd += as_ - hs;
    if (!h.results[a.captain.id]) h.results[a.captain.id] = { gf:0, ga:0, pts:0 };
    if (!a.results[h.captain.id]) a.results[h.captain.id] = { gf:0, ga:0, pts:0 };
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

  return Object.values(table).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.gd  !== a.gd)  return b.gd  - a.gd;
    if (b.gf  !== a.gf)  return b.gf  - a.gf;
    if (a.ga  !== b.ga)  return a.ga  - b.ga;
    const h2h_a = a.results[b.captain.id];
    const h2h_b = b.results[a.captain.id];
    if (h2h_a && h2h_b && h2h_b.pts !== h2h_a.pts) return h2h_b.pts - h2h_a.pts;
    return 0;
  });
}

// ── computeStandings: returns { groupA, groupB } ──
function computeStandings(captains, matches) {
  return {
    groupA: computeGroupStandings(captains, matches, 'A'),
    groupB: computeGroupStandings(captains, matches, 'B')
  };
}

// ── Tiebreaker badge ──
function _tiebreakLabel(r, i, rows) {
  if (i === 0) return null;
  const prev = rows[i - 1];
  if (!prev || prev.pts !== r.pts) return null;
  if (prev.gd !== r.gd) return 'GD';
  if (prev.gf !== r.gf) return 'GF';
  if (prev.ga !== r.ga) return 'GA';
  const h2h  = r.results[prev.captain.id];
  const ph2h = prev.results[r.captain.id];
  if (h2h && ph2h && h2h.pts !== ph2h.pts) return 'H2H';
  return null;
}

// ── Group table HTML ──
function _groupTableHtml(rows, groupLabel) {
  if (!rows.length) return '';

  // Qualification badges:
  // Position 0 → Direct SF
  // Positions 1–4 → Super 8
  function qualBadge(i) {
    if (i === 0) return `<span style="font-size:10px;background:rgba(62,207,142,0.15);color:var(--green);padding:2px 6px;border-radius:4px;margin-left:6px;">→ SF</span>`;
    return `<span style="font-size:10px;background:rgba(240,192,64,0.15);color:var(--accent);padding:2px 6px;border-radius:4px;margin-left:6px;">Super 8</span>`;
  }

  const rowsHtml = rows.map((r, i) => {
    const tb = _tiebreakLabel(r, i, rows);
    const tbBadge = tb
      ? `<span style="font-size:10px;background:rgba(224,90,43,0.15);color:var(--red);padding:2px 5px;border-radius:4px;margin-left:5px;font-weight:600;" title="Separated by ${tb}">↑${tb}</span>`
      : '';
    const rowBg = i === 0 ? 'background:rgba(62,207,142,0.04);'
                : 'background:rgba(240,192,64,0.02);';
    return `
      <tr style="border-bottom:0.5px solid var(--border);${rowBg}">
        <td style="padding:10px 10px;color:var(--muted);">${i+1}</td>
        <td style="padding:10px 10px;font-weight:500;color:var(--text);">${r.captain.team_name || r.captain.name}${qualBadge(i)}${tbBadge}</td>
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
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);margin-bottom:8px;font-weight:600;">${groupLabel}</div>
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
    </div>`;
}

// ── Standings table HTML (both groups) ──
function standingsTableHtml(captains, matches) {
  const { groupA, groupB } = computeStandings(captains, matches);
  if (!groupA.length && !groupB.length) return '<div class="text-muted">No matches played yet.</div>';
  return (groupA.length ? _groupTableHtml(groupA, 'Group A') : '') +
         (groupB.length ? _groupTableHtml(groupB, 'Group B') : '') +
    `<div style="font-size:11px;color:var(--muted);margin-top:4px;padding:0 4px;">
      <span style="color:var(--green);">●</span> 1st → Direct Semi-Final &nbsp;
      <span style="color:var(--accent);">●</span> 2nd–5th → Super 8
    </div>`;
}

// ── Top scorers ──
function computeTopScorers(players, goals, captains) {
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
function computeMvpLeaderboard(players, matches) {
  const counts = {};
  matches.filter(m => m.played && m.mvp_player_id).forEach(m => {
    counts[m.mvp_player_id] = (counts[m.mvp_player_id] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([pid, awards]) => {
      const p = players.find(x => x.id === pid);
      return { player: p, awards };
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

// ── SF aggregate helper ──
// Returns { leg1, leg2, homeAgg, awayAgg, winner } for a given SF prefix (e.g. 'SF1')
function computeSfAggregate(matches, captains, sfPrefix) {
  const l1 = matches.find(m => m.round === sfPrefix + '_L1');
  const l2 = matches.find(m => m.round === sfPrefix + '_L2');
  if (!l1 && !l2) return null;

  // Leg 1: home/away defined in DB
  // Leg 2: home/away swapped relative to leg 1
  const homeId = l1?.home_captain_id || l2?.away_captain_id || null;
  const awayId = l1?.away_captain_id || l2?.home_captain_id || null;

  const l1HomeGoals = l1?.played ? l1.home_score : null;
  const l1AwayGoals = l1?.played ? l1.away_score : null;
  const l2HomeGoals = l2?.played ? l2.home_score : null; // l2 home = original away team
  const l2AwayGoals = l2?.played ? l2.away_score : null; // l2 away = original home team

  // Aggregate from original home team perspective:
  // homeAgg = l1 home goals + l2 away goals (both times home team scores)
  // awayAgg = l1 away goals + l2 home goals
  const bothPlayed = l1?.played && l2?.played;
  let homeAgg = null, awayAgg = null, winner = null;

  if (bothPlayed) {
    homeAgg = (l1.home_score || 0) + (l2.away_score || 0);
    awayAgg = (l1.away_score || 0) + (l2.home_score || 0);
    if (homeAgg > awayAgg) winner = captains.find(c => c.id === homeId) || null;
    else if (awayAgg > homeAgg) winner = captains.find(c => c.id === awayId) || null;
    // Equal = TGT played — winner determined by whoever has higher score after TGT
    // Admin enters TGT as extra goals — highest agg wins as entered
  }

  return {
    l1, l2,
    homeId, awayId,
    homeAgg, awayAgg,
    bothPlayed, winner
  };
}

// ── Match schedule HTML ──
function matchScheduleHtml(matches, captains, players, standings) {
  const { groupA = [], groupB = [] } = standings || {};

  function cname(c) { return c ? (c.team_name || c.name) : '<span style="color:var(--muted)">TBD</span>'; }

  // Seeded positions: groupA[0]=A1, groupA[1]=A2 ... groupB[0]=B1 ...
  function seedA(i) { return groupA[i]?.captain || null; }
  function seedB(i) { return groupB[i]?.captain || null; }

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

  function sortedGroup(group) {
    return matches
      .filter(m => String(m.round) === String(group))
      .sort((a, b) => {
        const av = Number(a.display_order), bv = Number(b.display_order);
        const an = isNaN(av) ? 9999 : av, bn = isNaN(bv) ? 9999 : bv;
        return an !== bn ? an - bn : new Date(a.created_at||0) - new Date(b.created_at||0);
      });
  }

  function koWinner(round) {
    const m = matches.find(x => x.round === round && x.played);
    if (!m) return null;
    return captains.find(c => c.id === (m.home_score > m.away_score ? m.home_captain_id : m.away_captain_id));
  }

  let html = '';

  // ── Group Stage — interleaved A & B by display_order ──
  const gAMatches = sortedGroup('A');
  const gBMatches = sortedGroup('B');
  const allGroupMatches = [...gAMatches, ...gBMatches].sort((a, b) => {
    const av = Number(a.display_order), bv = Number(b.display_order);
    const an = isNaN(av) ? 9999 : av, bn = isNaN(bv) ? 9999 : bv;
    return an !== bn ? an - bn : new Date(a.created_at||0) - new Date(b.created_at||0);
  });

  if (allGroupMatches.length) {
    html += sectionHeader('Group Stage');
    allGroupMatches.forEach((m, i) => {
      const h = captains.find(c => c.id === m.home_captain_id);
      const a = captains.find(c => c.id === m.away_captain_id);
      const grpBadge = `<span style="font-size:9px;padding:1px 5px;border-radius:3px;margin-left:4px;background:rgba(240,192,64,0.12);color:var(--accent);">Grp ${m.round}</span>`;
      const label = `Match ${m.display_order || (i+1)}${grpBadge}`;
      html += m.played ? matchCard(m, label) : upcomingCard(h, a, label);
    });
  }

  // ── Super 8 ──
  const s8Matches = matches.filter(m => isS8Round(m.round));
  if (s8Matches.length) {
    html += sectionHeader('Super 8');
    const s8Labels = {
      'S8A': 'S8A · A2 vs B5',
      'S8B': 'S8B · B2 vs A5',
      'S8C': 'S8C · A3 vs B4',
      'S8D': 'S8D · B3 vs A4'
    };
    const s8Seeds = {
      'S8A': { home: seedA(1), away: seedB(4) },
      'S8B': { home: seedB(1), away: seedA(4) },
      'S8C': { home: seedA(2), away: seedB(3) },
      'S8D': { home: seedB(2), away: seedA(3) }
    };
    ['S8A','S8B','S8C','S8D'].forEach(r => {
      const m = s8Matches.find(x => x.round === r);
      if (!m) return;
      const label = s8Labels[r];
      if (m.played) {
        html += matchCard(m, label);
      } else {
        const h = captains.find(c => c.id === m.home_captain_id) || s8Seeds[r].home;
        const a = captains.find(c => c.id === m.away_captain_id) || s8Seeds[r].away;
        html += upcomingCard(h, a, label);
      }
    });
  }

  // ── Super 4 ──
  const s4Matches = matches.filter(m => isS4Round(m.round));
  if (s4Matches.length) {
    html += sectionHeader('Super 4');
    const s4Labels = {
      'S4A': 'S4A · W(S8A) vs W(S8D)',
      'S4B': 'S4B · W(S8B) vs W(S8C)'
    };
    ['S4A','S4B'].forEach(r => {
      const m = s4Matches.find(x => x.round === r);
      if (!m) return;
      const label = s4Labels[r];
      if (m.played) {
        html += matchCard(m, label);
      } else {
        const h = captains.find(c => c.id === m.home_captain_id) || koWinner('S8A') || (r === 'S4B' ? koWinner('S8B') : null);
        const a = captains.find(c => c.id === m.away_captain_id) || koWinner('S8D') || (r === 'S4B' ? koWinner('S8C') : null);
        html += upcomingCard(h, a, label);
      }
    });
  }

  // ── Semi-Finals (Home & Away legs) ──
  const sfAny = matches.some(m => isSfRound(m.round));
  if (sfAny) {
    html += sectionHeader('Semi-Finals');
    ['SF1','SF2'].forEach(sf => {
      const agg = computeSfAggregate(matches, captains, sf);
      if (!agg) return;
      const { l1, l2, homeId, awayId, homeAgg, awayAgg, bothPlayed } = agg;
      const homeC = captains.find(c => c.id === homeId);
      const awayC = captains.find(c => c.id === awayId);
      const sfLabel = sf === 'SF1' ? `${sf} · B1 vs W(S4B)` : `${sf} · A1 vs W(S4A)`;

      html += `<div style="background:var(--surface2);border-radius:var(--radius);padding:14px 16px;margin-bottom:10px;">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);margin-bottom:8px;">${sfLabel}</div>`;

      // Leg 1
      if (l1) {
        if (l1.played) {
          const hw = l1.home_score > l1.away_score ? 'won' : l1.home_score < l1.away_score ? 'lost' : '';
          html += `<div style="margin-bottom:6px;">
            <div style="font-size:10px;color:var(--muted);margin-bottom:4px;">Leg 1</div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="flex:1;text-align:right;font-weight:${hw==='won'?'600':'400'};color:${hw==='won'?'var(--text)':'var(--muted)'};">${cname(homeC)}</span>
              <span style="font-family:var(--font-display);font-size:1.2rem;color:var(--accent);min-width:52px;text-align:center;">${l1.home_score} – ${l1.away_score}</span>
              <span style="flex:1;font-weight:${hw==='lost'?'600':'400'};color:${hw==='lost'?'var(--text)':'var(--muted)'};">${cname(awayC)}</span>
            </div>
          </div>`;
        } else {
          html += `<div style="margin-bottom:6px;">
            <div style="font-size:10px;color:var(--muted);margin-bottom:4px;">Leg 1</div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="flex:1;text-align:right;color:var(--text);">${cname(homeC)}</span>
              <span style="font-size:12px;color:var(--muted);min-width:52px;text-align:center;">vs</span>
              <span style="flex:1;color:var(--text);">${cname(awayC)}</span>
            </div>
          </div>`;
        }
      }

      // Leg 2 (home/away flipped)
      if (l2) {
        if (l2.played) {
          const hw = l2.home_score > l2.away_score ? 'won' : l2.home_score < l2.away_score ? 'lost' : '';
          html += `<div style="margin-bottom:6px;">
            <div style="font-size:10px;color:var(--muted);margin-bottom:4px;">Leg 2</div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="flex:1;text-align:right;font-weight:${hw==='won'?'600':'400'};color:${hw==='won'?'var(--text)':'var(--muted)'};">${cname(awayC)}</span>
              <span style="font-family:var(--font-display);font-size:1.2rem;color:var(--accent);min-width:52px;text-align:center;">${l2.home_score} – ${l2.away_score}</span>
              <span style="flex:1;font-weight:${hw==='lost'?'600':'400'};color:${hw==='lost'?'var(--text)':'var(--muted)'};">${cname(homeC)}</span>
            </div>
          </div>`;
        } else {
          html += `<div style="margin-bottom:6px;">
            <div style="font-size:10px;color:var(--muted);margin-bottom:4px;">Leg 2</div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="flex:1;text-align:right;color:var(--text);">${cname(awayC)}</span>
              <span style="font-size:12px;color:var(--muted);min-width:52px;text-align:center;">vs</span>
              <span style="flex:1;color:var(--text);">${cname(homeC)}</span>
            </div>
          </div>`;
        }
      }

      // Aggregate row
      if (bothPlayed) {
        const aggWinnerC = homeAgg > awayAgg ? homeC : awayAgg > homeAgg ? awayC : null;
        html += `<div style="margin-top:8px;padding-top:8px;border-top:0.5px solid var(--border);display:flex;align-items:center;gap:8px;">
          <span style="flex:1;text-align:right;font-weight:${homeAgg>awayAgg?'700':'400'};color:${homeAgg>awayAgg?'var(--green)':'var(--muted)'};">${cname(homeC)}</span>
          <span style="font-size:10px;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted);min-width:52px;text-align:center;">Agg ${homeAgg}–${awayAgg}</span>
          <span style="flex:1;font-weight:${awayAgg>homeAgg?'700':'400'};color:${awayAgg>homeAgg?'var(--green)':'var(--muted)'};">${cname(awayC)}</span>
        </div>
        ${aggWinnerC ? `<div style="text-align:center;font-size:12px;color:var(--green);margin-top:6px;font-weight:600;">✓ ${cname(aggWinnerC)} advances</div>` : '<div style="text-align:center;font-size:12px;color:var(--accent);margin-top:6px;">TGT</div>'}`;
      }

      html += '</div>';
    });
  }

  // ── Final ──
  const fin = matches.find(m => m.round === 'Final');
  if (fin) {
    html += sectionHeader('Final');
    // Determine SF winners for seeding
    const sf1Agg = computeSfAggregate(matches, captains, 'SF1');
    const sf2Agg = computeSfAggregate(matches, captains, 'SF2');
    const sf1Winner = sf1Agg?.winner || null;
    const sf2Winner = sf2Agg?.winner || null;
    const finH = captains.find(c => c.id === fin.home_captain_id) || sf1Winner;
    const finA = captains.find(c => c.id === fin.away_captain_id) || sf2Winner;
    html += fin.played ? matchCard(fin, '🏆 Final') : upcomingCard(finH, finA, '🏆 Final');
  }

  return html || '<div class="text-muted">No fixtures loaded yet.</div>';
}
