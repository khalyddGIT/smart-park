/* PAGOS ELECTRÓNICOS — RF64–RF79 */

function initPagosElectronicos() {
  const d = window.mockData;

  // Promos RF69
  const promoEl = document.getElementById('pe-promos');
  if (promoEl) {
    promoEl.innerHTML = d.promotions.filter(p => p.active).map(p => `
      <div class="d-flex align-center gap-sm mb-sm" style="padding:12px;border:1px dashed var(--c2);border-radius:var(--radius);background:var(--color-surface-hover)">
        <span class="material-symbols-outlined" style="color:var(--c2)">local_offer</span>
        <div>
          <div class="text-sm fw-600">${SP_Components.escapeHtml(p.code)}</div>
          <div class="text-xs text-muted">${SP_Components.escapeHtml(p.description)} (Mínimo: ${SP_Components.formatCurrency(p.minAmount)})</div>
        </div>
      </div>`).join('');
  }

  renderTransactions();
}

function getUserTxns() {
  return window.mockData.getUserTransactions()
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function renderTransactions() {
  const tbody = document.getElementById('pe-txns-tbody');
  if (!tbody) return;
  const txns = getUserTxns();
  const typeMap = { 'parking': 'Estacionamiento', 'extension': 'Ampliación', 'confirmation': 'Reserva (Adelanto)' };

  tbody.innerHTML = txns.length ? txns.map(t => `
    <tr>
      <td data-label="Comprobante">${t.receipt ? `<a href="#" onclick="viewReceipt('${t.receipt}');return false">${SP_Components.escapeHtml(t.receipt)}</a>` : '—'}</td>
      <td data-label="Concepto">${typeMap[t.type] || SP_Components.escapeHtml(t.type)}</td>
      <td data-label="Fecha">${SP_Components.formatDateTime(t.date)}</td>
      <td data-label="Método">${SP_Components.escapeHtml(t.method)}</td>
      <td data-label="Monto">${SP_Components.formatCurrency(t.amount)}</td>
      <td data-label="Estado">${SP_Components.renderBadge(t.status)}</td>
      <td>${t.status === 'pending' ? `<button class="btn btn-sm btn-primary" onclick="completeTxn('${t.id}')">Pagar</button>` : ''}</td>
    </tr>
  `).join('') : '<tr><td colspan="7" class="text-center text-muted">Sin transacciones aún.</td></tr>';
}

function applyPromo(amount, code) {
  const promo = window.mockData.promotions.find(p => p.code === code && p.active);
  if (!promo) return { amount, applied: null };
  if (amount < promo.minAmount) {
    SP_Components.showToast('warning', 'Promoción', `El monto mínimo para ${promo.code} es S/ ${promo.minAmount.toFixed(2)}.`);
    return { amount, applied: null };
  }
  const discount = promo.type === 'percent' ? amount * (promo.discount / 100) : promo.discount;
  return { amount: Math.max(0, amount - discount), applied: promo };
}

function payNow() {
  const d = window.mockData;
  const amountInput = document.getElementById('pe-amount');
  const amount = parseFloat(amountInput.value);
  if (!amount || amount <= 0) {
    SP_Components.showToast('warning', 'Monto inválido', 'Ingresa un monto mayor a cero.');
    return;
  }

  const method = document.getElementById('pe-method').value;
  const code = document.getElementById('pe-promo').value.trim();
  const { amount: finalAmount, applied } = applyPromo(amount, code);

  const local = d.getLocalConfig();
  const txnId = 'TXN-' + String(Date.now()).slice(-6);
  const txn = {
    id: txnId,
    reservationId: null,
    userId: d.currentUser.id,
    localId: local ? local.id : (d.currentUser.localId || 1),
    type: 'parking',
    amount: finalAmount,
    originalAmount: applied ? amount : undefined,
    promoCode: applied ? applied.code : undefined,
    method,
    status: 'completed',
    date: new Date().toISOString().slice(0, 19).replace('T', ' '),
    receipt: 'REC-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + String(Date.now()).slice(-3)
  };
  d.transactions.push(txn);

  renderTransactions();
  amountInput.value = '5.00';
  document.getElementById('pe-promo').value = '';

  const promoNote = applied ? ` con descuento ${applied.code} (-S/ ${(amount - finalAmount).toFixed(2)})` : '';
  SP_Components.showToast('success', 'Pago exitoso', `Pagaste ${SP_Components.formatCurrency(finalAmount)}${promoNote}.`);
}

function completeTxn(id) {
  const t = window.mockData.transactions.find(x => x.id === id);
  if (t) {
    t.status = 'completed';
    t.receipt = 'REC-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + String(Date.now()).slice(-3);
    SP_Components.showToast('success', 'Pago completado', `Comprobante ${t.receipt} generado.`);
    renderTransactions();
  }
}

function viewReceipt(receipt) {
  const t = window.mockData.transactions.find(x => x.receipt === receipt);
  if (!t) return;
  const detail = [
    ['Comprobante', t.receipt],
    ['Concepto', t.type === 'parking' ? 'Estacionamiento' : t.type],
    ['Fecha', SP_Components.formatDateTime(t.date)],
    ['Método', t.method],
    ['Monto', SP_Components.formatCurrency(t.amount)]
  ].map(([k, v]) => `<div class="list-row"><div class="list-title">${k}</div><div class="list-sub fw-600">${SP_Components.escapeHtml(v)}</div></div>`).join('');

  SP_Components.confirm('Comprobante de Pago', detail, () => {
    SP_Components.showToast('info', 'Comprobante', 'Descargando PDF (simulado)...');
  });
}