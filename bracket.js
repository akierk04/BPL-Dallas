// ── BPL Dallas · Season 4 Playoff Bracket (double elimination, 7 teams) ──
// Loaded after standings.js (uses computeStandings, detectDeadlocks, PLAYOFF_ROUNDS).
//
// Everything here is DERIVED from the matches table: seeds come from the prelim standings, and
// every later pairing comes from earlier results. Nothing about the bracket is stored except the
// match rows themselves (round = the slot code, e.g. 'W1A'). Admin's "Generate next playoff
// round" button simply inserts rows for slots that have just become determinable.
//
// Rules implemented (from the S4 seeding and bracket rules):
//  * Winners R1: #2 v #7, #3 v #6, #4 v #5, #1 has a bye.
//  * Winners R2: reseeded by ORIGINAL prelim seed. Highest remaining v lowest remaining, other two meet.
//  * Winners Final: winners of R2.
//  * Losers entry (3 Winners R1 losers) ranked by: GD in the game lost, goals scored in that loss,
//    original seed. Rank 1 gets a bye; rank 2 v rank 3.
//  * Existing LB teams are ranked by cumulative Losers Bracket GD, then cumulative LB goals, then seed.
//    New entrants (losers dropping from the Winners Bracket) are ranked by GD in the lost game, goals
//    scored in it, then seed. The two groups are never compared with each other.
//  * Losers R2 (2 existing + 2 new): best existing v LOWER-ranked new entrant; other existing v HIGHER-ranked new entrant.
//  * Losers R3 (after the Winners Final): 2 LB survivors + WF loser. Better-ranked survivor gets the bye; the
//    other survivor plays the WF loser. Winner meets the bye team in the Losers Final.
//  * Grand Final: Winners champion (0 losses) v Losers champion (1 loss). If the Losers champion wins,
//    a Reset Final is played. Two losses eliminates.
//  * Playoff games cannot end level (admin enters a winning score).

var PLAYOFF_TEAMS = 7;

function roundMeta(code) {
  return PLAYOFF_ROUNDS.find(function(r) { return r.code === code; }) || null;
}
function roundLabel(code) {
  var m = roundMeta(code);
  return m ? m.label : (code || 'Fixture');
}
function roundMinutes(code) {
  var m = roundMeta(code);
  return m ? m.minutes : 10;
}

