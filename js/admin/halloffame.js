// Hall of Fame – archive, entry render, add/delete
// js/admin/halloffame.js

// ── Archive current season into archive_captains + archive_players ──
async function archiveCurrentSeason() {
  const season = parseInt(document.getElementById('archiveSeasonNum').value);
  const msg    = document.getElementById('archiveMsg');

  if (!season) { msg.textContent = 'Select a season number first.'; return; }

  if (!confirm(`Archive current captains and players as Season ${season}? This will overwrite any existing Season ${season} archive data.`)) return;

  msg.textContent = 'Archiving...';

  // Clear any existing archive for this season
  await db.from('archive_captains').delete().eq('season', season);
  await db.from('archive_players').delete().eq('season', season);

  // Fetch live data
  const [capRes, playRes] = await Promise.all([
    db.from('captains').select('*'),
    db.from('players').select('*')
  ]);

  if (capRes.error) { msg.textContent = 'Error fetching captains: ' + capRes.error.message; return; }
  if (playRes.error) { msg.textContent = 'Error fetching players: ' + playRes.error.message; return; }

  // Insert captains into archive
  const captainsToArchive = capRes.data.map(c => ({
    season,
    original_id: c.id,
    name:        c.name,
    team_name:   c.team_name,
    group_name:  c.group_name,
    wallet:      c.wallet,
  }));

  const { data: archivedCaps, error: capErr } = await db
    .from('archive_captains')
    .insert(captainsToArchive)
    .select();

  if (capErr) { msg.textContent = 'Error archiving captains: ' + capErr.message; return; }

  // Map original captain ID -> archive captain ID for player FK
  const capIdMap = {};
  archivedCaps.forEach(ac => { capIdMap[ac.original_id] = ac.id; });

  // Insert players into archive
  const playersToArchive = playRes.data.map(p => ({
    season,
    original_id: p.id,
    name:        p.name,
    group_name:  p.group_name,
    base_price:  p.base_price,
    sold_price:  p.sold_price,
    is_sold:     p.is_sold,
    captain_id:  capIdMap[p.captain_id] || null,
  }));

  const { error: playErr } = await db
    .from('archive_players')
    .insert(playersToArchive);

  if (playErr) { msg.textContent = 'Error archiving players: ' + playErr.message; return; }

  msg.textContent = `✓ Season ${season} archived — ${archivedCaps.length} captains, ${playersToArchive.length} players. You can now load season data below.`;

  // Auto-select this season in the HoF form and load dropdowns
  document.getElementById('hofSeason').value = season;
  await loadHofArchiveCaptains();
}

// ── Load archive captains/players for the HoF form dropdowns ──
async function loadHofArchiveCaptains() {
  const season = parseInt(document.getElementById('hofSeason').value);
  const msg    = document.getElementById('hofLoadMsg');
  if (!season || season < 1) { msg.textContent = ''; return; }

  msg.textContent = `Loading Season ${season} data...`;

  const [capRes, playRes] = await Promise.all([
    db.from('archive_captains').select('*').eq('season', season).order('name'),
    db.from('archive_players').select('*').eq('season', season).order('name')
  ]);

  if (capRes.error || !capRes.data?.length) {
    msg.textContent = `No archive data found for Season ${season}. Use the Archive button above first.`;
    hofArchiveCaptains = []; hofArchivePlayers = [];
    populateHofDropdowns();
    return;
  }

  hofArchiveCaptains = capRes.data;
  hofArchivePlayers  = playRes.data || [];
  msg.textContent = `Loaded ${hofArchiveCaptains.length} captains and ${hofArchivePlayers.length} players from Season ${season}.`;
  populateHofDropdowns();
}

// ── Populate champion / scorer / MVP dropdowns from archive ──
function populateHofDropdowns() {
  const capOpt = '<option value="">Select...</option>' +
    hofArchiveCaptains.map(c =>
      `<option value="${c.id}" data-team="${c.team_name || c.name}" data-captain="${c.name}">${c.team_name || c.name} (${c.name})</option>`
    ).join('');

  // All scorers = sold players + captains
  const playerOpts = '<option value="">Select...</option>' +
    hofArchivePlayers.filter(p => p.is_sold).map(p => {
      const cap = hofArchiveCaptains.find(c => c.id === p.captain_id);
      return `<option value="${p.id}" data-name="${p.name}">${p.name}${cap ? ' (' + (cap.team_name || cap.name) + ')' : ''}</option>`;
    }).join('') +
    hofArchiveCaptains.map(c =>
      `<option value="${c.id}" data-name="${c.name} (C)">${c.name} (C) — ${c.team_name || c.name}</option>`
    ).join('');

  document.getElementById('hofChampionId').innerHTML  = capOpt;
  document.getElementById('hofRunnerUpId').innerHTML  = capOpt;
  document.getElementById('hofTopScorerId').innerHTML = playerOpts;
  document.getElementById('hofMvpId').innerHTML       = playerOpts;
}

