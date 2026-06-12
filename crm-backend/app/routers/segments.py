"""Segment CRUD + preview (count + sample of who matches a rule)."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Customer, Segment
from app.schemas import CustomerOut, SegmentCreateIn, SegmentPreviewIn
from app.services.segmentation import apply_rules

router = APIRouter(prefix="/segments", tags=["segments"])


@router.post("/preview")
def preview_segment(payload: SegmentPreviewIn, db: Session = Depends(get_db)):
    """Given a rule, return matching count + a small sample of customers."""
    rules = [r.model_dump() for r in payload.rules]
    try:
        q = apply_rules(db.query(Customer), rules)
    except ValueError as e:
        raise HTTPException(422, str(e))
    count = q.count()
    sample = q.order_by(Customer.total_spent.desc()).limit(5).all()
    return {
        "estimated_count": count,
        "sample": [CustomerOut.model_validate(c) for c in sample],
    }


@router.post("")
def create_segment(payload: SegmentCreateIn, db: Session = Depends(get_db)):
    """Persist a named audience definition."""
    rules = [r.model_dump() for r in payload.rules]
    try:
        apply_rules(db.query(Customer), rules)  # validate before saving
    except ValueError as e:
        raise HTTPException(422, str(e))
    seg = Segment(name=payload.name, description=payload.description, rule={"rules": rules})
    db.add(seg)
    db.commit()
    db.refresh(seg)
    return {"id": seg.id, "name": seg.name, "rules": rules}


@router.get("")
def list_segments(db: Session = Depends(get_db)):
    segs = db.query(Segment).order_by(Segment.created_at.desc()).all()
    return [{"id": s.id, "name": s.name, "description": s.description, "rule": s.rule} for s in segs]
