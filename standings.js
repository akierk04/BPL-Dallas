// ── Shared Standings & Stats Logic ──

function computeGroupStandings(captains, matches, groupNum) {
const groupCaptains = captains.filter(c => c.tournament_group === String(groupNum));
const table = {};
groupCaptains.forEach(c => {
table[c.id] = { captain: c, p:0, w:0, d:0, l:0, gf:0, ga:0, gd:0, pts:0, results:{} };
});

matches.filter(m => m.played && !m.is_knockout).forEach(m => {
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

// Keep backward compat for places that call computeStandings
function computeStandings(captains, matches) {
// Returns combined sorted list (used for MVP/stats pages)
const g1 = computeGroupStandings(captains, matches, 1);
const g2 = computeGroupStandings(captains, matches, 2);
return […g1, …g2];
}

function computeTopScorers(players, goals, captains) {
const scored = {};
goals.forEach(g => {
if (!scored[g.player_id]) scored[g.player_id] = 0;
scored[g.player_id]++;
});
return Object.entries(scored)
.map(([pid, count]) => {
// Check players table first, then captains table (captains can score too)
const p = players.find(x => x.id === pid);
const capAsPlayer = !p ? captains.find(x => x.id === pid) : null;
if (p) {
const c = captains.find(x => x.id === p.captain_id);
return { player: p, team: c, goals: count };
} else if (capAsPlayer) {
// Captain scored — treat captain as both player and team
return { player: { id: capAsPlayer.id, name: capAsPlayer.name + ’ (C)’ }, team: capAsPlayer, goals: count };
}
return null;
})
.filter(x => x)
.sort((a, b) => b.goals - a.goals);
}

function groupTableHtml(rows, groupNum) {
const qualifier = [
`<span style="font-size:10px;background:rgba(62,207,142,0.15);color:var(--green);padding:2px 6px;border-radius:4px;margin-left:6px;">Qualifies</span>`,
`<span style="font-size:10px;background:rgba(240,192,64,0.15);color:var(--accent);padding:2px 6px;border-radius:4px;margin-left:6px;">QF</span>`,
`<span style="font-size:10px;background:rgba(240,192,64,0.15);color:var(--accent);padding:2px 6px;border-radius:4px;margin-left:6px;">QF</span>`,
‘’
];
return `<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);margin-bottom:10px;font-weight:500;">Group ${groupNum}</div> <div style="overflow-x:auto;margin-bottom:24px;"> <table style="width:100%;border-collapse:collapse;font-size:13px;"> <thead> <tr style="border-bottom:1px solid var(--border);"> <th style="text-align:left;padding:8px 10px;color:var(--muted);font-weight:500;">#</th> <th style="text-align:left;padding:8px 10px;color:var(--muted);font-weight:500;">Team</th> <th style="padding:8px 6px;color:var(--muted);font-weight:500;">P</th> <th style="padding:8px 6px;color:var(--muted);font-weight:500;">W</th> <th style="padding:8px 6px;color:var(--muted);font-weight:500;">D</th> <th style="padding:8px 6px;color:var(--muted);font-weight:500;">L</th> <th style="padding:8px 6px;color:var(--muted);font-weight:500;">GF</th> <th style="padding:8px 6px;color:var(--muted);font-weight:500;">GA</th> <th style="padding:8px 6px;color:var(--muted);font-weight:500;">GD</th> <th style="padding:8px 8px;color:var(--muted);font-weight:500;">Pts</th> </tr> </thead> <tbody> ${rows.map((r, i) =>`
<tr style="border-bottom:0.5px solid var(--border);${i===0?'background:rgba(62,207,142,0.04);':i<3?'background:rgba(240,192,64,0.03);':''}">
<td style="padding:10px 10px;color:var(--muted);">${i+1}</td>
<td style="padding:10px 10px;font-weight:500;color:var(--text);">${r.captain.team_name || r.captain.name}${qualifier[i]||’’}</td>
<td style="padding:10px 6px;text-align:center;color:var(--muted);">${r.p}</td>
<td style="padding:10px 6px;text-align:center;color:var(--green);">${r.w}</td>
<td style="padding:10px 6px;text-align:center;color:var(--muted);">${r.d}</td>
<td style="padding:10px 6px;text-align:center;color:var(--red);">${r.l}</td>
<td style="padding:10px 6px;text-align:center;color:var(--muted);">${r.gf}</td>
<td style="padding:10px 6px;text-align:center;color:var(--muted);">${r.ga}</td>
<td style="padding:10px 6px;text-align:center;color:${r.gd>0?'var(--green)':r.gd<0?'var(--red)':'var(--muted)'};">${r.gd>0?’+’:’’}${r.gd}</td>
<td style="padding:10px 8px;text-align:center;font-family:var(--font-display);font-size:1.1rem;color:var(--accent);">${r.pts}</td>
</tr>`).join('')} </tbody> </table> </div>`;
}

function standingsTableHtml(captains, matches) {
const g1 = computeGroupStandings(captains, matches, 1);
const g2 = computeGroupStandings(captains, matches, 2);
if (!g1.length && !g2.length) return ‘<div class="text-muted">No matches played yet.</div>’;
return groupTableHtml(g1, 1) + groupTableHtml(g2, 2);
}

function topScorersHtml(scorers) {
if (!scorers.length) return ‘<div class="text-muted">No goals recorded yet.</div>’;
return scorers.map((s, i) => ` <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:0.5px solid var(--border);"> <div style="font-family:var(--font-display);font-size:1.4rem;color:var(--muted);min-width:28px;">${i+1}</div> <div style="flex:1;"> <div style="font-weight:500;color:var(--text);font-size:14px;">${s.player.name}</div> <div style="font-size:12px;color:var(--muted);">${s.team ? s.team.name : '—'}</div> </div> <div style="font-family:var(--font-display);font-size:1.6rem;color:var(--accent);">${s.goals}</div> <div style="font-size:11px;color:var(--muted);">goals</div> </div>`).join(’’);
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
if (!leaders.length) return ‘<div class="text-muted">No MVPs awarded yet.</div>’;
return leaders.map((s, i) => {
const cap = captains.find(c => c.id === s.player.captain_id);
const trophy = i === 0 ? ‘🏆’ : i === 1 ? ‘🥈’ : i === 2 ? ‘🥉’ : ‘’;
return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:0.5px solid var(--border);"> <div style="font-size:1.3rem;min-width:28px;">${trophy ||`<span style="font-family:var(--font-display);color:var(--muted);font-size:1.2rem;">${i+1}</span>`}</div> <div style="flex:1;"> <div style="font-weight:500;color:var(--text);font-size:14px;">${s.player.name}</div> <div style="font-size:12px;color:var(--muted);">${cap ? cap.name : '—'}</div> </div> <div style="text-align:right;"> <div style="font-family:var(--font-display);font-size:1.6rem;color:var(--accent);">${s.awards}</div> <div style="font-size:11px;color:var(--muted);">MVP award${s.awards !== 1 ? 's' : ''}</div> </div> </div>`;
}).join(’’);
}

function matchScheduleHtml(matches, captains, players, standings) {
const leagueMatches  = matches.filter(m => !m.is_knockout);
const knockoutMatches = matches.filter(m => m.is_knockout);

// Group standings from standings array (already computed)
const s1 = captains.filter(c => c.tournament_group === ‘1’).map(c => {
return (standings||[]).find(r => r.captain.id === c.id) || { captain: c, pts:0, gd:0, gf:0 };
}).sort((a,b) => b.pts-a.pts || b.gd-a.gd || b.gf-a.gf);
const s2 = captains.filter(c => c.tournament_group === ‘2’).map(c => {
return (standings||[]).find(r => r.captain.id === c.id) || { captain: c, pts:0, gd:0, gf:0 };
}).sort((a,b) => b.pts-a.pts || b.gd-a.gd || b.gf-a.gf);

const g1w=s1[0]?.captain, g1r2=s1[1]?.captain, g1r3=s1[2]?.captain;
const g2w=s2[0]?.captain, g2r2=s2[1]?.captain, g2r3=s2[2]?.captain;

const rankMap = {};
s1.forEach((r,i) => { rankMap[r.captain.id] = `G1 ${ordinal(i+1)}`; });
s2.forEach((r,i) => { rankMap[r.captain.id] = `G2 ${ordinal(i+1)}`; });

function ordinal(n) { return [’’,‘1st’,‘2nd’,‘3rd’,‘4th’][n]||n+‘th’; }

function teamLabel(captain, showRank) {
if (!captain) return ‘?’;
const rank = rankMap[captain.id];
const dn = captain.team_name || captain.name;
return showRank && rank ? `${dn} <span style="font-size:11px;color:var(--muted);">(${rank})</span>` : dn;
}

function matchCard(m, label, isLeague) {
const h = captains.find(c => c.id === m.home_captain_id);
const a = captains.find(c => c.id === m.away_captain_id);
const mvp = m.mvp_player_id ? players.find(p => p.id === m.mvp_player_id) : null;
const winner = m.home_score > m.away_score ? ‘home’ : m.away_score > m.home_score ? ‘away’ : ‘draw’;
const showRank = isLeague && standings?.length > 0;
return ` <div style="background:var(--surface2);border-radius:var(--radius);padding:12px 14px;margin-bottom:8px;"> ${label?`<div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);margin-bottom:6px;">${label}</div>`:''} <div style="display:flex;align-items:center;gap:8px;"> <span style="flex:1;text-align:right;font-weight:${winner==='home'?'600':'400'};color:${winner==='home'?'var(--text)':'var(--muted)'};">${teamLabel(h,showRank)}</span> <span style="font-family:var(--font-display);font-size:1.4rem;color:var(--accent);min-width:52px;text-align:center;">${m.home_score} – ${m.away_score}</span> <span style="flex:1;font-weight:${winner==='away'?'600':'400'};color:${winner==='away'?'var(--text)':'var(--muted)'};">${teamLabel(a,showRank)}</span> </div> ${mvp?`<div style="text-align:center;font-size:11px;color:var(--accent);margin-top:6px;">⭐ MVP: ${mvp.name}</div>`:''} </div>`;
}

function upcomingCard(homeLabel, awayLabel, label) {
return ` <div style="background:var(--surface);border:0.5px solid var(--border);border-radius:var(--radius);padding:12px 14px;margin-bottom:8px;"> ${label?`<div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);margin-bottom:6px;">${label}</div>`:''} <div style="display:flex;align-items:center;gap:8px;"> <span style="flex:1;text-align:right;color:var(--text);font-weight:500;">${homeLabel}</span> <span style="font-size:12px;color:var(--muted);min-width:52px;text-align:center;">vs</span> <span style="flex:1;color:var(--text);font-weight:500;">${awayLabel}</span> </div> </div>`;
}

function sectionHeader(title) {
return `<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);margin:16px 0 10px;font-weight:500;">${title}</div>`;
}

function name(c) { return c ? (c.team_name || c.name) : ‘<span style="color:var(--muted)">TBD</span>’; }

let html = ‘’;

// ── Group 1 matches ──
const g1Matches = leagueMatches.filter(m =>
captains.find(c=>c.id===m.home_captain_id)?.tournament_group === ‘1’
);
const g1Played   = g1Matches.filter(m=>m.played);
const g1Upcoming = g1Matches.filter(m=>!m.played);

html += sectionHeader(‘Group 1’);
if (g1Played.length)   html += g1Played.map((m,i)   => matchCard(m, `Match ${i+1}`, true)).join(’’);
if (g1Upcoming.length) html += g1Upcoming.map((m,i) => {
const h=captains.find(c=>c.id===m.home_captain_id), a=captains.find(c=>c.id===m.away_captain_id);
return upcomingCard(teamLabel(h,standings?.length>0), teamLabel(a,standings?.length>0), `Match ${g1Played.length+i+1}`);
}).join(’’);

// ── Group 2 matches ──
const g2Matches  = leagueMatches.filter(m =>
captains.find(c=>c.id===m.home_captain_id)?.tournament_group === ‘2’
);
const g2Played   = g2Matches.filter(m=>m.played);
const g2Upcoming = g2Matches.filter(m=>!m.played);

html += sectionHeader(‘Group 2’);
if (g2Played.length)   html += g2Played.map((m,i)   => matchCard(m, `Match ${i+1}`, true)).join(’’);
if (g2Upcoming.length) html += g2Upcoming.map((m,i) => {
const h=captains.find(c=>c.id===m.home_captain_id), a=captains.find(c=>c.id===m.away_captain_id);
return upcomingCard(teamLabel(h,standings?.length>0), teamLabel(a,standings?.length>0), `Match ${g2Played.length+i+1}`);
}).join(’’);

// ── Quarter-Finals ──
html += sectionHeader(‘Quarter-Finals’);
const qf1played = knockoutMatches.find(m=>m.knockout_label===‘QF1’&&m.played);
const qf2played = knockoutMatches.find(m=>m.knockout_label===‘QF2’&&m.played);

if (qf1played) html += matchCard(qf1played, ‘QF1 · G1 2nd vs G2 3rd’, false);
else html += upcomingCard(
g1r2 ? `${name(g1r2)} <span style="font-size:11px;color:var(--muted);">(G1 2nd)</span>` : ‘<span style="color:var(--muted)">G1 2nd Place</span>’,
g2r3 ? `${name(g2r3)} <span style="font-size:11px;color:var(--muted);">(G2 3rd)</span>` : ‘<span style="color:var(--muted)">G2 3rd Place</span>’,
‘QF1 · G1 2nd vs G2 3rd’
);

if (qf2played) html += matchCard(qf2played, ‘QF2 · G2 2nd vs G1 3rd’, false);
else html += upcomingCard(
g2r2 ? `${name(g2r2)} <span style="font-size:11px;color:var(--muted);">(G2 2nd)</span>` : ‘<span style="color:var(--muted)">G2 2nd Place</span>’,
g1r3 ? `${name(g1r3)} <span style="font-size:11px;color:var(--muted);">(G1 3rd)</span>` : ‘<span style="color:var(--muted)">G1 3rd Place</span>’,
‘QF2 · G2 2nd vs G1 3rd’
);

// ── Semi-Finals ──
html += sectionHeader(‘Semi-Finals’);
const sf1played = knockoutMatches.find(m=>m.knockout_label===‘SF1’&&m.played);
const sf2played = knockoutMatches.find(m=>m.knockout_label===‘SF2’&&m.played);

const qf1Winner = qf1played ? (qf1played.home_score>qf1played.away_score ? captains.find(c=>c.id===qf1played.home_captain_id) : captains.find(c=>c.id===qf1played.away_captain_id)) : null;
const qf2Winner = qf2played ? (qf2played.home_score>qf2played.away_score ? captains.find(c=>c.id===qf2played.home_captain_id) : captains.find(c=>c.id===qf2played.away_captain_id)) : null;

if (sf1played) html += matchCard(sf1played, ‘SF1 · G1 1st vs QF1 Winner’, false);
else html += upcomingCard(
g1w ? `${name(g1w)} <span style="font-size:11px;color:var(--muted);">(G1 1st)</span>` : ‘<span style="color:var(--muted)">G1 Winner</span>’,
qf1Winner ? `${name(qf1Winner)} <span style="font-size:11px;color:var(--muted);">(W QF1)</span>` : ‘<span style="color:var(--muted)">Winner QF1</span>’,
‘SF1 · G1 1st vs QF1 Winner’
);

if (sf2played) html += matchCard(sf2played, ‘SF2 · G2 1st vs QF2 Winner’, false);
else html += upcomingCard(
g2w ? `${name(g2w)} <span style="font-size:11px;color:var(--muted);">(G2 1st)</span>` : ‘<span style="color:var(--muted)">G2 Winner</span>’,
qf2Winner ? `${name(qf2Winner)} <span style="font-size:11px;color:var(--muted);">(W QF2)</span>` : ‘<span style="color:var(--muted)">Winner QF2</span>’,
‘SF2 · G2 1st vs QF2 Winner’
);

// ── Final ──
html += sectionHeader(‘Final’);
const finalPlayed = knockoutMatches.find(m=>m.knockout_label===‘Final’&&m.played);
const sf1Winner = sf1played ? (sf1played.home_score>sf1played.away_score ? captains.find(c=>c.id===sf1played.home_captain_id) : captains.find(c=>c.id===sf1played.away_captain_id)) : null;
const sf2Winner = sf2played ? (sf2played.home_score>sf2played.away_score ? captains.find(c=>c.id===sf2played.home_captain_id) : captains.find(c=>c.id===sf2played.away_captain_id)) : null;

if (finalPlayed) html += matchCard(finalPlayed, ‘🏆 Final’, false);
else html += upcomingCard(
sf1Winner ? `${name(sf1Winner)} <span style="font-size:11px;color:var(--muted);">(W SF1)</span>` : ‘<span style="color:var(--muted)">Winner SF1</span>’,
sf2Winner ? `${name(sf2Winner)} <span style="font-size:11px;color:var(--muted);">(W SF2)</span>` : ‘<span style="color:var(--muted)">Winner SF2</span>’,
‘🏆 Final’
);

return html || ‘<div class="text-muted">No fixtures loaded yet.</div>’;
}