"""Bitácora de Auditoría y Seguridad Empresarial:
Unifica eventos administrativos y de seguridad (AuditLog) con eventos operacionales
derivados (reservas, pagos, incidencias, reseñas).
"""
import json
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.models import (
    User,
    Reservation,
    Payment,
    Incident,
    Review,
    Staff,
    Parking,
    Slot,
    AuditLog,
)

router = APIRouter(prefix="/audit", tags=["Auditoría"])


def _fmt(dt):
    if not dt:
        return "-"
    try:
        if isinstance(dt, str):
            return dt[:19].replace("T", " ")
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        return str(dt)[:19]


@router.get("/logs")
async def audit_logs(
    parking_id: Optional[int] = None,
    severity: Optional[str] = None,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna bitácora unificada y corporativa.
    
    Combina registros inmutables de AuditLog con eventos operacionales de la red.
    Soporta filtrado por sede (parking_id) y severidad (Info, Advertencia, Crítico).
    """
    logs = []
    is_local = current_user.role in ("local", "platform")
    is_platform = current_user.role == "platform"

    # Cache de nombres de parkings y plazas
    park_res = await db.execute(select(Parking))
    park_map = {p.id: p.name for p in park_res.scalars().all()}
    slot_res = await db.execute(select(Slot))
    slot_map = {s.id: s.code for s in slot_res.scalars().all()}

    # 1. Eventos Administrativos y de Seguridad Inmutables (AuditLog)
    aq = select(AuditLog)
    if not is_local and parking_id is None:
        # Conductor: solo sus propios eventos
        aq = aq.where(AuditLog.user_id == current_user.id)
    elif parking_id is not None:
        aq = aq.where((AuditLog.parking_id == parking_id) | (AuditLog.parking_id.is_(None)))
    
    if severity and severity.lower() != "all" and severity.lower() != "todos":
        aq = aq.where(AuditLog.severity.ilike(severity))

    aq = aq.order_by(AuditLog.id.desc()).limit(limit)
    ares = await db.execute(aq)
    for al in ares.scalars().all():
        pname = al.parking_name or park_map.get(al.parking_id, f"Sede #{al.parking_id}" if al.parking_id else "Global / Plataforma")
        op = al.user_email or (f"Usuario #{al.user_id}" if al.user_id else "Sistema Central")
        
        parsed_details = al.details
        if isinstance(al.details, str):
            try:
                parsed_details = json.loads(al.details)
            except Exception:
                parsed_details = al.details

        logs.append({
            "id": f"AUD-{al.id:05d}",
            "timestamp": _fmt(al.created_at),
            "operator": op,
            "role": al.role or "system",
            "user_id": al.user_id,
            "action": al.action,
            "target": al.target or "Plataforma SmartPark",
            "severity": al.severity or "Info",
            "ip": al.ip_address or "127.0.0.1",
            "parking_id": al.parking_id,
            "parking_name": pname,
            "details": parsed_details,
            "_sort_ts": al.created_at if isinstance(al.created_at, datetime) else datetime.min,
        })

    # 2. Eventos Operacionales: Reservas (creación, check-in, check-out, cancelación)
    q = select(Reservation).order_by(Reservation.id.desc()).limit(limit)
    if not is_local and parking_id is None:
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
            "role": "user",
            "user_id": r.user_id,
            "action": "Creación de Reserva",
            "target": f"{r.code} / {r.license_plate} → {pname} {scode} (S/ {float(r.total_cost or 0):.2f})",
            "severity": "Info",
            "ip": f"parking:{r.parking_id}",
            "parking_id": r.parking_id,
            "parking_name": pname,
            "details": {
                "tipo": "creacion_reserva",
                "codigo": r.code,
                "placa": r.license_plate,
                "espacio": scode,
                "costo_total": float(r.total_cost or 0),
                "estado": r.status,
            },
            "_sort_ts": r.start_time if isinstance(r.start_time, datetime) else datetime.min,
        })
        if r.actual_entry:
            logs.append({
                "id": f"RSV-{r.id:04d}-IN",
                "timestamp": _fmt(r.actual_entry),
                "operator": "Sistema ANPR / Garita",
                "role": "system",
                "user_id": r.user_id,
                "action": "Check-in / Apertura de Barrera (Ingreso)",
                "target": f"{r.license_plate} / {scode} / {r.code}",
                "severity": "Info",
                "ip": f"gate:{r.parking_id}",
                "parking_id": r.parking_id,
                "parking_name": pname,
                "details": {
                    "tipo": "check_in_anpr",
                    "codigo": r.code,
                    "placa": r.license_plate,
                    "ingreso_real": _fmt(r.actual_entry),
                    "espacio": scode,
                },
                "_sort_ts": r.actual_entry if isinstance(r.actual_entry, datetime) else datetime.min,
            })
        if r.actual_exit:
            logs.append({
                "id": f"RSV-{r.id:04d}-OUT",
                "timestamp": _fmt(r.actual_exit),
                "operator": "Sistema ANPR / Garita",
                "role": "system",
                "user_id": r.user_id,
                "action": "Check-out / Cierre de Estancia",
                "target": f"{r.license_plate} / {scode} / {r.code}",
                "severity": "Info",
                "ip": f"gate:{r.parking_id}",
                "parking_id": r.parking_id,
                "parking_name": pname,
                "details": {
                    "tipo": "check_out_anpr",
                    "codigo": r.code,
                    "placa": r.license_plate,
                    "salida_real": _fmt(r.actual_exit),
                    "espacio": scode,
                },
                "_sort_ts": r.actual_exit if isinstance(r.actual_exit, datetime) else datetime.min,
            })
        if r.status == "cancelled":
            logs.append({
                "id": f"RSV-{r.id:04d}-X",
                "timestamp": _fmt(r.end_time),
                "operator": f"Conductor ID #{r.user_id}",
                "role": "user",
                "user_id": r.user_id,
                "action": "Cancelación de Reserva",
                "target": f"{r.code} / {r.license_plate}",
                "severity": "Advertencia",
                "ip": f"parking:{r.parking_id}",
                "parking_id": r.parking_id,
                "parking_name": pname,
                "details": {
                    "tipo": "cancelacion",
                    "codigo": r.code,
                    "placa": r.license_plate,
                },
                "_sort_ts": r.end_time if isinstance(r.end_time, datetime) else datetime.min,
            })

    # 3. Pagos
    pq = select(Payment).order_by(Payment.id.desc()).limit(limit)
    if not is_local and parking_id is None:
        pq = select(Payment).where(Payment.user_id == current_user.id).order_by(Payment.id.desc()).limit(limit)
    elif parking_id is not None:
        pq = select(Payment).where(Payment.reservation_id.in_(
            select(Reservation.id).where(Reservation.parking_id == parking_id)
        )).order_by(Payment.id.desc()).limit(limit)
    pres = await db.execute(pq)
    for p in pres.scalars().all():
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
            "operator": "Pasarela de Pagos",
            "role": "system",
            "user_id": p.user_id,
            "action": f"Liquidación {p.method or 'tarjeta'} ({p.currency})",
            "target": f"Pago #{p.id} — S/ {p.amount_cents/100:.2f} / {p.culqi_charge_id or '—'}",
            "severity": "Info",
            "ip": "Payment Gateway",
            "parking_id": pid,
            "parking_name": pname,
            "details": {
                "pago_id": p.id,
                "reserva_id": p.reservation_id,
                "monto": p.amount_cents / 100.0,
                "moneda": p.currency,
                "metodo": p.method,
                "charge_id": p.culqi_charge_id,
            },
            "_sort_ts": p.created_at if isinstance(p.created_at, datetime) else datetime.min,
        })

    # 4. Incidencias
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
            "role": "user",
            "user_id": inc.user_id,
            "action": f"Incidencia: {inc.category}",
            "target": f"{inc.description[:80]} @ {pname}",
            "severity": sev,
            "ip": f"parking:{inc.parking_id}",
            "parking_id": inc.parking_id,
            "parking_name": pname,
            "details": {
                "incidencia_id": inc.id,
                "categoria": inc.category,
                "estado": inc.status,
                "descripcion": inc.description,
                "nota_resolucion": inc.resolution_note,
            },
            "_sort_ts": inc.created_at if isinstance(inc.created_at, datetime) else datetime.min,
        })
        if inc.resolved_at:
            logs.append({
                "id": f"INC-{inc.id:04d}-R",
                "timestamp": _fmt(inc.resolved_at),
                "operator": "Supervisor / Personal",
                "role": "local",
                "user_id": None,
                "action": "Resolución de Incidencia",
                "target": f"{inc.resolution_note or 'Resuelta'} @ {pname}",
                "severity": "Info",
                "ip": f"parking:{inc.parking_id}",
                "parking_id": inc.parking_id,
                "parking_name": pname,
                "details": {
                    "incidencia_id": inc.id,
                    "nota_resolucion": inc.resolution_note,
                    "fecha_resolucion": _fmt(inc.resolved_at),
                },
                "_sort_ts": inc.resolved_at if isinstance(inc.resolved_at, datetime) else datetime.min,
            })

    # 5. Reseñas
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
            "role": "user",
            "user_id": rev.user_id,
            "action": f"Reseña {rev.rating}★",
            "target": f"{rev.comment[:80]} @ {pname}",
            "severity": "Info",
            "ip": f"parking:{rev.parking_id}",
            "parking_id": rev.parking_id,
            "parking_name": pname,
            "details": {
                "reseña_id": rev.id,
                "calificacion": rev.rating,
                "comentario": rev.comment,
                "respuesta": rev.response,
            },
            "_sort_ts": rev.created_at if isinstance(rev.created_at, datetime) else datetime.min,
        })
        if rev.response:
            logs.append({
                "id": f"REV-{rev.id:04d}-RP",
                "timestamp": _fmt(rev.created_at),
                "operator": "Admin Local",
                "role": "local",
                "user_id": None,
                "action": "Respuesta a Reseña",
                "target": f"{rev.response[:80]} @ {pname}",
                "severity": "Info",
                "ip": f"parking:{rev.parking_id}",
                "parking_id": rev.parking_id,
                "parking_name": pname,
                "details": {
                    "reseña_id": rev.id,
                    "respuesta": rev.response,
                },
                "_sort_ts": rev.created_at if isinstance(rev.created_at, datetime) else datetime.min,
            })

    # Filtrar por severidad si fue especificada
    if severity and severity.lower() not in ("all", "todos"):
        logs = [entry for entry in logs if str(entry.get("severity", "")).lower() == severity.lower()]

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
    for entry in logs:
        entry.pop("_sort_ts", None)

    return logs[:limit]
