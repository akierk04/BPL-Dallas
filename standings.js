// ── Shared Standings & Stats Logic ──

function computeStandings(captains, matches) {
  const table = {};
  captains.forEach(c => {
    table[c.id] = { captain: c, p:0, w:0, d:0, l:0, gf:0, ga:0, gd:0, pts:0, results:{} };
  });

  matches.filter(m => m.played).forEach(m => {
    const h = table[m.home_captain_id];
    const a = table[m.away_captain_id];
    if (!h || !a) return;

    const hs = m.home_score, as = m.away_score;
    h.p++; a.p++;
    h.gf += hs; h.ga += as; h.gd += hs - as;
    a.gf += as; a.ga += hs; a.gd += as - hs;

    // Head to head record
    if (!h.results[a.captain.id]) h.results[a.captain.id] = { gf:0, ga:0, pts:0 };
    if (!a.results[h.captain.id]) a.results[h.captain.id] = { gf:0, ga:0, pts:0 };

    if (hs > as) {
      h.w++; h.pts += 3; a.l++;
      h.results[a.captain.id].pts += 3;
    } else if (hs < as) {
      a.w++; a.pts += 3; h.l++;
      a.results[h.captain.id].pts += 3;
    } else {
      h.d++; h.pts++; a.d++; a.pts++;
      h.results[a.captain.id].pts++;
      a.results[h.captain.id].pts++;
    }
    h.results[a.captain.id].gf += hs; h.results[a.captain.id].ga += as;
    a.results[h.captain.id].gf += as; a.results[h.captain.id].ga += hs;
  });

  return Object.values(table).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.gd  !== a.gd)  return b.gd  - a.gd;
    if (b.gf  !== a.gf)  return b.gf  - a.gf;
    if (a.ga  !== b.ga)  return a.ga  - b.ga;
    // Head to head
    const h2h_a = a.results[b.captain.id];
    const h2h_b = b.results[a.captain.id];
    if (h2h_a && h2h_b && h2h_b.pts !== h2h_a.pts) return h2h_b.pts - h2h_a.pts;
    return 0; // 1v1 — admin resolves
  });
}

function computeTopScorers(players, goals, captains) {
  const scored = {};
  goals.forEach(g => {
    if (!scored[g.player_id]) scored[g.player_id] = 0;
    scored[g.player_id]++;
  });
  return Object.entries(scored)
    .map(([pid, count]) => {
      const p = players.find(x => x.id === pid);
      const c = captains.find(x => x.id === p?.captain_id);
      return { player: p, team: c, goals: count };
    })
    .filter(x => x.player)
    .sort((a, b) => b.goals - a.goals);
}

