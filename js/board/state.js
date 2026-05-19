let allCaptains=[], allPlayers=[], allMatches=[], allGoals=[], allPayments=[], paymentSummary=[], topPayers=[], allHallOfFame=[], currentFilter='all', currentPlayerId=null, bidState=null;
    let activeBoardTab='auction';
    let duesLoaded=false, hallOfFameLoaded=false;

    function displayCaptainName(c) { return c ? (c.team_name || c.name) : '—'; }

    // Returns the group_name of the player currently up for bid (or null).
    // Used to exclude that group from reserve calculations during live bidding.
    function getActiveBidGroup() {
      if (!currentPlayerId) return null;
      var p = allPlayers.find(function(p) { return p.id === currentPlayerId && !p.is_sold; });
      return p ? p.group_name : null;
    }
    function teamFlag(teamName) {

    var flags = {
      Spain: 'es',
      Croatia: 'hr',
      Germany: 'de',
      Netherlands: 'nl',
      France: 'fr',
      India: 'in',
      Brazil: 'br',
      England: 'gb-eng',
      Argentina: 'ar',
      Portugal: 'pt'
    };

    var code = flags[teamName];
  
    if (!code) return '';
  
    return '<img src="https://flagcdn.com/28x21/' + code + '.png" ' +
           'style="width:22px;height:16px;object-fit:cover;border-radius:2px;' +
           'vertical-align:middle;margin-right:10px;box-shadow:0 0 0 1px rgba(255,255,255,0.08)">';
  }

    function displayTeamName(teamName) {
      return teamName === 'North Korea' ? 'India' : teamName;
    }

    let previousSoldState = new Map();
    let lastSoldEvent = null;
    let previousBidValue = 0;
    let previousBidPlayerId = null;
    let previousSoldKey = '';
    

    const BTABS=['auction','standings','stats','schedule','teams','dues','hall'];

    function switchBoardTab(tab) {
      activeBoardTab = tab;
      BTABS.forEach(t=>document.getElementById('btab-'+t).style.display=t===tab?'block':'none');
      document.querySelectorAll('.tab').forEach((el,i)=>el.classList.toggle('active',BTABS[i]===tab));

      // Lazy-load heavier/static tabs only when opened.
      if (tab === 'dues') loadDuesData();
      if (tab === 'hall') loadHallOfFameData();
    }

    function setFilter(f,btn) {
      currentFilter=f;
      document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      renderPool();
    }

    function detectSoldTransition(nextPlayers) {
      for (const p of nextPlayers) {
        const prev = previousSoldState.get(p.id);
        if (p.is_sold && (!prev || !prev.is_sold || prev.captain_id !== p.captain_id || prev.sold_price !== p.sold_price || prev.sold_at !== p.sold_at)) {
          const cap = allCaptains.find(c => c.id === p.captain_id);
          lastSoldEvent = {
            player: p.name,
            captain: cap ? displayCaptainName(cap) : '—',
            price: p.sold_price || 0,
            at: Date.now(),
            key: `${p.id}:${p.captain_id || ''}:${p.sold_price || 0}:${p.sold_at || Date.now()}`
          };
        }
      }
      previousSoldState = new Map(nextPlayers.map(p => [p.id, { is_sold: p.is_sold, captain_id: p.captain_id, sold_price: p.sold_price, sold_at: p.sold_at }]));
    }