function computeBracket(captains, matches, tiebreaks) {
  tiebreaks = tiebreaks || [];
  var standings = computeStandings(captains, matches, tiebreaks);
  var seeds = standings.map(function(r) { return r.captain.id; });
  var seedNo = {};
  seeds.forEach(function(id, i) { seedNo[id] = i + 1; });

  var league = matches.filter(function(m) { return isLeagueRound(m.round); });
  var leagueDone = league.length > 0 && league.every(function(m) { return m.played; });
  var deadlocks = detectDeadlocks(standings, matches, tiebreaks);
  var seedsReady = leagueDone && !deadlocks.length && seeds.length === PLAYOFF_TEAMS;

  function row(code) {
    return matches.find(function(m) { return m.round === code; }) || null;
  }
  // A played playoff game with a winner. Level games are ignored (they are rejected on entry).
  function res(code) {
    var m = row(code);
    if (!m || !m.played || m.home_score === m.away_score) return null;
    var hw = m.home_score > m.away_score;
    return {
      winner: hw ? m.home_captain_id : m.away_captain_id,
      loser:  hw ? m.away_captain_id : m.home_captain_id,
      wScore: Math.max(m.home_score, m.away_score),
      lScore: Math.min(m.home_score, m.away_score)
    };
  }
  function bySeed(a, b) { return (seedNo[a] || 99) - (seedNo[b] || 99); }

  // Rank for a team that has just dropped from the Winners Bracket (GD of the lost game, goals in it, seed).
  function lossRank(code) {
    var r = res(code);
    return { id: r.loser, gd: r.lScore - r.wScore, gf: r.lScore };
  }
  function cmpLoss(a, b) {
    return (b.gd - a.gd) || (b.gf - a.gf) || bySeed(a.id, b.id);
  }
  // Cumulative Losers Bracket record (LB games only), counting ONLY the rounds listed. Pairings must
  // be ranked on what had happened BEFORE that round, otherwise a played game would re-rank its own pairing.
  function lbCum(id, codes) {
    var gd = 0, gf = 0;
    codes.forEach(function(c) {
      var m = row(c);
      if (!m || !m.played) return;
      if (m.home_captain_id === id) { gd += m.home_score - m.away_score; gf += m.home_score; }
      else if (m.away_captain_id === id) { gd += m.away_score - m.home_score; gf += m.away_score; }
    });
    return { id: id, gd: gd, gf: gf };
  }
  function cmpExisting(a, b) {
    return (b.gd - a.gd) || (b.gf - a.gf) || bySeed(a.id, b.id);
  }

  // ── Derive the teams for every slot ──
  var D = {};            // code -> [homeId, awayId] derived from results (or [null, null])
  var byes = { W1: null, L1: null, L3: null };
  if (seedsReady) byes.W1 = seeds[0];

  D.W1A = seedsReady ? [seeds[1], seeds[6]] : [null, null];
  D.W1B = seedsReady ? [seeds[2], seeds[5]] : [null, null];
  D.W1C = seedsReady ? [seeds[3], seeds[4]] : [null, null];

  var w1Done = res('W1A') && res('W1B') && res('W1C');
  D.W2A = [null, null]; D.W2B = [null, null]; D.L1 = [null, null];
  if (w1Done) {
    var rem = [seeds[0], res('W1A').winner, res('W1B').winner, res('W1C').winner].sort(bySeed);
    D.W2A = [rem[0], rem[3]];
    D.W2B = [rem[1], rem[2]];
    var ranked = ['W1A', 'W1B', 'W1C'].map(lossRank).sort(cmpLoss);
    byes.L1 = ranked[0].id;
    D.L1 = [ranked[1].id, ranked[2].id];
  }

  D.WF = [null, null];
  var w2Done = res('W2A') && res('W2B');
  if (w2Done) {
    var f = [res('W2A').winner, res('W2B').winner].sort(bySeed);
    D.WF = [f[0], f[1]];
  }

  D.L2A = [null, null]; D.L2B = [null, null];
  if (res('L1') && w2Done && byes.L1) {
    var before2 = ['L1'];
    var existing = [lbCum(byes.L1, before2), lbCum(res('L1').winner, before2)].sort(cmpExisting);
    var entrants = [lossRank('W2A'), lossRank('W2B')].sort(cmpLoss); // [higher, lower]
    D.L2A = [existing[0].id, entrants[1].id]; // best existing v lower-ranked new
    D.L2B = [existing[1].id, entrants[0].id]; // other existing v higher-ranked new
  }

  D.L3 = [null, null];
  if (res('L2A') && res('L2B') && res('WF')) {
    var before3 = ['L1', 'L2A', 'L2B'];
    var surv = [lbCum(res('L2A').winner, before3), lbCum(res('L2B').winner, before3)].sort(cmpExisting);
    byes.L3 = surv[0].id;
    D.L3 = [surv[1].id, res('WF').loser];
  }

  D.LF = (res('L3') && byes.L3) ? [byes.L3, res('L3').winner] : [null, null];
  D.GF = (res('WF') && res('LF')) ? [res('WF').winner, res('LF').winner] : [null, null];

  var needReset = !!(res('GF') && res('LF') && res('GF').winner === res('LF').winner);
  D.RF = needReset ? [res('WF').winner, res('LF').winner] : [null, null];

  // ── Slots ──
  var SRC = {
    W1A: ['Seed #2', 'Seed #7'], W1B: ['Seed #3', 'Seed #6'], W1C: ['Seed #4', 'Seed #5'],
    W2A: ['Highest remaining seed', 'Lowest remaining seed'],
    W2B: ['2nd-highest remaining seed', '3rd-highest remaining seed'],
    WF:  ['Winner of Winners R2 A', 'Winner of Winners R2 B'],
    L1:  ['Losers rank 2', 'Losers rank 3'],
    L2A: ['Best-ranked Losers survivor', 'Lower-ranked new entrant'],
    L2B: ['Other Losers survivor', 'Higher-ranked new entrant'],
    L3:  ['Lower-ranked Losers survivor', 'Loser of Winners Final'],
    LF:  ['Team with the bye', 'Winner of Losers R3'],
    GF:  ['Winners Bracket champion', 'Losers Bracket champion'],
    RF:  ['Winners Bracket champion', 'Losers Bracket champion']
  };

  var losses = {};
  var champion = null;
  var slots = PLAYOFF_ROUNDS.map(function(meta) {
    var code = meta.code;
    var m = row(code);
    var d = D[code];
    var home = m ? m.home_captain_id : d[0];
    var away = m ? m.away_captain_id : d[1];
    var known = !!(d[0] && d[1]);
    var r = res(code);
    var status = m ? (m.played ? 'played' : 'scheduled') : (known ? 'ready' : 'tbd');
    if (code === 'RF' && !needReset && !m) status = res('GF') ? 'na' : 'tbd';
    return {
      code: code, label: meta.label, stage: meta.stage, minutes: meta.minutes,
      match: m, home: home, away: away, derivedHome: d[0], derivedAway: d[1],
      srcHome: SRC[code][0], srcAway: SRC[code][1],
      status: status, winner: r ? r.winner : null, loser: r ? r.loser : null
    };
  });

  slots.forEach(function(s) { if (s.loser) losses[s.loser] = (losses[s.loser] || 0) + 1; });
  var gf = res('GF'), rf = res('RF');
  if (gf && res('WF') && gf.winner === res('WF').winner) champion = gf.winner;
  else if (rf) champion = rf.winner;

  // Fixtures whose teams no longer match what the results imply (e.g. a result was edited later).
  var mismatches = slots.filter(function(s) {
    if (!s.match || !s.derivedHome || !s.derivedAway) return false;
    var a = [s.match.home_captain_id, s.match.away_captain_id].sort().join('|');
    var b = [s.derivedHome, s.derivedAway].sort().join('|');
    return a !== b;
  }).map(function(s) { return s.code; });

  return {
    standings: standings, seeds: seeds, seedNo: seedNo, seedsReady: seedsReady, deadlocks: deadlocks,
    slots: slots, byes: byes, losses: losses, champion: champion, mismatches: mismatches,
    hasPlayoffMatches: matches.some(function(m) { return isKoRound(m.round); })
  };
}

