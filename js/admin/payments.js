// Payments and dues admin UI
// Extracted from admin.html during Admin refactor.

function renderPaymentsTab() {
      renderAdminPaymentSummary();
      renderAdminPaymentsList();
    }

    function renderAdminPaymentSummary() {
      const wrap = document.getElementById('adminPaymentSummary');
      if (!wrap) return;
      if (paymentLoadError) {
        wrap.innerHTML = `<div class="text-muted" style="color:var(--red);">Error: ${paymentLoadError}</div>`;
        return;
      }
      if (!paymentSummary.length) {
        wrap.innerHTML = '<div class="text-muted">No entries yet.</div>';
        return;
      }
      const totalCollected   = paymentSummary.reduce((s, r) => s + Number(r.total_paid || 0), 0);
      const totalOutstanding = paymentSummary.reduce((s, r) => s + Number(r.outstanding || 0), 0);
      const totalPending     = paymentSummary.filter(r => r.status === 'Pending').length;
      const reserve          = totalCollected - duesSpent;
      wrap.innerHTML = `
        <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:16px;padding-bottom:14px;border-bottom:0.5px solid var(--border);">
          <div><div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;">Collected</div>
            <div style="font-family:var(--font-display);font-size:1.6rem;color:var(--green);">$${totalCollected}</div></div>
          <div><div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;">Outstanding</div>
            <div style="font-family:var(--font-display);font-size:1.6rem;color:${totalOutstanding > 0 ? 'var(--red)' : 'var(--green)'};">$${totalOutstanding}</div></div>
          <div><div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;">Still Owing</div>
            <div style="font-family:var(--font-display);font-size:1.6rem;color:var(--muted);">${totalPending} player${totalPending !== 1 ? 's' : ''}</div></div>
          <div><div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;">Dues Spent</div>
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-family:var(--font-display);font-size:1.6rem;color:var(--accent);">$</span>
              <input id="duesSpentInput" type="number" min="0" value="${duesSpent}" style="width:90px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:4px 8px;color:var(--text);font-family:var(--font-display);font-size:1.2rem;">
              <button class="btn-sm" style="width:auto;padding:6px 10px;" onclick="saveDuesSpent()">Save</button>
            </div></div>
          <div><div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;">Reserve</div>
            <div style="font-family:var(--font-display);font-size:1.6rem;color:${reserve >= 0 ? 'var(--green)' : 'var(--red)'};">$${reserve}</div></div>
        </div>
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="border-bottom:1px solid var(--border);text-align:left;">
                <th style="padding:8px 10px;color:var(--muted);font-weight:500;">Player</th>
                <th style="padding:8px 8px;color:var(--muted);font-weight:500;text-align:center;">Games</th>
                <th style="padding:8px 8px;color:var(--muted);font-weight:500;text-align:center;">Due</th>
                <th style="padding:8px 8px;color:var(--muted);font-weight:500;text-align:center;">Paid</th>
                <th style="padding:8px 8px;color:var(--muted);font-weight:500;text-align:center;">Owes</th>
                <th style="padding:8px 8px;color:var(--muted);font-weight:500;"></th>
              </tr>
            </thead>
            <tbody>
              ${paymentSummary.map(row => `
                <tr style="border-bottom:0.5px solid var(--border);">
                  <td style="padding:10px 10px;color:var(--text);font-weight:600;">${row.player_name}</td>
                  <td style="padding:10px 8px;text-align:center;color:var(--muted);">${row.games_played}</td>
                  <td style="padding:10px 8px;text-align:center;color:var(--muted);">$${Number(row.total_due || 0)}</td>
                  <td style="padding:10px 8px;text-align:center;color:var(--green);">$${Number(row.total_paid || 0)}</td>
                  <td style="padding:10px 8px;text-align:center;color:${Number(row.outstanding || 0) > 0 ? 'var(--red)' : 'var(--green)'};">
                    ${Number(row.outstanding || 0) > 0 ? `$${Number(row.outstanding)}` : '✓'}
                  </td>
                  <td style="padding:10px 8px;">
                    <span style="font-size:11px;font-weight:600;padding:3px 8px;border-radius:999px;
                      border:1px solid ${row.status === 'Paid' ? 'rgba(62,207,142,0.35)' : 'rgba(224,90,43,0.35)'};
                      background:${row.status === 'Paid' ? 'rgba(62,207,142,0.08)' : 'rgba(224,90,43,0.08)'};
                      color:${row.status === 'Paid' ? 'var(--green)' : 'var(--red)'};">
                      ${row.status}
                    </span>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    }

    async function saveDuesSpent() {
      const input = document.getElementById('duesSpentInput');
      const msg = document.getElementById('paymentMsg');
      const value = Number(input.value);
      if (isNaN(value) || value < 0) { msg.textContent = 'Enter a valid amount.'; return; }
      const { error } = await db.from('dues_settings').update({ spent: value, updated_at: new Date().toISOString() }).eq('id', 1);
      if (error) { msg.textContent = 'Error: ' + error.message; return; }
      msg.textContent = 'Dues Spent updated!';
      setTimeout(() => msg.textContent = '', 2000);
      await loadData();
    }

    function renderAdminPaymentsList() {
      const wrap = document.getElementById('adminPaymentsList');
      if (!wrap) return;
      if (paymentLoadError) {
        wrap.innerHTML = `<div class="text-muted" style="color:var(--red);">Error: ${paymentLoadError}</div>`;
        return;
      }
      if (!allPayments.length) {
        wrap.innerHTML = '<div class="text-muted">No entries yet.</div>';
        return;
      }
      wrap.innerHTML = allPayments.map(row => {
        const isPaid = row.payment_status === 'received';
        return `
        <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;padding:10px 0;border-bottom:0.5px solid var(--border);">
          <div style="flex:1;">
            <div style="font-weight:600;color:var(--text);font-size:14px;">${row.player_name}
              <span style="font-size:11px;font-weight:600;padding:2px 7px;border-radius:999px;margin-left:6px;
                border:1px solid ${isPaid ? 'rgba(62,207,142,0.35)' : 'rgba(224,90,43,0.35)'};
                background:${isPaid ? 'rgba(62,207,142,0.08)' : 'rgba(224,90,43,0.08)'};
                color:${isPaid ? 'var(--green)' : 'var(--red)'};">
                ${isPaid ? 'Received' : 'Pending'}
              </span>
            </div>
            <div style="font-size:12px;color:var(--muted);margin-top:2px;">
              $${row.amount || 3} · ${row.game_date || '—'}${row.notes ? ' · ' + row.notes : ''}
            </div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0;">
            <button class="btn-sm" style="width:auto;padding:6px 10px;" onclick="togglePaymentStatus(${row.id},'${row.payment_status}')">
              ${isPaid ? 'Mark Pending' : '✓ Mark Received'}
            </button>
            <button class="btn-danger" style="width:auto;padding:6px 10px;" onclick="deletePaymentEntry(${row.id})">✕</button>
          </div>
        </div>`;
      }).join('');
    }

    async function togglePaymentStatus(id, currentStatus) {
      const newStatus = currentStatus === 'received' ? 'pending' : 'received';
      const { error } = await db.from('payments').update({ payment_status: newStatus }).eq('id', id);
      if (error) { document.getElementById('paymentMsg').textContent = 'Error: ' + error.message; return; }
      await loadData();
    }

    async function deletePaymentEntry(id) {
      if (!id || !confirm('Delete this entry?')) return;
      const msg = document.getElementById('paymentMsg');
      const { error } = await db.from('payments').delete().eq('id', id);
      if (error) { msg.textContent = 'Error: ' + error.message; return; }
      msg.textContent = 'Entry deleted.';
      setTimeout(() => msg.textContent = '', 2000);
      await loadData();
    }

    async function addPaymentEntry() {
      const player_name    = document.getElementById('paymentPlayer').value.trim();
      const game_date      = document.getElementById('paymentDate').value || null;
      const amount         = parseInt(document.getElementById('paymentAmount').value) || 3;
      const payment_status = document.getElementById('paymentStatus').value;
      const notes          = document.getElementById('paymentNotes').value.trim() || null;
      const msg            = document.getElementById('paymentMsg');
      if (!player_name || !game_date) { msg.textContent = 'Enter player name and game date.'; return; }
      const { error } = await db.from('payments').insert({ player_name, game_date, amount, payment_status, notes });
      if (error) { msg.textContent = 'Error: ' + error.message; return; }
      document.getElementById('paymentPlayer').value  = '';
      document.getElementById('paymentDate').value    = '';
      document.getElementById('paymentNotes').value   = '';
      document.getElementById('paymentAmount').value  = '3';
      document.getElementById('paymentStatus').value  = 'received';
      msg.textContent = 'Entry saved!';
      setTimeout(() => msg.textContent = '', 2000);
      await loadData();
    }

    // ── Hall of Fame ──
    let hofArchiveCaptains = [];
    let hofArchivePlayers  = [];
