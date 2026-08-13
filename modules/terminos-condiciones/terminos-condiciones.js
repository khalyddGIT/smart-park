/* TÉRMINOS Y CONDICIONES — RF125–RF129 */
function initTerminosCondiciones() {
  const role = window.currentRole;
  if(role === 'admin') {
    document.getElementById('tc-admin-view').style.display = 'block';
    document.getElementById('tc-accept-area').style.display = 'none';
    document.getElementById('tc-actions').style.display = 'none';
  } else {
    // Check if accepted
    const accepted = localStorage.getItem('sp_tc_accepted');
    if(accepted) {
      document.getElementById('tc-accept-area').innerHTML = '<span class="badge badge-success">✓ Términos aceptados</span>';
      document.getElementById('tc-actions').style.display = 'none';
    }
  }
}
function acceptTC() {
  if(!document.getElementById('tc-accept').checked) {
    SP_Components.showToast('warning', 'Atención', 'Debes marcar la casilla para aceptar los términos.');
    return;
  }
  localStorage.setItem('sp_tc_accepted', 'true');
  SP_Components.showToast('success', 'Aceptado', 'Términos y condiciones aceptados.');
  initTerminosCondiciones();
}