// Why can't the next round be generated? Returns { ready, reason, slots }.
function playoffReadiness(captains, matches, tiebreaks) {
  var b = computeBracket(captains, matches, tiebreaks);
  var league = matches.filter(function(m) { return isLeagueRound(m.round); });
  if (!league.length) return { ready: false, reason: 'Generate League Matches first.', slots: [], bracket: b };
  var unplayed = league.filter(function(m) { return !m.played; }).length;
  if (unplayed) return { ready: false, reason: unplayed + ' league match(es) still need results.', slots: [], bracket: b };
  if (captains.length !== PLAYOFF_TEAMS) return { ready: false, reason: 'Playoffs need exactly ' + PLAYOFF_TEAMS + ' teams.', slots: [], bracket: b };
  if (b.deadlocks.length) return { ready: false, reason: b.deadlocks.length + ' tiebreak(s) unresolved. See Standings.', slots: [], bracket: b };
  if (b.mismatches.length) return { ready: false, reason: 'Fix mismatched fixture(s) first: ' + b.mismatches.join(', ') + '.', slots: [], bracket: b };
  var ready = b.slots.filter(function(s) { return s.status === 'ready'; });
  if (!ready.length) {
    if (b.champion) return { ready: false, reason: 'Playoffs complete.', slots: [], bracket: b };
    return { ready: false, reason: 'Enter the results of the games already generated first.', slots: [], bracket: b };
  }
  return { ready: true, reason: '', slots: ready, bracket: b };
}

