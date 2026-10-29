document.addEventListener('DOMContentLoaded', async () => {
  const card = document.getElementById('invoiceCard');
  if (!card) return;

  let user = null;
  try {
    const authRes = await fetch('/api/auth/me', { credentials: 'include' });
    if (authRes.ok) {
      const authData = await authRes.json();
      if (authData.ok && authData.user) user = authData.user;
    }
  } catch (_) {}

  if (!user) {
    window.location.href = `login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const requestId = params.get('request_id') || params.get('requestId');
  const invoiceId = params.get('id');

  if (!requestId && !invoiceId) {
    card.innerHTML = `
      <div style="text-align:center; padding:40px; color:var(--danger);">
        <i class="bi bi-exclamation-triangle" style="font-size:36px; display:block; margin-bottom:12px;"></i>
        <h3>Missing Invoice Parameters</h3>
        <p style="color:var(--text-muted); margin-top:8px;">No valid request or invoice ID was provided in the URL.</p>
        <a href="customer-bookings.html" class="btn btn-primary" style="margin-top:16px;">Go to My Bookings</a>
      </div>
    `;
    return;
  }

  try {
    const endpoint = requestId ? `/invoices/by-request/${requestId}` : `/invoices/${invoiceId}`;
    const res = await window.api(endpoint);
    const inv = res.invoice;

    if (!inv) {
      throw new Error('Invoice data not returned');
    }

    renderInvoice(inv);
  } catch (err) {
    console.error('Failed to load invoice:', err);
    card.innerHTML = `
      <div style="text-align:center; padding:40px; color:var(--danger);">
        <i class="bi bi-file-earmark-x" style="font-size:36px; display:block; margin-bottom:12px;"></i>
        <h3>Invoice Not Found</h3>
        <p style="color:var(--text-muted); margin-top:8px;">${window.escapeHtml(err.message || 'The requested invoice could not be located or you lack permission to view it.')}</p>
        <button onclick="window.history.back()" class="btn btn-ghost" style="margin-top:16px;">Go Back</button>
      </div>
    `;
  }
});

function renderInvoice(inv) {
  const card = document.getElementById('invoiceCard');
  if (!card) return;

  const invNum = `INV-${String(inv.id).padStart(6, '0')}`;
  const issueDate = inv.issued_at || inv.created_at ? new Date(inv.issued_at || inv.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Today';
  const subtotal = Number(inv.subtotal || 0);
  const tax = Number(inv.tax || 0);
  const total = Number(inv.total || (subtotal + tax));

  card.innerHTML = `
    <div class="invoice-header">
      <div>
        <div class="invoice-brand">
          <div class="invoice-brand-icon"><i class="bi bi-house-gear"></i></div>
          <span>HutFix Services Ltd.</span>
        </div>
        <p style="color:var(--text-muted); font-size:13px; margin-top:8px;">
          National Smart Home Maintenance Network<br>
          Gulshan-2, Dhaka 1212, Bangladesh<br>
          support@hutfix.com | +880 1700-HUTFIX
        </p>
      </div>
      <div style="text-align:right;">
        <span class="eyebrow" style="color:var(--accent);">OFFICIAL RECEIPT</span>
        <h2 style="font-family:var(--font-mono); font-size:20px; margin:4px 0 8px 0; color:var(--text-main);">${invNum}</h2>
        <div style="font-size:13px; color:var(--text-muted);">Issue Date: <strong style="color:var(--text-main);">${issueDate}</strong></div>
        <div style="margin-top:8px;">
          <span class="badge badge-completed" style="font-size:12px; padding:4px 12px;"><i class="bi bi-check-circle-fill"></i> PAID / COMPLETED</span>
        </div>
      </div>
    </div>

    <div class="invoice-meta-grid">
      <div class="meta-box">
        <h4>Billed To (Customer)</h4>
        <p><strong>${window.escapeHtml(inv.customer_name || 'Valued Customer')}</strong></p>
        <p style="color:var(--text-muted);"><i class="bi bi-telephone"></i> ${window.escapeHtml(inv.customer_phone || '—')}</p>
        <p style="color:var(--text-muted);"><i class="bi bi-geo-alt"></i> Service Delivery Address</p>
      </div>
      <div class="meta-box">
        <h4>Service Specialist</h4>
        <p><strong>${window.escapeHtml(inv.provider_name || 'Verified Specialist')}</strong></p>
        <p style="color:var(--text-muted);"><i class="bi bi-telephone"></i> ${window.escapeHtml(inv.provider_phone || '—')}</p>
        <p style="color:var(--text-muted);"><i class="bi bi-shield-check" style="color:var(--accent);"></i> HutFix Certified Provider</p>
      </div>
      <div class="meta-box">
        <h4>Service Reference</h4>
        <p>Booking ID: <strong style="color:var(--text-main);">#${inv.request_id}</strong></p>
        <p style="color:var(--text-muted);">Category: ${window.escapeHtml(inv.category_name || 'General Maintenance')}</p>
        <p style="color:var(--text-muted);">Currency: BDT (${inv.currency || '৳'})</p>
      </div>
    </div>

    <table class="invoice-table">
      <thead>
        <tr>
          <th>Item & Description</th>
          <th style="text-align:center;">Qty</th>
          <th style="text-align:right;">Unit Price</th>
          <th style="text-align:right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td data-label="Item & Description">
            <strong style="color:var(--text-main); font-size:15px;">${window.escapeHtml(inv.category_name || 'Home Maintenance')} Service</strong>
            <div style="font-size:13px; color:var(--text-muted); margin-top:2px;">Specialist labor, standard equipment diagnostic, and resolution for Booking #${inv.request_id}</div>
          </td>
          <td data-label="Qty" style="text-align:center; font-weight:600;">1</td>
          <td data-label="Unit Price" style="text-align:right; font-family:var(--font-mono);">${window.money(subtotal)}</td>
          <td data-label="Amount" style="text-align:right; font-family:var(--font-mono); font-weight:700;">${window.money(subtotal)}</td>
        </tr>
      </tbody>
    </table>

    <div class="invoice-summary">
      <div class="summary-row">
        <span>Service Subtotal:</span>
        <span style="font-family:var(--font-mono); font-weight:600;">${window.money(subtotal)}</span>
      </div>
      <div class="summary-row">
        <span>Platform Tax / VAT (5%):</span>
        <span style="font-family:var(--font-mono); font-weight:600;">${window.money(tax)}</span>
      </div>
      <div class="summary-row total-row">
        <span>Total Paid:</span>
        <span style="font-family:var(--font-mono); color:var(--accent);">${window.money(total)}</span>
      </div>
    </div>

    <div class="invoice-footer-note">
      <p style="font-weight:600; color:var(--text-main); margin-bottom:4px;">Thank you for partnering with HutFix.</p>
      <p>This is a computer-generated tax invoice authenticated by the HutFix Automated Platform. Questions? Contact support@hutfix.com.</p>
    </div>
  `;
}
