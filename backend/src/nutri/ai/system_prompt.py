# Copyright (c) 2026 Nutri. All rights reserved.
from __future__ import annotations


class SystemPrompt:
    """A utility class to construct structured system prompts."""

    def __init__(
        self,
        background: list[str],
        context: list[str] | None = None,
        steps: list[str] | None = None,
        output: list[str] | None = None,
        tools_usage: list[str] | None = None,
    ) -> None:
        self.background = background
        self.context = context or []
        self.steps = steps or []
        self.output = output or []
        self.tools_usage = tools_usage or []

    def __str__(self) -> str:
        """Convert the system prompt to a string."""
        prompt = "# IDENTITY AND PURPOSE\n" + "\n".join(self.background)

        if self.context:
            prompt += "\n\n# CONTEXT\n" + "\n".join(self.context)

        if self.steps:
            prompt += "\n\n# INTERNAL ASSISTANT STEPS\n" + "\n".join(self.steps)

        if self.output:
            prompt += "\n\n# OUTPUT INSTRUCTIONS\n - " + "\n - ".join(
                self.output
            )

        if self.tools_usage:
            prompt += "\n\n# TOOLS USAGE RULES\n - " + "\n - ".join(
                self.tools_usage
            )

        return prompt
