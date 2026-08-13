/* VISIÓN ARTIFICIAL — RF50–RF56 */
function initVisionArtificial(){
  const d=window.mockData,localId=d.currentUser.localId||1;
  document.getElementById('va-confidence').innerHTML=SP_Components.renderConfidence(97);
  // RF59: Match check
  const det=d.detections.find(dt=>dt.plate==='ABC-123'&&dt.localId===localId);
  document.getElementById('va-match-result').innerHTML=det&&det.matchReservation?`<div class="d-flex align-center gap-sm" style="padding:8px 12px;background:var(--color-success-bg);border-radius:var(--radius)"><span class="material-symbols-outlined" style="color:var(--color-success)">check_circle</span><span class="text-sm">Coincide con reserva <strong>${det.matchReservation}</strong></span></div>`:`<div class="d-flex align-center gap-sm" style="padding:8px 12px;background:var(--color-warning-bg);border-radius:var(--radius)"><span class="material-symbols-outlined" style="color:var(--color-warning)">warning</span><span class="text-sm">Sin reserva activa asociada</span></div>`;
  // Detections table
  const dets=d.detections.filter(dt=>dt.localId===localId);
  document.getElementById('va-detections-tbody').innerHTML=dets.map(dt=>`<tr><td data-label="Hora">${SP_Components.formatTime(dt.entryTime)}</td><td data-label="Placa"><span class="plate-display" style="font-size:.75rem;padding:2px 6px">${dt.plate}</span></td><td data-label="Tipo">${dt.type}</td><td data-label="Confianza">${SP_Components.renderConfidence(dt.confidence)}</td><td data-label="Estado">${SP_Components.renderBadge(dt.status)}</td><td data-label="Reserva">${dt.matchReservation||'—'}</td></tr>`).join('');
}
function simulateDetection(){SP_Components.showToast('success','Detección','Vehículo detectado — Espacio actualizado — Tarifa iniciada a las '+new Date().toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'}));document.getElementById('va-sync').innerHTML='<span class="material-symbols-outlined" style="font-size:.9rem">check</span> Enviado a plataforma central ✓'}
function resetDetection(){document.getElementById('va-detected-plate').textContent='---';document.getElementById('va-confidence').innerHTML=SP_Components.renderConfidence(0);SP_Components.showToast('info','Reset','Detección reiniciada')}
function authorizeEntry(){SP_Components.showToast('success','Autorizado','Ingreso registrado — Tarifa iniciada')}
function denyEntry(){SP_Components.showToast('danger','Denegado','Acceso denegado al vehículo')}
function registerNoReservation(){const p=document.getElementById('va-manual-plate').value;if(!p){SP_Components.showToast('warning','Placa','Ingresa una placa');return}SP_Components.showToast('info','Registrado',`Vehículo ${p.toUpperCase()} registrado sin reserva`)}
