"""Bitácora de Auditoría completa: deriva logs reales de la BD sin tabla adicional.

Cada fila proviene de un evento real: reservas (creación/check-in/out), pagos,
incidencias, reseñas, personal y ANPR. Idempotente por tipo+id+timestamp.
"""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.models import User, Reservation, Payment, Incident, Review, Staff, Parking, Slot

router = APIRouter(prefix="/audit", tags=["Auditoría"])


def _fmt(dt):
    if not dt:
        return "-"
    try:
        # SQLite puede devolver str
        if isinstance(dt, str):
            return dt[:19].replace("T", " ")
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        return str(dt)[:19]


@router.get("/logs")
async def audit_logs(
    parking_id: Optional[int] = None,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna bitácora unificada. Local/platform: filtrada por parking_id si se pasa; conductor: solo sus propias acciones."""
    logs = []
    is_local = current_user.role in ("local", "platform")

    # Cache de nombres de parkings y placas
    park_res = await db.execute(select(Parking))
    park_map = {p.id: p.name for p in park_res.scalars().all()}
    slot_res = await db.execute(select(Slot))
    slot_map = {s.id: s.code for s in slot_res.scalars().all()}

    # Reservas (creación, check-in, check-out)
    q = select(Reservation).order_by(Reservation.id.desc()).limit(limit)
    if not is_local and parking_id is None:
        # Conductor: solo sus reservas
        q = select(Reservation).where(Reservation.user_id == current_user.id).order_by(Reservation.id.desc()).limit(limit)
    elif parking_id is not None:
        q = select(Reservation).where(Reservation.parking_id == parking_id).order_by(Reservation.id.desc()).limit(limit)
    res = await db.execute(q)
    for r in res.scalars().all():
        pname = park_map.get(r.parking_id, f"Sede #{r.parking_id}")
        scode = slot_map.get(r.slot_id, f"#{r.slot_id}")
        # Creación
        logs.append({
            "id": f"RSV-{r.id:04d}-C",
            "timestamp": _fmt(r.start_time),
            "operator": f"Conductor ID #{r.user_id}",
            "action": "Creación de Reserva",
            "target": f"{r.code} / {r.license_plate} → {pname} {scode} (S/ {float(r.total_cost or 0):.2f})",
            "severity": "Info",
            "ip": f"parking:{r.parking_id}",
            "parking_id": r.parking_id,
            "parking_name": pname,
            "_sort_ts": r.start_time if isinstance(r.start_time, datetime) else datetime.min,
        })
        if r.actual_entry:
            logs.append({
                "id": f"RSV-{r.id:04d}-IN",
                "timestamp": _fmt(r.actual_entry),
                "operator": "Sistema ANPR / Garita",
                "action": "Check-in / Apertura de Barrera (Ingreso)",
                "target": f"{r.license_plate} / {scode} / {r.code}",
                "severity": "Info",
                "ip": f"parking:{r.parking_id}",
                "parking_id": r.parking_id,
                "parking_name": pname,
                "_sort_ts": r.actual_entry if isinstance(r.actual_entry, datetime) else datetime.min,
            })
        if r.actual_exit:
            logs.append({
                "id": f"RSV-{r.id:04d}-OUT",
                "timestamp": _fmt(r.actual_exit),
                "operator": "Sistema ANPR / Garita",
                "action": "Check-out / Cierre de Estancia",
                "target": f"{r.license_plate} / {scode} / {r.code}",
                "severity": "Info",
                "ip": f"parking:{r.parking_id}",
                "parking_id": r.parking_id,
                "parking_name": pname,
                "_sort_ts": r.actual_exit if isinstance(r.actual_exit, datetime) else datetime.min,
            })
        if r.status == "cancelled":
            logs.append({
                "id": f"RSV-{r.id:04d}-X",
                "timestamp": _fmt(r.end_time),
                "operator": f"Conductor ID #{r.user_id}",
                "action": "Cancelación de Reserva",
                "target": f"{r.code} / {r.license_plate}",
                "severity": "Advertencia",
                "ip": f"parking:{r.parking_id}",
                "parking_id": r.parking_id,
                "parking_name": pname,
                "_sort_ts": r.end_time if isinstance(r.end_time, datetime) else datetime.min,
            })

    # Pagos
    pq = select(Payment).order_by(Payment.id.desc()).limit(limit)
    if not is_local and parking_id is None:
        pq = select(Payment).where(Payment.user_id == current_user.id).order_by(Payment.id.desc()).limit(limit)
    elif parking_id is not None:
        pq = select(Payment).where(Payment.reservation_id.in_(
            select(Reservation.id).where(Reservation.parking_id == parking_id)
        )).order_by(Payment.id.desc()).limit(limit)
    pres = await db.execute(pq)
    for p in pres.scalars().all():
        # Resolver parking del pago vía reserva si existe
        pid = None
        if p.reservation_id:
            rr = await db.execute(select(Reservation).where(Reservation.id == p.reservation_id))
            ro = rr.scalars().first()
            if ro:
                pid = ro.parking_id
        if parking_id is not None and pid is not None and pid != parking_id:
            continue
        if not is_local and p.user_id != current_user.id:
            continue
        pname = park_map.get(pid, f"Sede #{pid or '?'}")
        logs.append({
            "id": f"PAY-{p.id:04d}",
            "timestamp": _fmt(p.created_at),
            "operator": "Sistema de Pagos",
            "action": f"Liquidación {p.method or 'tarjeta'} ({p.currency})",
            "target": f"Pago #{p.id} — S/ {p.amount_cents/100:.2f} / {p.culqi_charge_id or '—'}",
            "severity": "Info",
            "ip": "Gateway",
            "parking_id": pid,
            "parking_name": pname,
            "_sort_ts": p.created_at if isinstance(p.created_at, datetime) else datetime.min,
        })

    # Incidencias
    iq = select(Incident).order_by(Incident.id.desc()).limit(limit)
    if parking_id is not None:
        iq = select(Incident).where(Incident.parking_id == parking_id).order_by(Incident.id.desc()).limit(limit)
    elif not is_local:
        iq = select(Incident).where(Incident.user_id == current_user.id).order_by(Incident.id.desc()).limit(limit)
    ires = await db.execute(iq)
    for inc in ires.scalars().all():
        pname = park_map.get(inc.parking_id, f"Sede #{inc.parking_id}")
        sev = "Crítico" if inc.status == "reported" else "Info"
        logs.append({
            "id": f"INC-{inc.id:04d}",
            "timestamp": _fmt(inc.created_at),
            "operator": inc.user_name or f"Usuario #{inc.user_id}",
            "action": f"Incidencia: {inc.category}",
            "target": f"{inc.description[:80]} @ {pname}",
            "severity": sev,
            "ip": f"parking:{inc.parking_id}",
            "parking_id": inc.parking_id,
            "parking_name": pname,
            "_sort_ts": inc.created_at if isinstance(inc.created_at, datetime) else datetime.min,
        })
        if inc.resolved_at:
            logs.append({
                "id": f"INC-{inc.id:04d}-R",
                "timestamp": _fmt(inc.resolved_at),
                "operator": "Supervisor",
                "action": "Resolución de Incidencia",
                "target": f"{inc.resolution_note or 'Resuelta'} @ {pname}",
                "severity": "Info",
                "ip": f"parking:{inc.parking_id}",
                "parking_id": inc.parking_id,
                "parking_name": pname,
                "_sort_ts": inc.resolved_at if isinstance(inc.resolved_at, datetime) else datetime.min,
            })

    # Reseñas
    rq = select(Review).order_by(Review.id.desc()).limit(limit)
    if parking_id is not None:
        rq = select(Review).where(Review.parking_id == parking_id).order_by(Review.id.desc()).limit(limit)
    rres = await db.execute(rq)
    for rev in rres.scalars().all():
        pname = park_map.get(rev.parking_id, f"Sede #{rev.parking_id}")
        logs.append({
            "id": f"REV-{rev.id:04d}",
            "timestamp": _fmt(rev.created_at),
            "operator": rev.user_name or f"Usuario #{rev.user_id}",
            "action": f"Reseña {rev.rating}★",
            "target": f"{rev.comment[:80]} @ {pname}",
            "severity": "Info",
            "ip": f"parking:{rev.parking_id}",
            "parking_id": rev.parking_id,
            "parking_name": pname,
            "_sort_ts": rev.created_at if isinstance(rev.created_at, datetime) else datetime.min,
        })
        if rev.response:
            logs.append({
                "id": f"REV-{rev.id:04d}-RP",
                "timestamp": _fmt(rev.created_at),
                "operator": "Admin Local",
                "action": "Respuesta a Reseña",
                "target": f"{rev.response[:80]} @ {pname}",
                "severity": "Info",
                "ip": f"parking:{rev.parking_id}",
                "parking_id": rev.parking_id,
                "parking_name": pname,
                "_sort_ts": rev.created_at if isinstance(rev.created_at, datetime) else datetime.min,
            })

    # Ordenar por timestamp descendente (más reciente primero)
    def sort_key(x):
        ts = x.get("_sort_ts")
        if isinstance(ts, datetime):
            return ts
        try:
            return datetime.fromisoformat(str(ts).replace(" ", "T"))
        except Exception:
            return datetime.min

    logs.sort(key=sort_key, reverse=True)
    # Limpiar campo interno y limitar
    for entry in logs:
        entry.pop("_sort_ts", None)
    return logs[:limit]