function standingsTableHtml(rows) {
  if (!rows.length) return '<div class="text-muted">No matches played yet.</div>';
  return `
    <div style="overflow-x:auto;">
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
        <tbody>
          ${rows.map((r, i) => `
            <tr style="border-bottom:0.5px solid var(--border);${i===0?'background:rgba(240,192,64,0.05);':''}">
              <td style="padding:10px 10px;color:var(--muted);">${i+1}</td>
              <td style="padding:10px 10px;font-weight:500;color:var(--text);">${r.captain.name}</td>
              <td style="padding:10px 6px;text-align:center;color:var(--muted);">${r.p}</td>
              <td style="padding:10px 6px;text-align:center;color:var(--green);">${r.w}</td>
              <td style="padding:10px 6px;text-align:center;color:var(--muted);">${r.d}</td>
              <td style="padding:10px 6px;text-align:center;color:var(--red);">${r.l}</td>
              <td style="padding:10px 6px;text-align:center;color:var(--muted);">${r.gf}</td>
              <td style="padding:10px 6px;text-align:center;color:var(--muted);">${r.ga}</td>
              <td style="padding:10px 6px;text-align:center;color:${r.gd>0?'var(--green)':r.gd<0?'var(--red)':'var(--muted)'};">${r.gd>0?'+':''}${r.gd}</td>
              <td style="padding:10px 8px;text-align:center;font-family:var(--font-display);font-size:1.1rem;color:var(--accent);">${r.pts}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function topScorersHtml(scorers) {
  if (!scorers.length) return '<div class="text-muted">No goals recorded yet.</div>';
  return scorers.map((s, i) => `
    <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:0.5px solid var(--border);">
      <div style="font-family:var(--font-display);font-size:1.4rem;color:var(--muted);min-width:28px;">${i+1}</div>
      <div style="flex:1;">
        <div style="font-weight:500;color:var(--text);font-size:14px;">${s.player.name}</div>
        <div style="font-size:12px;color:var(--muted);">${s.team ? s.team.name : '—'}</div>
      </div>
      <div style="font-family:var(--font-display);font-size:1.6rem;color:var(--accent);">${s.goals}</div>
      <div style="font-size:11px;color:var(--muted);">goals</div>
    </div>`).join('');
}

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
          <div style="font-size:12px;color:var(--muted);">${cap ? cap.name : '—'}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-family:var(--font-display);font-size:1.6rem;color:var(--accent);">${s.awards}</div>
          <div style="font-size:11px;color:var(--muted);">MVP award${s.awards !== 1 ? 's' : ''}</div>
        </div>
      </div>`;
  }).join('');
}

function matchScheduleHtml(matches, captains, players, standings) {
  const leagueMatches = matches.filter(m => !m.is_knockout);
  const knockoutMatches = matches.filter(m => m.is_knockout);

  const s = standings || [];
  const p1 = s[0]?.captain, p2 = s[1]?.captain, p3 = s[2]?.captain, p4 = s[3]?.captain;

  // Build a quick lookup: captainId → standing position (1-based)
  const rankMap = {};
  s.forEach((row, i) => { rankMap[row.captain.id] = i + 1; });

  const ordinal = n => ['','1st','2nd','3rd','4th','5th','6th'][n] || `${n}th`;

  function teamLabel(captain, showRank) {
    if (!captain) return '?';
    const rank = rankMap[captain.id];
    return showRank && rank ? `${captain.name} <span style="font-size:11px;color:var(--muted);">(${ordinal(rank)})</span>` : captain.name;
  }

  function matchCard(m, label, isLeague) {
    const h = captains.find(c => c.id === m.home_captain_id);
    const a = captains.find(c => c.id === m.away_captain_id);
    const mvp = m.mvp_player_id ? players.find(p => p.id === m.mvp_player_id) : null;
    const winner = m.home_score > m.away_score ? 'home' : m.away_score > m.home_score ? 'away' : 'draw';
    const showRank = isLeague && s.length > 0;
    return `
      <div style="background:var(--surface2);border-radius:var(--radius);padding:12px 14px;margin-bottom:8px;">
        ${label ? `<div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);margin-bottom:6px;">${label}</div>` : ''}
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="flex:1;text-align:right;font-weight:${winner==='home'?'600':'400'};color:${winner==='home'?'var(--text)':'var(--muted)'};">${teamLabel(h, showRank)}</span>
          <span style="font-family:var(--font-display);font-size:1.4rem;color:var(--accent);min-width:52px;text-align:center;">${m.home_score} – ${m.away_score}</span>
          <span style="flex:1;font-weight:${winner==='away'?'600':'400'};color:${winner==='away'?'var(--text)':'var(--muted)'};">${teamLabel(a, showRank)}</span>
        </div>
        ${mvp ? `<div style="text-align:center;font-size:11px;color:var(--accent);margin-top:6px;">⭐ MVP: ${mvp.name}</div>` : ''}
      </div>`;
  }

  function upcomingCard(homeLabel, awayLabel, label) {
    return `
      <div style="background:var(--surface);border:0.5px solid var(--border);border-radius:var(--radius);padding:12px 14px;margin-bottom:8px;">
        ${label ? `<div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);margin-bottom:6px;">${label}</div>` : ''}
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="flex:1;text-align:right;color:var(--text);font-weight:500;">${homeLabel}</span>
          <span style="font-size:12px;color:var(--muted);min-width:52px;text-align:center;">vs</span>
          <span style="flex:1;color:var(--text);font-weight:500;">${awayLabel}</span>
        </div>
      </div>`;
  }

  function upcomingLeagueCard(m, matchNum) {
    const h = captains.find(c => c.id === m.home_captain_id);
    const a = captains.find(c => c.id === m.away_captain_id);
    const showRank = s.length > 0;
    return upcomingCard(teamLabel(h, showRank), teamLabel(a, showRank), `Match ${matchNum}`);
  }

  function sectionHeader(title) {
    return `<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);margin:16px 0 10px;font-weight:500;">${title}</div>`;
  }

  let html = '';

  // ── League matches ──
  const playedLeague = leagueMatches.filter(m => m.played);
  const upcomingLeague = leagueMatches.filter(m => !m.played);

  if (playedLeague.length) {
    html += sectionHeader('League Results');
    html += playedLeague.map((m, i) => matchCard(m, `Match ${i + 1}`, true)).join('');
  }

  if (upcomingLeague.length) {
    html += sectionHeader('Upcoming League Matches');
    html += upcomingLeague.map((m, i) => upcomingLeagueCard(m, playedLeague.length + i + 1)).join('');
  }

  // ── Semi-Finals — always derived from live standings ──
  html += sectionHeader('Semi-Finals');

  const sf1played = knockoutMatches.find(m => m.knockout_label === 'SF1' && m.played);
  const sf2played = knockoutMatches.find(m => m.knockout_label === 'SF2' && m.played);

  if (sf1played) {
    html += matchCard(sf1played, 'SF1 · 1st vs 4th', false);
  } else {
    html += upcomingCard(
      p1 ? `${p1.name} <span style="font-size:11px;color:var(--muted);">(1st)</span>` : '<span style="color:var(--muted)">1st Place</span>',
      p4 ? `${p4.name} <span style="font-size:11px;color:var(--muted);">(4th)</span>` : '<span style="color:var(--muted)">4th Place</span>',
      'SF1 · 1st vs 4th'
    );
  }

  if (sf2played) {
    html += matchCard(sf2played, 'SF2 · 2nd vs 3rd', false);
  } else {
    html += upcomingCard(
      p2 ? `${p2.name} <span style="font-size:11px;color:var(--muted);">(2nd)</span>` : '<span style="color:var(--muted)">2nd Place</span>',
      p3 ? `${p3.name} <span style="font-size:11px;color:var(--muted);">(3rd)</span>` : '<span style="color:var(--muted)">3rd Place</span>',
      'SF2 · 2nd vs 3rd'
    );
  }

  // ── Final ──
  html += sectionHeader('Final');
  const finalPlayed = knockoutMatches.find(m => m.knockout_label === 'Final' && m.played);
  if (finalPlayed) {
    html += matchCard(finalPlayed, '🏆 Final', false);
  } else {
    const sf1Winner = sf1played
      ? (sf1played.home_score > sf1played.away_score
          ? captains.find(c => c.id === sf1played.home_captain_id)
          : captains.find(c => c.id === sf1played.away_captain_id))
      : null;
    const sf2Winner = sf2played
      ? (sf2played.home_score > sf2played.away_score
          ? captains.find(c => c.id === sf2played.home_captain_id)
          : captains.find(c => c.id === sf2played.away_captain_id))
      : null;
    html += upcomingCard(
      sf1Winner ? `${sf1Winner.name} <span style="font-size:11px;color:var(--muted);">(W SF1)</span>` : '<span style="color:var(--muted)">Winner of SF1</span>',
      sf2Winner ? `${sf2Winner.name} <span style="font-size:11px;color:var(--muted);">(W SF2)</span>` : '<span style="color:var(--muted)">Winner of SF2</span>',
      '🏆 Final'
    );
  }

  return html || '<div class="text-muted">No fixtures loaded yet.</div>';
}
