# Copyright (c) 2026 Nutri. All rights reserved.
from __future__ import annotations

import logging

from pydantic import Field, BaseModel
from langchain_core.messages import HumanMessage, SystemMessage

from nutri.ai.llm_client import get_llm
from nutri.ai.system_prompt import SystemPrompt


logger = logging.getLogger("nutri.ai.agents.fridge_check")


# --- Structured output models ---


class FridgeCheckItem(BaseModel):
    """LLM decision for a single grocery item."""

    name: str = Field(description="Name of grocery item")
    action: str = Field(
        description="'skip' if the fridge already has enough, 'buy' if more needs to be purchased"
    )
    buy_quantity: str = Field(
        default="",
        description=(
            "Amount/quantity TO BUY AFTER subtracting what is already in the fridge. "
            "Keep the original unit. Example: '300g', '2 items'. Leave empty if action='skip'."
        ),
    )
    fridge_has: str = Field(
        default="",
        description=(
            "What is available in the fridge that can be used for this dish, include name + quantity. "
            "Example: '200g beef'. Leave empty if the fridge has none."
        ),
    )
    reason: str = Field(
        default="",
        description="Brief explanation of why to skip or how much to buy.",
    )


class FridgeCheckResult(BaseModel):
    """Full deduction result from the agent."""

    items: list[FridgeCheckItem]


class FridgeCheckAgent:
    """Agent that compares a grocery shopping list against the user's fridge
    inventory and decides what still needs to be purchased.

    Uses LLM for intelligent fuzzy matching (e.g. "Thịt bò" ↔ "Thịt bò Úc"),
    unit conversion (kg ↔ g), and partial deduction.
    """

    def __init__(self) -> None:
        self.llm = get_llm().with_structured_output(FridgeCheckResult)

    async def acheck(
        self,
        grocery_items: list[dict],
        inventory_items: list[dict],
    ) -> FridgeCheckResult:
        """Compare grocery list against fridge inventory.

        Args:
            grocery_items: [{"name": "Thịt bò", "quantity": "500g"}, ...]
            inventory_items: [{"name": "Thịt bò Úc", "quantity": "1kg"}, ...]

        Returns:
            FridgeCheckResult with per-item buy/skip decisions.
        """
        if not grocery_items:
            return FridgeCheckResult(items=[])

        # If fridge is empty, skip LLM call — buy everything
        if not inventory_items:
            logger.info(
                "Fridge is empty, skipping LLM call — buy all %d items",
                len(grocery_items),
            )
            return FridgeCheckResult(
                items=[
                    FridgeCheckItem(
                        name=g["name"],
                        action="buy",
                        buy_quantity=str(g.get("quantity") or ""),
                        fridge_has="",
                        reason="Fridge is empty",
                    )
                    for g in grocery_items
                ]
            )

        # Build text representations
        grocery_text = "\n".join(
            f"  [{i}] {g['name']} — need: {g.get('quantity', 'unknown')}"
            for i, g in enumerate(grocery_items)
        )

        fridge_text = "\n".join(
            f"  - {inv['name']}: {inv.get('quantity', 'unknown')}"
            for inv in inventory_items
        )

        prompt = SystemPrompt(
            background=[
                "You are a smart shopping assistant.",
                "Your task is to compare the GROCERY LIST with the CURRENT FRIDGE, decide what needs to be purchased.",
            ],
            steps=[
                "Match each grocery item with the items in the fridge.",
                "Match ingredient names FLEXIBLY (e.g., 'Beef' matches 'Australian Beef', 'Lemon' matches 'Fresh Lemon', 'Eggs' matches 'Chicken Eggs').",
                "BUT DO NOT match different types of ingredients (e.g., 'Chicken' does NOT match 'Beef', 'Milk' does NOT match 'Yogurt').",
                "CONVERT units when needed (1kg = 1000g, 1L = 1000ml, ...).",
                "If the fridge has ENOUGH or MORE → action = 'skip'.",
                "If the fridge has SOME but NOT ENOUGH → action = 'buy', buy_quantity = amount to buy MORE (after deduction).",
                "If the fridge has NONE → action = 'buy', buy_quantity = original quantity.",
            ],
            output=[
                f"Return EXACTLY {len(grocery_items)} items, keep the same order as the grocery list.",
                "buy_quantity must include the original unit (e.g., '300g', '2 items', '500ml').",
                "fridge_has should clearly state what is available in the fridge (e.g., '200g beef'), leave empty if none.",
            ],
        )

        messages = [
            SystemMessage(content=str(prompt)),
            HumanMessage(
                content=(
                    f"## GROCERY LIST (from menu):\n{grocery_text}\n\n"
                    f"## CURRENT FRIDGE:\n{fridge_text}"
                )
            ),
        ]

        try:
            logger.info(
                "FridgeCheckAgent.acheck | grocery=%d | fridge=%d",
                len(grocery_items),
                len(inventory_items),
            )

            result = await self.llm.ainvoke(messages)

            # Validate output length
            if len(result.items) != len(grocery_items):
                logger.warning(
                    "LLM returned %d items but expected %d, padding/trimming",
                    len(result.items),
                    len(grocery_items),
                )
                while len(result.items) < len(grocery_items):
                    idx = len(result.items)
                    result.items.append(
                        FridgeCheckItem(
                            name=grocery_items[idx]["name"],
                            action="buy",
                            buy_quantity=str(
                                grocery_items[idx].get("quantity") or ""
                            ),
                            fridge_has="",
                            reason="Fallback — LLM output mismatch",
                        )
                    )
                result.items = result.items[: len(grocery_items)]

            skip_count = sum(1 for i in result.items if i.action == "skip")
            buy_count = sum(1 for i in result.items if i.action == "buy")

            logger.info(
                "FridgeCheckAgent.acheck done | skip=%d | buy=%d",
                skip_count,
                buy_count,
            )
            for item in result.items:
                logger.debug(
                    "  [%s] %s | buy=%s | fridge=%s | %s",
                    item.action.upper(),
                    item.name,
                    item.buy_quantity,
                    item.fridge_has,
                    item.reason,
                )

            return result

        except Exception as e:
            logger.exception("FridgeCheckAgent.acheck failed")
            # Fallback: buy everything
            return FridgeCheckResult(
                items=[
                    FridgeCheckItem(
                        name=g["name"],
                        action="buy",
                        buy_quantity=str(g.get("quantity") or ""),
                        fridge_has="",
                        reason=f"LLM error fallback: {str(e)[:80]}",
                    )
                    for g in grocery_items
                ]
            )
