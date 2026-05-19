function renderBoardDues() {
      renderBoardDuesKpis();
      renderBoardTopPayers();
      renderBoardDuesTable();
    }

    
    function renderBoardDuesKpis() {
      var wrap = document.getElementById('duesKpis');

      if (!wrap || !paymentSummary.length) {
        if (wrap) wrap.innerHTML = '';
        return;
      }

      var totalDue = 0;
      var totalPaid = 0;
      var outstanding = 0;
      var paidPlayers = 0;
      var highestPayer = null;

      paymentSummary.forEach(function(row) {
        totalDue += Number(row.total_due || 0);
        totalPaid += Number(row.total_paid || 0);
        outstanding += Number(row.outstanding || 0);

        if (Number(row.outstanding || 0) <= 0) {
          paidPlayers++;
        }

        if (!highestPayer || Number(row.total_paid || 0) > Number(highestPayer.total_paid || 0)) {
          highestPayer = row;
        }
      });

      wrap.innerHTML = `
        <div class="spotlight-card">
          <div class="spotlight-title">Total Collected</div>
          <div class="spotlight-name">$${totalPaid.toLocaleString()}</div>
          <div class="spotlight-copy">Fines received so far.</div>
        </div>

        <div class="spotlight-card">
          <div class="spotlight-title">Outstanding Dues</div>
          <div class="spotlight-name">$${outstanding.toLocaleString()}</div>
          <div class="spotlight-copy">Remaining unpaid balance.</div>
        </div>

        <div class="spotlight-card">
          <div class="spotlight-title">Paid Players</div>
          <div class="spotlight-name">${paidPlayers}</div>
          <div class="spotlight-copy">Players who have cleared dues.</div>
        </div>

        <div class="spotlight-card">
          <div class="spotlight-title">Highest Spender</div>
          <div class="spotlight-name">${highestPayer ? highestPayer.player_name : '—'}</div>
          <div class="spotlight-copy">
            ${highestPayer ? '$' + Number(highestPayer.total_paid || 0).toLocaleString() + ' paid so far.' : 'No payments yet.'}
          </div>
        </div>
      `;
    }

    function renderBoardTopPayers() {
      const wrap = document.getElementById('boardTopPayers');
      if (!wrap) return;
      if (!topPayers.length) {
        wrap.innerHTML = '<div class="text-muted">No payment data yet.</div>';
        return;
      }
      wrap.innerHTML = topPayers.slice(0, 5).map((row, idx) => `
        <div class="recent-sale-row">
          <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;">
            <div>
              <div style="font-weight:700;color:var(--text);">${idx + 1}. ${row.player_name}</div>
              <div class="recent-sale-meta">Total paid</div>
            </div>
            <div style="font-family:var(--font-display);font-size:1.4rem;color:var(--accent);">${Number(row.total_paid || 0).toLocaleString()}</div>
          </div>
        </div>
      `).join('');
    }

    function renderBoardDuesTable() {
      const wrap = document.getElementById('boardDuesTable');
      if (!wrap) return;
      if (!paymentSummary.length) {
        wrap.innerHTML = '<div class="text-muted">No dues data yet.</div>';
        return;
      }
      wrap.innerHTML = `
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="border-bottom:1px solid var(--border);text-align:left;">
                <th style="padding:10px 8px;">Player</th>
                <th style="padding:10px 8px;">Due</th>
                <th style="padding:10px 8px;">Paid</th>
                <th style="padding:10px 8px;">Outstanding</th>
                <th style="padding:10px 8px;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${paymentSummary.map(row => `
                <tr style="border-bottom:0.5px solid var(--border);">
                  <td style="padding:10px 8px;font-weight:600;color:var(--text);">${row.player_name}</td>
                  <td style="padding:10px 8px;">${Number(row.total_due || 0).toLocaleString()}</td>
                  <td style="padding:10px 8px;">${Number(row.total_paid || 0).toLocaleString()}</td>
                  <td style="padding:10px 8px;color:${Number(row.outstanding || 0) > 0 ? 'var(--red)' : 'var(--green)'};">${Number(row.outstanding || 0).toLocaleString()}</td>
                  <td style="padding:10px 8px;">
                    <span style="font-size:11px;font-weight:600;padding:4px 8px;border-radius:999px;border:1px solid ${row.status === 'Paid' ? 'rgba(62,207,142,0.35)' : 'rgba(224,90,43,0.35)'};background:${row.status === 'Paid' ? 'rgba(62,207,142,0.08)' : 'rgba(224,90,43,0.08)'};color:${row.status === 'Paid' ? 'var(--green)' : 'var(--red)'};">${row.status}</span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
