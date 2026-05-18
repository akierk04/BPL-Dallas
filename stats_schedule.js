// Central data loader and renderer orchestration
// Extracted from admin.html during Admin refactor.

async function loadData() {
      const [capRes, playRes, bidRes, matchRes, goalRes, paymentsRes, summaryRes, topPayersRes, hofRes] = await Promise.all([
        db.from('captains').select('*').order('name'),
        db.from('players').select('*').order('name'),
        db.from('bidding_state').select('*').eq('id', 1).single(),
        db.from('matches').select('*').order('created_at'),
        db.from('goals').select('*'),
        db.from('payments').select('*').order('created_at', { ascending: false }),
        db.from('payment_summary').select('*'),
        db.from('top_payers').select('*'),
        db.from('hall_of_fame').select('*').order('season', { ascending: false })
      ]);

      if (capRes.error) {
        document.getElementById('overviewMsg').textContent = 'DB error: ' + capRes.error.message;
        return;
      }

      paymentLoadError = [
        paymentsRes.error ? 'payments: ' + paymentsRes.error.message : null,
        summaryRes.error  ? 'summary: '  + summaryRes.error.message  : null
      ].filter(Boolean).join(' | ');

      allCaptains = capRes.data || [];
      allPlayers = playRes.data || [];
      allMatches = matchRes.data || [];
      allGoals = goalRes.data || [];
      allPayments = paymentsRes.data || [];
      paymentSummary = summaryRes.data || [];
      topPayers = topPayersRes.data || [];
      hofEntries = hofRes?.data || [];
      currentPlayerId = bidRes.data?.player_id || null;
      bidState = bidRes.data || null;

      renderAuctionControl();
      renderOverview();
      renderPlayersList();
      populateConsoleDropdowns();
      populateBiddingDropdown();
      populateMatchDropdowns();
      renderMatchDayBanner();
      renderFixtures();
      renderMatchesList();
      renderStandings();
      renderStats();
      renderSchedule();
      renderPaymentsTab();
      renderHallOfFame();
    }
