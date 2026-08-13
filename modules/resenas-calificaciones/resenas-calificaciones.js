/* RESEÑAS Y CALIFICACIONES — RF111–RF119 */
let rcCurrentRating = 5;
function initResenasCalificaciones() {
  const d = window.mockData; const role = window.currentRole;
  if(role === 'user') {
    document.getElementById('rc-form-card').style.display = 'block';
    renderStarInput();
  }
  let targetLocal = role === 'user' ? 1 : (d.currentUser.localId || 1);
  const reviews = d.reviews.filter(r => r.localId === targetLocal);
  const avg = (reviews.reduce((a,b)=>a+b.rating,0)/reviews.length).toFixed(1);
  document.getElementById('rc-stats').innerHTML = `<span class="badge badge-warning" style="font-size:1.2rem;padding:8px 16px">⭐ ${avg} Promedio</span>`;
  document.getElementById('rc-list-title').textContent = role === 'user' ? 'Mis Reseñas y del Local' : 'Gestión de Reseñas';
  
  document.getElementById('rc-list').innerHTML = reviews.map(r => `
    <div style="padding:16px 0;border-bottom:1px solid var(--color-border-light)">
      <div class="d-flex justify-between align-center mb-sm">
        <div class="d-flex align-center gap-sm">
          <div class="avatar avatar-sm" style="background:var(--c3);color:#fff">${r.userName[0]}</div>
          <div><div class="text-sm fw-600">${r.userName}</div><div class="text-xs text-muted">${SP_Components.formatDate(r.date)}</div></div>
        </div>
        <div>${SP_Components.renderStars(r.rating)}</div>
      </div>
      <p class="text-sm">${r.comment}</p>
      ${r.response ? `<div style="margin-top:12px;padding:12px;background:var(--color-bg);border-radius:var(--radius);border-left:3px solid var(--c3)"><div class="d-flex justify-between mb-sm"><div class="text-xs fw-600" style="color:var(--c3)">Respuesta del Administrador:</div></div><p class="text-sm">${r.response}</p></div>` : (role === 'local' ? `<div class="mt-sm"><textarea class="form-control mb-sm" placeholder="Escribir respuesta..."></textarea><button class="btn btn-sm btn-primary" onclick="SP_Components.showToast('success','Respondido','Respuesta enviada')">Responder</button></div>` : '')}
      ${role === 'admin' ? `<div class="mt-sm"><button class="btn btn-sm btn-danger" onclick="SP_Components.showToast('info','Moderación','Reseña eliminada')"><span class="material-symbols-outlined">delete</span> Moderar/Eliminar</button></div>` : ''}
    </div>
  `).join('');
}
function renderStarInput() {
  let html = '';
  for(let i=1;i<=5;i++){ html+=`<span class="material-symbols-outlined" style="color:${i<=rcCurrentRating?'#F57F17':'var(--color-border)'};cursor:pointer;font-size:2rem" onclick="rcCurrentRating=${i};renderStarInput()">${i<=rcCurrentRating?'star':'star'}</span>`; }
  document.getElementById('rc-star-input').innerHTML = html;
}
function submitReview() {
  SP_Components.showToast('success','Enviada','Reseña enviada correctamente. Gracias por tu feedback.');
  document.getElementById('rc-comment').value = '';
}
