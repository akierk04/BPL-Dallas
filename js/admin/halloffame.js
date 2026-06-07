async function archiveCurrentSeason() {
  const season = parseInt(document.getElementById('archiveSeasonNum').value);
  const msg    = document.getElementById('archiveMsg');

  if (!season) { msg.textContent = 'Select a season number first.'; return; }

  if (!confirm(`Archive current captains and players as Season ${season}? This will overwrite any existing Season ${season} archive data.`)) return;

  msg.textContent = 'Archiving...';

  // Delete existing archive for this season first
  await db.from('archive_captains').delete().eq('season', season);
  await db.from('archive_players').delete().eq('season', season);

  // Fetch current captains and players
  const [capRes, playRes] = await Promise.all([
    db.from('captains').select('*'),
    db.from('players').select('*')
  ]);

  if (capRes.error) { msg.textContent = 'Error fetching captains: ' + capRes.error.message; return; }
  if (playRes.error) { msg.textContent = 'Error fetching players: ' + playRes.error.message; return; }

  // Insert into archive_captains
  const captainsToArchive = capRes.data.map(c => ({
    season,
    original_id: c.id,
    name:         c.name,
    team_name:    c.team_name,
    group_name:   c.group_name,
    wallet:       c.wallet,
  }));

  const { data: archivedCaps, error: capErr } = await db
    .from('archive_captains')
    .insert(captainsToArchive)
    .select();

  if (capErr) { msg.textContent = 'Error archiving captains: ' + capErr.message; return; }

  // Build original_id → archive_id map for players
  const capIdMap = {};
  archivedCaps.forEach(ac => { capIdMap[ac.original_id] = ac.id; });

  // Insert into archive_players
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

  // Auto-select the season in the HoF form
  document.getElementById('hofSeason').value = season;
  await loadHofArchiveCaptains();
}
