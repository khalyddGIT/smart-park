/* REPORTES Y ESTADÍSTICAS — RF96–RF110 */
function initReportesEstadisticas() {
  const stats = window.mockData.stats;
  // Revenue chart
  const maxRev = Math.max(...stats.revenueByMonth.map(r=>r.value));
  document.getElementById('re-chart-revenue').innerHTML = stats.revenueByMonth.map(r=>`<div class="bar-chart-item" style="height:${(r.value/maxRev)*100}%"><div class="bar-chart-val">${(r.value/1000).toFixed(1)}k</div><span>${r.month}</span></div>`).join('');
  // Occupancy chart
  document.getElementById('re-chart-occupancy').innerHTML = stats.occupancyByDay.map(r=>`<div class="bar-chart-item" style="height:${r.value}%;background:var(--c4)"><div class="bar-chart-val">${r.value}%</div><span>${r.day}</span></div>`).join('');
  // Heatmap
  const hm = document.getElementById('re-heatmap');
  let table = '<table style="width:100%;border-collapse:separate;border-spacing:2px"><thead><tr><th>Hora</th><th>Lun</th><th>Mar</th><th>Mié</th><th>Jue</th><th>Vie</th><th>Sáb</th><th>Dom</th></tr></thead><tbody>';
  stats.demandHeatmap.forEach(row => {
    table += `<tr><td style="font-size:.7rem;font-weight:700;color:var(--color-text-muted);width:50px">${row.hour}</td>`;
    ['lun','mar','mie','jue','vie','sab','dom'].forEach(day => {
      const v = row[day]; const alpha = v/100;
      table += `<td><div class="hm-cell" style="background:rgba(106,153,78,${alpha});color:${alpha>.6?'#fff':'var(--color-text)'}">${v}%</div></td>`;
    });
    table += '</tr>';
  });
  hm.innerHTML = table + '</tbody></table>';
}
