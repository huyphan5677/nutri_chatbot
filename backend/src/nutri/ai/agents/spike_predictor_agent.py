# Copyright (c) 2026 Nutri. All rights reserved.
from __future__ import annotations

from pydantic import Field, BaseModel
from langchain_core.messages import HumanMessage, SystemMessage

from nutri.ai.llm_client import get_llm
from nutri.ai.system_prompt import SystemPrompt


class SpikePredictionData(BaseModel):
    food: str
    risk_level: str = Field(description="'low', 'medium', or 'high'")
    estimated_gl: str | None = Field(description="Estimated Glycemic Load")
    explanation: str
    smart_fix: str | None = Field(
        description="Suggestions to reduce the spike like adding fiber/protein"
    )
    spike_reduction_percentage: int | None = None


class SpikePredictorAgent:
    """Stateless agent predicting the glucose spike risk of certain foods."""

    def __init__(self) -> None:
        self.llm = get_llm().with_structured_output(SpikePredictionData)

    def predict(self, food: str) -> SpikePredictionData:
        """Predicts the glucose spike risk of certain foods."""
        prompt = SystemPrompt(
            background=[
                "You are an expert in Glycemic Index (GI) and Glycemic Load (GL).",
                "You recognize 'buffers' like protein, fat, and fiber that slow down sugar absorption.",
            ],
            steps=[
                "If query has 'vs/versus', compare 2 items.",
                "Identify GI/GL.",
                "Identify buffers.",
                "Calculate Risk Level.",
                "Provide a Smart Fix.",
            ],
            output=[
                "Return valid JSON data matching the schema strictly without markdown code blocks."
            ],
        )

        messages = [
            SystemMessage(content=str(prompt)),
            HumanMessage(content=food),
        ]

        return self.llm.invoke(messages)
