"""RFM endpoints — segment distribution, the R×F heatmap grid, and recompute."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.rfm import RFM_SEGMENTS, recompute_rfm, rfm_summary

router = APIRouter(prefix="/rfm", tags=["rfm"])


@router.get("/summary")
def summary(db: Session = Depends(get_db)):
    return {"order": RFM_SEGMENTS, **rfm_summary(db)}


@router.post("/recompute")
def recompute(db: Session = Depends(get_db)):
    """Recompute scores across the whole base (run after ingesting new data)."""
    n = recompute_rfm(db)
    return {"recomputed": n}