// ── Sync hidden fields from dropdowns ──
function hofSyncName(selectId, teamField, captainField) {
  const sel = document.getElementById(selectId);
  const opt = sel.options[sel.selectedIndex];
  document.getElementById(teamField).value    = opt?.dataset?.team    || '';
  document.getElementById(captainField).value = opt?.dataset?.captain || '';
}

function hofSyncPlayerName(selectId, nameField) {
  const sel = document.getElementById(selectId);
  const opt = sel.options[sel.selectedIndex];
  document.getElementById(nameField).value = opt?.dataset?.name || '';
}

// ── Render Hall of Fame list ──
function renderHallOfFame() {
  const wrap = document.getElementById('hofList');
  if (!wrap) return;
  if (!hofEntries.length) {
    wrap.innerHTML = '<div class="text-muted">No seasons recorded yet.</div>';
    return;
  }
  wrap.innerHTML = hofEntries.map(e => `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px;margin-bottom:16px;position:relative;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="font-family:var(--font-display);font-size:2rem;color:var(--accent);">S${e.season}</div>
          <div style="font-size:13px;color:var(--muted);">${e.year}</div>
        </div>
        <button class="btn-danger" style="width:auto;padding:5px 10px;" onclick="deleteHofEntry(${e.id})">✕</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;">
        <div>
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:var(--accent);margin-bottom:4px;">🏆 Champions</div>
          <div style="font-weight:700;color:var(--text);font-size:15px;">${e.champion}</div>
          <div style="font-size:12px;color:var(--muted);">${e.captain}</div>
        </div>
        ${e.runner_up ? `<div>
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);margin-bottom:4px;">🥈 Runner-Up</div>
          <div style="font-weight:600;color:var(--text);font-size:14px;">${e.runner_up}</div>
          <div style="font-size:12px;color:var(--muted);">${e.runner_up_captain || ''}</div>
        </div>` : ''}
        ${e.top_scorer ? `<div>
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);margin-bottom:4px;">⚽ Top Scorer</div>
          <div style="font-weight:600;color:var(--text);font-size:14px;">${e.top_scorer}</div>
          <div style="font-size:12px;color:var(--muted);">${e.top_scorer_goals ? e.top_scorer_goals + ' goals' : ''}</div>
        </div>` : ''}
        ${e.mvp ? `<div>
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);margin-bottom:4px;">⭐ Tournament MVP</div>
          <div style="font-weight:600;color:var(--text);font-size:14px;">${e.mvp}</div>
        </div>` : ''}
      </div>
      ${e.notes ? `<div style="margin-top:12px;padding-top:10px;border-top:0.5px solid var(--border);font-size:12px;color:var(--muted);">${e.notes}</div>` : ''}
    </div>`).join('');
}

// ── Add a Hall of Fame entry ──
async function addHallOfFameEntry() {
  const msg = document.getElementById('hofMsg');
  const season            = parseInt(document.getElementById('hofSeason').value);
  const year              = parseInt(document.getElementById('hofYear').value);
  const champion          = document.getElementById('hofChampion').value.trim();
  const captain           = document.getElementById('hofCaptain').value.trim();
  const runner_up         = document.getElementById('hofRunnerUp').value.trim() || null;
  const runner_up_captain = document.getElementById('hofRunnerUpCaptain').value.trim() || null;
  const top_scorer        = document.getElementById('hofTopScorer').value.trim() || null;
  const top_scorer_goals  = parseInt(document.getElementById('hofTopScorerGoals').value) || null;
  const mvp               = document.getElementById('hofMvp').value.trim() || null;
  const total_goals       = parseInt(document.getElementById('hofTotalGoals').value) || null;
  const notes             = document.getElementById('hofNotes').value.trim() || null;

  if (!season || !year || !champion || !captain) {
    msg.textContent = 'Season #, Year, Champion and Captain are required.';
    return;
  }

  const { error } = await db.from('hall_of_fame').insert({
    season, year, champion, captain,
    runner_up, runner_up_captain,
    top_scorer, top_scorer_goals,
    mvp, total_goals, notes
  });

  if (error) { msg.textContent = 'Error: ' + error.message; return; }

  // Clear form fields
  ['hofSeason','hofYear','hofChampion','hofCaptain','hofRunnerUp',
   'hofRunnerUpCaptain','hofTopScorer','hofTopScorerGoals','hofMvp',
   'hofTotalGoals','hofNotes'].forEach(id => {
    document.getElementById(id).value = '';
  });

  msg.textContent = 'Season added!';
  setTimeout(() => msg.textContent = '', 2500);
  await loadData();
}

// ── Delete a Hall of Fame entry ──
async function deleteHofEntry(id) {
  if (!confirm('Remove this season from the Hall of Fame?')) return;
  await db.from('hall_of_fame').delete().eq('id', id);
  await loadData();
}
