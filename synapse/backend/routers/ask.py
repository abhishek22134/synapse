from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from services.answerer import answer_question

router = APIRouter(prefix="/ask", tags=["ask"])


class AskRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=1000)
    org_id: str = "default"


@router.post("")
async def ask(body: AskRequest):
    if not body.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    return await answer_question(question=body.question, org_id=body.org_id)
