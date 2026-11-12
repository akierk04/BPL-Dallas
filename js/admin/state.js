// Shared admin state, helpers, tab switching, and logout
// Extracted from admin.html during Admin refactor.

if (sessionStorage.getItem('bpl_role') !== 'admin') window.location.href = 'index.html';
// The real protection is RLS; this just sends anyone without a live admin session back to login.
db.auth.getSession().then(({ data }) => { if (!data.session) { sessionStorage.clear(); window.location.href = 'index.html'; } });
    function logout() { sessionStorage.clear(); db.auth.signOut().finally(() => { window.location.href = 'index.html'; }); }

    let allCaptains = [], allPlayers = [], allMatches = [], allGoals = [], allPayments = [], paymentSummary = [], topPayers = [], hofEntries = [], currentPlayerId = null, bidState = null, allTiebreaks = [], duesSpent = 0;
    let paymentLoadError = '';
    function displayCaptainName(c) { return c ? (c.team_name || c.name) : '—'; }
    let pendingMatchId = null;
    let pendingBackup = null;   // original fixture teams/round, so Cancel can restore a scheduled fixture
    let selectedFixtureId = null;
    let selectedFixtureForEditId = null;
    let fixtureConflictState = null;
    let draggedScheduleMatchId = null;
    let draggedScheduleSection = null;
    let lastSale = null;
    let undoTimer = null;
    let pendingGoals = [], pendingHomeId = null, pendingAwayId = null, pendingHS = 0, pendingAS = 0;
    const TABS = ['auction-control','overview','players','matches','standings','stats','schedule','payments','halloffame'];

    function switchTab(tab) {
      TABS.forEach(t => document.getElementById('tab-' + t).style.display = t === tab ? 'block' : 'none');
      document.querySelectorAll('.tab').forEach((el, i) => el.classList.toggle('active', TABS[i] === tab));
    }
