from fastapi import APIRouter

router = APIRouter()

DEPARTMENT_BUDGETS = {
    "hardware": True,
    "design": True,
    "engineering": True,
    "hr": False,
    "finance": False,
}


@router.get("/budget")
def get_budget_approval(department: str):
    approved = DEPARTMENT_BUDGETS.get(department.lower(), False)
    return {"department": department, "approved": approved}
