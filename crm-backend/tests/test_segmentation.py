import pytest
from app.services.segmentation import build_filters, _days_since_filter

def test_build_filters_valid():
    rules = [
        {"field": "total_spent", "op": "gt", "value": 1000},
        {"field": "lifecycle_stage", "op": "eq", "value": "active"},
        {"field": "city", "op": "in", "value": ["Mumbai", "Delhi"]}
    ]
    filters = build_filters(rules)
    assert len(filters) == 3

def test_build_filters_invalid_field():
    rules = [
        {"field": "unknown_field", "op": "eq", "value": 1}
    ]
    with pytest.raises(ValueError, match="Field not segmentable: unknown_field"):
        build_filters(rules)

def test_build_filters_invalid_op():
    rules = [
        {"field": "total_spent", "op": "contains", "value": 1000}
    ]
    with pytest.raises(ValueError, match="Unsupported op: contains"):
        build_filters(rules)

def test_days_since_last_order():
    # gt means more than N days -> older than cutoff
    f1 = _days_since_filter("gt", 30)
    assert f1 is not None
    
    # lt means fewer than N days -> more recent than cutoff
    f2 = _days_since_filter("lt", 10)
    assert f2 is not None

def test_in_operator_requires_list():
    rules = [
        {"field": "city", "op": "in", "value": "Mumbai"}
    ]
    with pytest.raises(ValueError, match="'in' requires a list value"):
        build_filters(rules)
