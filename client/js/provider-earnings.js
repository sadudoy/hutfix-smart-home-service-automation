/**
 * HutFix — Provider Earnings & Payout Requests (MPA)
 */

document.addEventListener('DOMContentLoaded', async () => {
  const user = await window.renderLayout('provider', 'earnings');
  if (!user) return;

  const valAvail = document.getElementById('valAvailable');
  const valTotal = document.getElementById('valTotalEarned');
  const valCount = document.getElementById('valInvoicesCount');

  const payoutsTbody = document.getElementById('payoutsTableBody');
  const invoicesTbody = document.getElementById('invoicesTableBody');

  let currentAvailable = 0;

  async function loadFinancials() {
    try {
      const [invRes, payRes] = await Promise.all([
        fetch('/api/invoices/mine', { credentials: 'include' }),
        fetch('/api/provider/payouts', { credentials: 'include' })
      ]);

      const invData = invRes.ok ? await invRes.json() : { invoices: [], totals: {} };
      const payData = payRes.ok ? await payRes.json() : { payouts: [] };

      const invoices = invData.invoices || [];
      const payouts = payData.payouts || [];

      currentAvailable = payData.available_balance != null ? payData.available_balance : (invData.totals?.sum_total || 0);
      const totalEarned = payData.total_earned != null ? payData.total_earned : currentAvailable;

      if (valAvail) valAvail.textContent = window.money(currentAvailable);
      if (valTotal) valTotal.textContent = window.money(totalEarned);
      if (valCount) valCount.textContent = invoices.length;

      // Render Payouts
      if (payouts.length === 0) {
        payoutsTbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:24px; color:var(--muted);">No payout requests submitted yet.</td></tr>`;
      } else {
        payoutsTbody.innerHTML = payouts.map(po => `
          <tr>
            <td><strong>#${po.id}</strong></td>
            <td><strong>${window.money(po.amount)}</strong></td>
            <td>${new Date(po.created_at).toLocaleDateString()}</td>
            <td>
              <span class="status ${po.status === 'completed' ? 'completed' : po.status === 'rejected' ? 'danger' : 'progress'}">
                ${po.status}
              </span>
            </td>
          </tr>
        `).join('');
      }

      // Render Invoices Ledger with 10% fee
      if (invoices.length === 0) {
        invoicesTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:24px; color:var(--muted);">No completed invoices issued yet.</td></tr>`;
      } else {
        invoicesTbody.innerHTML = invoices.map(i => {
          const gross = Number(i.total || 0);
          const fee = Math.round(gross * 0.10);
          const net = gross - fee;

          return `
            <tr>
              <td><strong>#${i.id || i.invoice_number}</strong></td>
              <td>${new Date(i.issued_at).toLocaleDateString()}</td>
              <td>${window.escapeHtml(i.category_name || 'Service')}</td>
              <td>${window.escapeHtml(i.customer_name || 'Client')}</td>
              <td><strong>${window.money(gross)}</strong></td>
              <td style="color:var(--muted);">${window.money(fee)}</td>
              <td><strong style="color:var(--green);">${window.money(net)}</strong></td>
            </tr>
          `;
        }).join('');
      }
    } catch (err) {
      console.error('loadFinancials error:', err);
    }
  }

  // Request Payout Modal
  document.getElementById('openPayoutModalBtn')?.addEventListener('click', () => {
    const bodyHtml = `
      <form id="payoutForm">
        <div class="form-grid">
          <div class="form-field full">
            <label>Available for Withdrawal</label>
            <input value="${window.money(currentAvailable)}" disabled style="background:var(--bg-body);" />
          </div>
          <div class="form-field full">
            <label>Withdrawal Amount (BDT)</label>
            <input type="number" name="amount" min="100" max="${currentAvailable || 50000}" value="${currentAvailable > 0 ? currentAvailable : 500}" required />
          </div>
          <div class="form-field full">
            <label>Payout Method</label>
            <select name="method" style="padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-surface); color:var(--text-main);">
              <option value="bkash">bKash Personal Wallet</option>
              <option value="nagad">Nagad Personal Wallet</option>
            </select>
          </div>
          <div class="form-field full">
            <label>Recipient Mobile Number</label>
            <input name="phone" placeholder="e.g., 01700000000" value="${user.phone || ''}" required />
          </div>
        </div>
        <div class="modal-actions" style="margin-top:20px;">
          <button type="button" class="secondary-btn" onclick="window.closeModal()">Cancel</button>
          <button type="submit" class="primary-btn" id="confirmPayoutBtn"><i class="bi bi-cash-stack"></i> Submit Request</button>
        </div>
      </form>
    `;

    window.openModal('Request Payout Disbursement', bodyHtml, 'FINANCES');

    document.getElementById('payoutForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('confirmPayoutBtn');
      if (btn) btn.disabled = true;

      const fd = new FormData(e.target);
      const amount = parseFloat(fd.get('amount'));

      try {
        const res = await fetch('/api/provider/payouts', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount })
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || 'Payout request failed');

        window.closeModal();
        window.toast('Payout request submitted! Admin will verify transfer.');
        await loadFinancials();
      } catch (err) {
        window.toast('Error: ' + err.message);
        if (btn) btn.disabled = false;
      }
    });
  });

  await loadFinancials();
});