// ── Display ──
function _bn(c) { return c ? (c.team_name || c.name) : null; }

function bracketHtml(captains, matches, tiebreaks) {
  var b = computeBracket(captains, matches, tiebreaks);
  if (!b.seedsReady && !b.hasPlayoffMatches) return '';
  function cap(id) { return captains.find(function(c) { return c.id === id; }) || null; }

  function teamRow(id, src, slot, side) {
    var c = cap(id);
    var played = slot.status === 'played';
    var score = played ? (side === 'home' ? slot.match.home_score : slot.match.away_score) : null;
    var cls = 'tbd';
    if (c) cls = played ? (slot.winner === id ? 'won' : 'lost') : '';
    var seed = c && b.seedNo[id] ? '<i class="pb-seed">#' + b.seedNo[id] + '</i>' : '';
    return '<div class="pb-team ' + cls + '"><span>' + seed + (c ? _bn(c) : src) + '</span>'
      + (played ? '<span class="pb-score">' + score + '</span>' : '') + '</div>';
  }
  function card(code) {
    var s = b.slots.find(function(x) { return x.code === code; });
    var note = '';
    if (code === 'L1' && b.byes.L1) note = 'Bye: ' + (_bn(cap(b.byes.L1)) || '');
    if (code === 'L3' && b.byes.L3) note = 'Bye: ' + (_bn(cap(b.byes.L3)) || '');
    return '<div class="pb-card st-' + s.status + '">'
      + '<div class="pb-card-top"><span>' + s.label + '</span><span class="pb-min">' + s.minutes + ' min</span></div>'
      + teamRow(s.home, s.srcHome, s, 'home')
      + teamRow(s.away, s.srcAway, s, 'away')
      + (note ? '<div class="pb-note">' + note + '</div>' : '')
      + (s.status === 'na' ? '<div class="pb-note">Not needed</div>' : '')
      + '</div>';
  }
  function roundBlock(title, codes, extra) {
    return '<div class="pb-round"><div class="pb-round-title">' + title + '</div>'
      + (extra ? '<div class="pb-note" style="margin:-2px 0 8px;">' + extra + '</div>' : '')
      + codes.map(card).join('') + '</div>';
  }

  var champ = b.champion ? cap(b.champion) : null;
  var html = '';
  if (champ) html += '<div class="pb-champion">🏆 BPL S4 Champion<strong>' + _bn(champ) + '</strong></div>';
  html += '<div class="pb-section"><div class="pb-section-title">Winners Bracket</div><div class="pb-rounds">'
    + roundBlock('Round 1', ['W1A', 'W1B', 'W1C'], b.byes.W1 ? '#1 seed ' + _bn(cap(b.byes.W1)) + ' has a bye' : '')
    + roundBlock('Round 2', ['W2A', 'W2B'])
    + roundBlock('Winners Final', ['WF'])
    + '</div></div>';
  html += '<div class="pb-section"><div class="pb-section-title">Losers Bracket</div><div class="pb-rounds">'
    + roundBlock('Round 1', ['L1'])
    + roundBlock('Round 2', ['L2A', 'L2B'])
    + roundBlock('Round 3', ['L3'])
    + roundBlock('Losers Final', ['LF'])
    + '</div></div>';
  html += '<div class="pb-section"><div class="pb-section-title">Grand Final</div><div class="pb-rounds">'
    + roundBlock('Grand Final', ['GF', 'RF'])
    + '</div></div>';
  return html;
}
