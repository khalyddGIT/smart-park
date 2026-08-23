"""Finanzas de plataforma — agregación honesta de reservas para rol platform.

Solo lectura. No inventa pagos bancarios; deriva todo de `reservas` y `estacionamientos`.
La transferencia real se gestiona fuera de la plataforma.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import get_db
from app.models.models import Reservation, Parking, User
from app.core.security import require_role

router = APIRouter(prefix="/finances", tags=["Finanzas Plataforma"])

platform_required = require_role("platform")

COMISION_RATE = 0.12


class SedeFinanzas(BaseModel):
    parking_id: int
    parking_name: str
    total_reservas: int
    recaudacion_bruta: float
    comision_12: float
    neto_a_liquidar: float
    reservas_completed: int = 0
    recaudacion_completed: float = 0.0
    # Datos bancarios no existen aún en BD — honestidad
    banco_estado: str = "pendiente de completar"


class TotalesGlobales(BaseModel):
    recaudacion_bruta_global: float
    comision_liquida_global: float
    a_liquidar_global: float
    total_reservas_global: int
    liquidados_global: float  # suma bruta con status completed
    liquidados_count: int = 0
    pendiente_bruta_global: float = 0.0


class SummaryResponse(BaseModel):
    por_sede: List[SedeFinanzas]
    totales: TotalesGlobales
    nota: str


@router.get("/summary", response_model=SummaryResponse)
async def finances_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(platform_required),
):
    # Traer todos los parkings y todas las reservas sin filtro de usuario (solo platform)
    park_res = await db.execute(select(Parking).order_by(Parking.id.asc()))
    parkings: List[Parking] = park_res.scalars().all()

    res = await db.execute(select(Reservation))
    all_reservations: List[Reservation] = res.scalars().all()

    # Excluir canceladas del cómputo financiero (no generan ingreso)
    valid = [r for r in all_reservations if (r.status or "").lower() != "cancelled"]

    # Agrupar por parking_id
    from collections import defaultdict
    by_parking: dict[int, list] = defaultdict(list)
    for r in valid:
        by_parking[r.parking_id].append(r)

    por_sede: List[SedeFinanzas] = []
    for p in parkings:
        lst = by_parking.get(p.id, [])
        bruta = round(sum(float(r.total_cost or 0) for r in lst), 2)
        comision = round(bruta * COMISION_RATE, 2)
        neto = round(bruta * (1 - COMISION_RATE), 2)
        completed_lst = [r for r in lst if (r.status or "").lower() == "completed"]
        recaud_completed = round(sum(float(r.total_cost or 0) for r in completed_lst), 2)
        por_sede.append(
            SedeFinanzas(
                parking_id=p.id,
                parking_name=p.name,
                total_reservas=len(lst),
                recaudacion_bruta=bruta,
                comision_12=comision,
                neto_a_liquidar=neto,
                reservas_completed=len(completed_lst),
                recaudacion_completed=recaud_completed,
                banco_estado="pendiente de completar",
            )
        )

    # Reservas huérfanas (parking borrado) — igual se reportan para no ocultar dinero
    known_ids = {p.id for p in parkings}
    for pid, lst in by_parking.items():
        if pid not in known_ids:
            bruta = round(sum(float(r.total_cost or 0) for r in lst), 2)
            comision = round(bruta * COMISION_RATE, 2)
            neto = round(bruta * (1 - COMISION_RATE), 2)
            completed_lst = [r for r in lst if (r.status or "").lower() == "completed"]
            recaud_completed = round(sum(float(r.total_cost or 0) for r in completed_lst), 2)
            por_sede.append(
                SedeFinanzas(
                    parking_id=pid,
                    parking_name=f"Sede #{pid} (eliminada)",
                    total_reservas=len(lst),
                    recaudacion_bruta=bruta,
                    comision_12=comision,
                    neto_a_liquidar=neto,
                    reservas_completed=len(completed_lst),
                    recaudacion_completed=recaud_completed,
                    banco_estado="pendiente de completar",
                )
            )

    # Orden: mayor recaudación primero (útil para priorizar liquidaciones)
    por_sede.sort(key=lambda x: x.recaudacion_bruta, reverse=True)

    bruta_global = round(sum(s.recaudacion_bruta for s in por_sede), 2)
    comision_global = round(sum(s.comision_12 for s in por_sede), 2)
    neto_global = round(sum(s.neto_a_liquidar for s in por_sede), 2)
    liquidados_global = round(sum(s.recaudacion_completed for s in por_sede), 2)
    liquidados_count = sum(s.reservas_completed for s in por_sede)
    total_reservas_global = sum(s.total_reservas for s in por_sede)
    pendiente_bruta = round(bruta_global - liquidados_global, 2)

    return SummaryResponse(
        por_sede=por_sede,
        totales=TotalesGlobales(
            recaudacion_bruta_global=bruta_global,
            comision_liquida_global=comision_global,
            a_liquidar_global=neto_global,
            total_reservas_global=total_reservas_global,
            liquidados_global=liquidados_global,
            liquidados_count=liquidados_count,
            pendiente_bruta_global=pendiente_bruta,
        ),
        nota="Datos bancarios (RUC/CCI/cuenta) aún sin tabla en BD; se muestran como pendiente de completar. Comisión fija 12%. Canceladas excluidas. Liquidación bancaria fuera de plataforma.",
    )
