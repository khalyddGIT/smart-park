from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import get_db
from app.models.models import Review, Parking, User
from app.schemas.schemas import ReviewCreate, ReviewReply, ReviewResponse
from app.core.security import get_current_user, require_role

router = APIRouter(prefix="/reviews", tags=["Reseñas & Calificaciones"])

# Responder reseñas es función del Admin Local o Super Admin
admin_required = require_role("local", "platform")

@router.get("", response_model=List[ReviewResponse])
async def list_reviews(
    parking_id: Optional[int] = None,
    min_rating: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Review).order_by(Review.id.desc())
    if parking_id:
        stmt = stmt.where(Review.parking_id == parking_id)
    if min_rating:
        stmt = stmt.where(Review.rating >= min_rating)
    
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
        comment=review_in.comment
    )
    db.add(db_review)
    await db.commit()
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

    review.response = reply_in.response
    await db.commit()
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
    return {"status": "success", "message": f"Reseña {review_id} eliminada"}
