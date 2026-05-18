# Admin Refactor Call Graph

## Load order
1. `supabase-config.js`, `budget-warning.js`, `standings.js`
2. `js/admin/state.js`
3. `js/admin/data.js`
4. `js/admin/auction.js`
5. `js/admin/overview.js`
6. `js/admin/players.js`
7. `js/admin/matches.js`
8. `js/admin/stats_schedule.js`
9. `js/admin/payments.js`
10. `js/admin/halloffame.js`
11. `js/admin/realtime.js`
12. `js/admin/init.js`

## Central call graph

`init.js`
- calls `loadData()`

`data.js`
- fetches: `captains`, `players`, `bidding_state`, `matches`, `goals`, `payments`, `payment_summary`, `top_payers`, `hall_of_fame`
- then calls:
  - `renderAuctionControl()`
  - `renderOverview()`
  - `renderPlayersList()`
  - `populateConsoleDropdowns()`
  - `populateBiddingDropdown()`
  - `populateMatchDropdowns()`
  - `renderMatchDayBanner()`
  - `renderFixtures()`
  - `renderMatchesList()`
  - `renderStandings()`
  - `renderStats()`
  - `renderSchedule()`
  - `renderPaymentsTab()`
  - `renderHallOfFame()`

`realtime.js`
- subscribes to live tables
- calls `scheduleLoadData()` instead of direct `loadData()`
- `scheduleLoadData()` debounces reloads by 500ms

## Feature dependencies

### Auction
- File: `auction.js`
- Uses globals: `allCaptains`, `allPlayers`, `currentPlayerId`, `bidState`, `lastSale`, `undoTimer`
- Calls helpers from `state.js` and `budget-warning.js`: `displayCaptainName()`, `warningBadgeHtml()`, `groupsStillNeeded()`
- Writes to Supabase tables: `players`, `captains`, `bidding_state`

### Overview
- File: `overview.js`
- Uses globals: `allCaptains`, `allPlayers`
- Calls `displayCaptainName()`
- Uses `saveCaptainField()` from `matches.js`

### Players / Manual Assign
- File: `players.js`
- Uses globals: `allCaptains`, `allPlayers`, `currentPlayerId`, `lastSale`
- Calls `displayCaptainName()`, `warningBadgeHtml()`, `groupsStillNeeded()`, `showUndoBar()`, `switchTab()`
- Writes to Supabase tables: `players`, `captains`, `bidding_state`

### Matches / Fixtures
- File: `matches.js`
- Uses globals: `allCaptains`, `allPlayers`, `allMatches`, `allGoals`, `pendingGoals`, `pendingMatchId`, `selectedFixtureId`
- Calls standings helpers from `standings.js`: `computeStandings()`, `computeSfAggregate()`
- Writes to Supabase tables: `matches`, `goals`

### Stats / Schedule / Bracket
- File: `stats_schedule.js`
- Uses globals: `allCaptains`, `allPlayers`, `allMatches`, `allGoals`
- Calls helpers from `standings.js`: `standingsTableHtml()`, `computeTopScorers()`, `topScorersHtml()`, `computeMvpLeaderboard()`, `mvpLeaderboardHtml()`, `matchScheduleHtml()`, `computeStandings()`, `computeSfAggregate()`

### Payments
- File: `payments.js`
- Uses globals: `allPayments`, `paymentSummary`, `paymentLoadError`
- Writes to Supabase table: `payments`

### Hall of Fame
- File: `halloffame.js`
- Uses globals: `hofEntries`, `hofArchiveCaptains`, `hofArchivePlayers`
- Reads archive tables: `archive_captains`, `archive_players`
- Writes to Supabase table: `hall_of_fame`

## Important refactor note
The generated scorer button quote bug was corrected during this split:

```js
this.dataset.cap==='1'
```

became:

```js
this.dataset.cap===&quot;1&quot;
```

This avoids the previous `Unexpected number '1'` syntax error that prevented `switchTab()` from loading.
