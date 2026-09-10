from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import get_db
from app.models.models import Review, Parking, User, Staff
from app.schemas.schemas import ReviewCreate, ReviewReply, ReviewResponse, ReviewVisibilityUpdate
from app.core.security import get_current_user, get_optional_user, require_role
from app.core.realtime import realtime

router = APIRouter(prefix="/reviews", tags=["Reseñas & Calificaciones"])

# Responder o moderar reseñas es función del Admin Local o Super Admin
admin_required = require_role("local", "platform")

@router.get("", response_model=List[ReviewResponse])
async def list_reviews(
    parking_id: Optional[int] = None,
    min_rating: Optional[int] = None,
    is_hidden: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    stmt = select(Review).order_by(Review.id.desc())
    if parking_id:
        stmt = stmt.where(Review.parking_id == parking_id)
    if min_rating:
        stmt = stmt.where(Review.rating >= min_rating)
    
    # Privacidad: Usuarios regulares o no autenticados NUNCA ven reseñas ocultadas/desactivadas
    if not current_user or current_user.role == "user":
        stmt = stmt.where(Review.is_hidden.is_(False))
    else:
        # Administradores: pueden filtrar por visibilidad o ver todas por defecto
        if is_hidden is not None:
            stmt = stmt.where(Review.is_hidden == is_hidden)

    result = await db.execute(stmt)
    reviews = result.scalars().all()
    return [ReviewResponse.model_validate(r) for r in reviews]

@router.post("", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_review(
    review_in: ReviewCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verificar parking
    p_res = await db.execute(select(Parking).where(Parking.id == review_in.parking_id))
    if not p_res.scalars().first():
        raise HTTPException(status_code=404, detail="Estacionamiento no encontrado")

    if review_in.rating < 1 or review_in.rating > 5:
        raise HTTPException(status_code=400, detail="La calificación debe estar entre 1 y 5 estrellas")

    db_review = Review(
        parking_id=review_in.parking_id,
        user_id=current_user.id,
        user_name=current_user.full_name,
        rating=review_in.rating,
        comment=review_in.comment,
        is_hidden=False
    )
    db.add(db_review)
    await db.commit()
    try:
        await realtime.broadcast("reviews:updated")
    except Exception:
        pass
    await db.refresh(db_review)
    return ReviewResponse.model_validate(db_review)

@router.put("/{review_id}/reply", response_model=ReviewResponse)
async def reply_review(
    review_id: int,
    reply_in: ReviewReply,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalars().first()
    if not review:
        raise HTTPException(status_code=404, detail="Reseña no encontrada")

    if current_user.role == "local" and current_user.email != "adminlocal@smartpark.com":
        p_res = await db.execute(select(Parking).where(Parking.id == review.parking_id))
        parking = p_res.scalars().first()
        staff_res = await db.execute(
            select(Staff).where(
                Staff.parking_id == review.parking_id,
                func.lower(Staff.email) == current_user.email.strip().lower(),
                Staff.status == "active"
            )
        )
        has_staff = staff_res.scalars().first() is not None
        parking_matches = parking and parking.email and parking.email.strip().lower() == current_user.email.strip().lower()
        if not parking_matches and not has_staff:
            raise HTTPException(status_code=403, detail="No tienes permiso para responder reseñas de esta cochera")

    review.response = reply_in.response
    await db.commit()
    try:
        await realtime.broadcast("reviews:updated")
    except Exception:
        pass
    await db.refresh(review)
    return ReviewResponse.model_validate(review)

@router.put("/{review_id}/visibility", response_model=ReviewResponse)
async def toggle_review_visibility(
    review_id: int,
    visibility_in: ReviewVisibilityUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalars().first()
    if not review:
        raise HTTPException(status_code=404, detail="Reseña no encontrada")

    if current_user.role == "local" and current_user.email != "adminlocal@smartpark.com":
        p_res = await db.execute(select(Parking).where(Parking.id == review.parking_id))
        parking = p_res.scalars().first()
        staff_res = await db.execute(
            select(Staff).where(
                Staff.parking_id == review.parking_id,
                func.lower(Staff.email) == current_user.email.strip().lower(),
                Staff.status == "active"
            )
        )
        has_staff = staff_res.scalars().first() is not None
        parking_matches = parking and parking.email and parking.email.strip().lower() == current_user.email.strip().lower()
        if not parking_matches and not has_staff:
            raise HTTPException(status_code=403, detail="No tienes permiso para modificar la visibilidad de esta reseña")

    review.is_hidden = visibility_in.is_hidden
    await db.commit()
    try:
        await realtime.broadcast("reviews:updated")
    except Exception:
        pass
    await db.refresh(review)
    return ReviewResponse.model_validate(review)

@router.delete("/{review_id}", status_code=status.HTTP_200_OK)
async def delete_review(
    review_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalars().first()
    if not review:
        raise HTTPException(status_code=404, detail="Reseña no encontrada")
    # Solo el autor de la reseña o el Super Admin pueden eliminarla
    if review.user_id != current_user.id and current_user.role != "platform":
        raise HTTPException(status_code=403, detail="No autorizado para eliminar esta reseña")

    await db.delete(review)
    await db.commit()
    try:
        await realtime.broadcast("reviews:updated")
    except Exception:
        pass
    return {"status": "success", "message": f"Reseña {review_id} eliminada"}
