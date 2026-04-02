from typing import List


class SystemPrompt:
    """
    A utility class to construct structured system prompts similar to the Neuorn-AI inspired
    version in the Plate project.
    """

    def __init__(
        self,
        background: List[str],
        context: List[str] = None,
        steps: List[str] = None,
        output: List[str] = None,
        tools_usage: List[str] = None,
    ):
        self.background = background
        self.context = context or []
        self.steps = steps or []
        self.output = output or []
        self.tools_usage = tools_usage or []

    def __str__(self) -> str:
        prompt = "# IDENTITY AND PURPOSE\n" + "\n".join(self.background)

        if self.context:
            prompt += "\n\n# CONTEXT\n" + "\n".join(self.context)

        if self.steps:
            prompt += "\n\n# INTERNAL ASSISTANT STEPS\n" + "\n".join(self.steps)

        if self.output:
            prompt += "\n\n# OUTPUT INSTRUCTIONS\n - " + "\n - ".join(self.output)

        if self.tools_usage:
            prompt += "\n\n# TOOLS USAGE RULES\n - " + "\n - ".join(self.tools_usage)

        return prompt
