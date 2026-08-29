"""Registro de eventos del monitor de camaras (ingresos/salidas por cajon).

En memoria por proceso (deque acotado): suficiente para la bitacora operativa
del turno y el toast/alertas en vivo. Si hay Redis configurado se podria mover
a Pub/Sub + lista; se documenta como evolucion natural.
"""
import itertools
from collections import deque
from datetime import datetime

# Cola global compartida entre endpoints y el worker de auto-escaneo
_EVENTS = deque(maxlen=800)
_SEQ = itertools.count(1)


def compute_events(parking_id: int, prev_statuses: dict, occupancy: dict, source: str = "scan") -> list:
    """Compara el estado previo de los cajones contra el nuevo resultado IA.

    prev_statuses: {code: "free"|"occupied"|"reserved"} ANTES de aplicar cambios
    occupancy:     {code: bool} deteccion nueva
    Retorna y registra la lista de eventos [{"id","parking_id","slot","type","source","ts"}]
    donde type es "entered" (ocupo) o "left" (desocupo). Cajones reservados no
    generan eventos porque el escaneo no los modifica.
    """
    ts = datetime.utcnow().isoformat()
    events = []
    for code, occ in (occupancy or {}).items():
        prev = (prev_statuses or {}).get(code)
        if prev == "reserved":
            continue
        if occ and prev != "occupied":
            etype = "entered"
        elif (not occ) and prev == "occupied":
            etype = "left"
        else:
            continue
        ev = {
            "id": next(_SEQ),
            "parking_id": parking_id,
            "slot": code,
            "type": etype,
            "source": source,
            "ts": ts,
        }
        events.append(ev)
        _EVENTS.append(ev)
    return events


def get_events(parking_id: int, limit: int = 60) -> list:
    """Ultimos eventos de una sede, mas reciente primero."""
    out = []
    for ev in reversed(_EVENTS):
        if ev.get("parking_id") == parking_id:
            out.append(ev)
            if len(out) >= max(1, min(limit, 200)):
                break
    return out


def clear_events(parking_id: int | None = None):
    """Limpia la bitacora (todo o solo una sede). Util en pruebas."""
    if parking_id is None:
        _EVENTS.clear()
    else:
        for ev in list(_EVENTS):
            if ev.get("parking_id") == parking_id:
                _EVENTS.remove(ev)