// ── BPL Dallas · Shared Standings & Stats Logic ──
// Tournament format: 8 teams, single table, 3 Swiss rounds, then QF/SF/Final

const LEAGUE_ROUNDS = ['1', '2', '3'];
const KO_ROUNDS     = ['QF1', 'QF2', 'SF1', 'SF2', 'Final'];

function isLeagueRound(round) { return LEAGUE_ROUNDS.includes(String(round)); }
function isKoRound(round)     { return KO_ROUNDS.includes(String(round)); }

// ── Core standings computation ──
function computeStandings(captains, matches) {
  const table = {};
  captains.forEach(c => {
    table[c.id] = { captain: c, p:0, w:0, l:0, gf:0, ga:0, gd:0, pts:0, results:{} };
  });

  matches.filter(m => m.played && isLeagueRound(m.round)).forEach(m => {
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
    } else {
      a.w++; a.pts += 3; h.l++;
      a.results[h.captain.id].pts += 3;
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

// ── Tiebreaker badge helper ──
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

// ── Standings table HTML ──
function standingsTableHtml(captains, matches) {
  const rows = computeStandings(captains, matches);
  if (!rows.length) return '<div class="text-muted">No matches played yet.</div>';

  function qualBadge(i) {
    if (i < 2) return `<span style="font-size:10px;background:rgba(62,207,142,0.15);color:var(--green);padding:2px 6px;border-radius:4px;margin-left:6px;">→ SF</span>`;
    if (i < 6) return `<span style="font-size:10px;background:rgba(240,192,64,0.15);color:var(--accent);padding:2px 6px;border-radius:4px;margin-left:6px;">QF</span>`;
    return '';
  }

  const rowsHtml = rows.map((r, i) => {
    const tb = _tiebreakLabel(r, i, rows);
    const tbBadge = tb
      ? `<span style="font-size:10px;background:rgba(224,90,43,0.15);color:var(--red);padding:2px 5px;border-radius:4px;margin-left:5px;font-weight:600;" title="Separated by ${tb}">↑${tb}</span>`
      : '';
    const rowBg = i < 2 ? 'background:rgba(62,207,142,0.04);'
                : i < 6 ? 'background:rgba(240,192,64,0.03);' : '';
    return `
      <tr style="border-bottom:0.5px solid var(--border);${rowBg}">
        <td style="padding:10px 10px;color:var(--muted);">${i+1}</td>
        <td style="padding:10px 10px;font-weight:500;color:var(--text);">${r.captain.team_name || r.captain.name}${qualBadge(i)}${tbBadge}</td>
        <td style="padding:10px 6px;text-align:center;color:var(--muted);">${r.p}</td>
        <td style="padding:10px 6px;text-align:center;color:var(--green);">${r.w}</td>
        <td style="padding:10px 6px;text-align:center;color:var(--red);">${r.l}</td>
        <td style="padding:10px 6px;text-align:center;color:var(--muted);">${r.gf}</td>
        <td style="padding:10px 6px;text-align:center;color:var(--muted);">${r.ga}</td>
        <td style="padding:10px 6px;text-align:center;color:${r.gd>0?'var(--green)':r.gd<0?'var(--red)':'var(--muted)'};">${r.gd>0?'+':''}${r.gd}</td>
        <td style="padding:10px 8px;text-align:center;font-family:var(--font-display);font-size:1.1rem;color:var(--accent);">${r.pts}</td>
      </tr>`;
  }).join('');

  return `
    <div style="overflow-x:auto;margin-bottom:8px;">
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="border-bottom:1px solid var(--border);">
            <th style="text-align:left;padding:8px 10px;color:var(--muted);font-weight:500;">#</th>
            <th style="text-align:left;padding:8px 10px;color:var(--muted);font-weight:500;">Team</th>
            <th style="padding:8px 6px;color:var(--muted);font-weight:500;">P</th>
            <th style="padding:8px 6px;color:var(--muted);font-weight:500;">W</th>
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
    <div style="font-size:11px;color:var(--muted);margin-top:6px;padding:0 4px;">
      <span style="color:var(--green);">●</span> Top 2 → Semi-Finals &nbsp;
      <span style="color:var(--accent);">●</span> 3rd–6th → Quarter-Finals
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

// ── Match schedule HTML (shared by admin + board) ──
function matchScheduleHtml(matches, captains, players, standings) {
  const leagueMatches   = matches.filter(m => isLeagueRound(m.round));
  const knockoutMatches = matches.filter(m => isKoRound(m.round));

  function sortedRound(round) {
    return leagueMatches
      .filter(m => String(m.round) === String(round))
      .sort((a, b) => {
        const av = Number(a.display_order), bv = Number(b.display_order);
        const an = Number.isNaN(av) ? 9999 : av, bn = Number.isNaN(bv) ? 9999 : bv;
        return an !== bn ? an - bn : new Date(a.created_at||0) - new Date(b.created_at||0);
      });
  }

  const s = standings || [];
  function seed(pos) { return s[pos]?.captain || null; }
  function cname(c) { return c ? (c.team_name || c.name) : '<span style="color:var(--muted)">TBD</span>'; }

  function matchCard(m, label) {
    const h = captains.find(c => c.id === m.home_captain_id);
    const a = captains.find(c => c.id === m.away_captain_id);
    const mvp = m.mvp_player_id ? (players.find(p => p.id === m.mvp_player_id) || captains.find(c => c.id === m.mvp_player_id)) : null;
    const winner = m.home_score > m.away_score ? 'home' : 'away';
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

  function koWinner(m) {
    if (!m || !m.played) return null;
    return captains.find(c => c.id === (m.home_score > m.away_score ? m.home_captain_id : m.away_captain_id));
  }

  let html = '';

  ['1','2','3'].forEach(round => {
    const rMatches = sortedRound(round);
    if (!rMatches.length) return;
    html += sectionHeader(`Round ${round}`);
    rMatches.forEach((m, i) => {
      const h = captains.find(c => c.id === m.home_captain_id);
      const a = captains.find(c => c.id === m.away_captain_id);
      const label = `Match ${m.display_order || (i + 1)}`;
      html += m.played ? matchCard(m, label) : upcomingCard(h, a, label);
    });
  });

  const qf1 = knockoutMatches.find(m => m.round === 'QF1');
  const qf2 = knockoutMatches.find(m => m.round === 'QF2');
  const sf1 = knockoutMatches.find(m => m.round === 'SF1');
  const sf2 = knockoutMatches.find(m => m.round === 'SF2');
  const fin = knockoutMatches.find(m => m.round === 'Final');

  if (qf1 || qf2) {
    html += sectionHeader('Quarter-Finals');
    if (qf1) html += qf1.played ? matchCard(qf1, 'QF1 · 3rd vs 6th')
      : upcomingCard(captains.find(c=>c.id===qf1.home_captain_id)||seed(2), captains.find(c=>c.id===qf1.away_captain_id)||seed(5), 'QF1 · 3rd vs 6th');
    if (qf2) html += qf2.played ? matchCard(qf2, 'QF2 · 4th vs 5th')
      : upcomingCard(captains.find(c=>c.id===qf2.home_captain_id)||seed(3), captains.find(c=>c.id===qf2.away_captain_id)||seed(4), 'QF2 · 4th vs 5th');
  }

  if (sf1 || sf2) {
    html += sectionHeader('Semi-Finals');
    if (sf1) html += sf1.played ? matchCard(sf1, 'SF1 · 1st vs W(QF2)')
      : upcomingCard(captains.find(c=>c.id===sf1.home_captain_id)||seed(0), captains.find(c=>c.id===sf1.away_captain_id)||koWinner(qf2), 'SF1 · 1st vs W(QF2)');
    if (sf2) html += sf2.played ? matchCard(sf2, 'SF2 · 2nd vs W(QF1)')
      : upcomingCard(captains.find(c=>c.id===sf2.home_captain_id)||seed(1), captains.find(c=>c.id===sf2.away_captain_id)||koWinner(qf1), 'SF2 · 2nd vs W(QF1)');
  }

  if (fin) {
    html += sectionHeader('Final');
    html += fin.played ? matchCard(fin, '🏆 Final')
      : upcomingCard(captains.find(c=>c.id===fin.home_captain_id)||koWinner(sf1), captains.find(c=>c.id===fin.away_captain_id)||koWinner(sf2), '🏆 Final');
  }

  return html || '<div class="text-muted">No fixtures loaded yet.</div>';
}
