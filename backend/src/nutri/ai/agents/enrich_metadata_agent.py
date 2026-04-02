import logging
from typing import List, Optional

from langchain_core.messages import HumanMessage, SystemMessage
from nutri.ai.llm_client import get_llm
from nutri.ai.system_prompt import SystemPrompt
from pydantic import BaseModel, Field

logger = logging.getLogger("nutri.ai.agents.enrich_metadata")


class AttributeMetadata(BaseModel):
    """Enriched medical/dietary metadata for a health condition or allergy."""

    safety_level: str = Field(
        description="Risk level: 'critical' (life-threatening), 'warning' (significant restriction), or 'info' (useful guidance)"
    )
    dietary_rules: List[str] = Field(
        description="Specific dietary rules to follow (e.g. 'Avoid all gluten-containing grains')"
    )
    foods_to_avoid: List[str] = Field(
        default_factory=list,
        description="Specific food items or categories to avoid",
    )
    foods_to_prioritize: List[str] = Field(
        default_factory=list,
        description="Food items or categories recommended for this condition",
    )
    general_advice: Optional[str] = Field(
        default=None,
        description="Brief general nutrition advice for this condition",
    )


class EnrichedMemberProfile(BaseModel):
    """Enriched metadata for all conditions of a single family member."""

    conditions_metadata: dict[str, AttributeMetadata] = Field(
        default_factory=dict,
        description="Map of condition name → enriched metadata",
    )
    allergies_metadata: dict[str, AttributeMetadata] = Field(
        default_factory=dict,
        description="Map of allergy name → enriched metadata",
    )


class EnrichMetadataAgent:
    """Agent that researches health conditions and allergies to generate
    structured dietary metadata for user profiles.

    Called as a background task after onboarding to enrich the health_profile
    JSON with actionable dietary rules, foods to avoid/prioritize, etc.
    """

    def __init__(self):
        self.llm = get_llm()

    async def enrich_condition(self, category: str, value: str) -> AttributeMetadata:
        """Enrich a single health condition or allergy with dietary metadata.

        Args:
            category: 'allergy' or 'condition'
            value: The specific condition/allergy name (e.g. 'Celiac Disease', 'Peanut allergy')
        """
        llm = self.llm.with_structured_output(AttributeMetadata)

        prompt = SystemPrompt(
            background=[
                "You are a clinical nutrition expert with deep knowledge of medical dietary requirements.",
                "Your job is to provide evidence-based, structured dietary metadata for specific health conditions and allergies.",
            ],
            steps=[
                f"Analyze the {category}: '{value}'",
                "Determine the safety_level based on medical severity:",
                "  - 'critical': Life-threatening (e.g. severe peanut allergy, celiac disease)",
                "  - 'warning': Significant dietary restriction needed (e.g. lactose intolerance, diabetes)",
                "  - 'info': Helpful guidance but not dangerous (e.g. mild preference, general wellness)",
                "List specific dietary rules that MUST be followed",
                "List specific foods/ingredients to AVOID",
                "List specific foods/ingredients to PRIORITIZE or recommend",
                "Provide brief general nutrition advice",
            ],
            output=[
                "Be specific and actionable — list actual food names, not vague categories",
                "dietary_rules should be clear instructions (e.g. 'Avoid all dairy products including milk, cheese, yogurt')",
                "foods_to_avoid and foods_to_prioritize should be specific items",
                "Keep general_advice concise (1-2 sentences)",
            ],
        )

        messages = [
            SystemMessage(content=str(prompt)),
            HumanMessage(content=f"Category: {category}\nValue: {value}"),
        ]

        try:
            result = await llm.ainvoke(messages)
            logger.info(
                "Enriched %s '%s' → safety=%s, rules=%d, avoid=%d, prioritize=%d",
                category,
                value,
                result.safety_level,
                len(result.dietary_rules),
                len(result.foods_to_avoid),
                len(result.foods_to_prioritize),
            )
            return result
        except Exception as e:
            logger.error("Failed to enrich %s '%s': %s", category, value, e)
            return AttributeMetadata(
                safety_level="info",
                dietary_rules=[],
                foods_to_avoid=[],
                foods_to_prioritize=[],
                general_advice=f"Could not retrieve metadata: {str(e)[:100]}",
            )

    async def enrich_member_profile(
        self,
        conditions: List[str],
        allergies: List[str],
    ) -> EnrichedMemberProfile:
        """Enrich all conditions and allergies for a single family member.

        Args:
            conditions: List of health conditions (e.g. ['Diabetes', 'High Blood Pressure'])
            allergies: List of allergies (e.g. ['Peanut', 'Gluten'])
        """
        import asyncio

        profile = EnrichedMemberProfile()

        # Process all conditions and allergies concurrently
        tasks = []
        task_keys = []

        for condition in conditions:
            tasks.append(self.enrich_condition("condition", condition))
            task_keys.append(("condition", condition))

        for allergy in allergies:
            tasks.append(self.enrich_condition("allergy", allergy))
            task_keys.append(("allergy", allergy))

        if not tasks:
            return profile

        results = await asyncio.gather(*tasks, return_exceptions=True)

        for (cat, name), result in zip(task_keys, results):
            if isinstance(result, Exception):
                logger.error("Exception enriching %s '%s': %s", cat, name, result)
                continue
            if cat == "condition":
                profile.conditions_metadata[name] = result
            else:
                profile.allergies_metadata[name] = result

        logger.info(
            "Enriched member profile | conditions=%d | allergies=%d",
            len(profile.conditions_metadata),
            len(profile.allergies_metadata),
        )
        return profile
