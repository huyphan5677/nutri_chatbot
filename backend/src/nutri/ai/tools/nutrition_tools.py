from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool
from nutri.ai.agents.spike_predictor_agent import SpikePredictorAgent
from nutri.ai.language import get_language_from_config


@tool
def predict_glucose_spike(food_description: str, *, config: RunnableConfig) -> str:
    """
    Predict the likelihood of a glucose spike from a given food or meal.
    Args:
        food_description: Details of the food or meal (e.g., 'A bowl of white rice', 'Burger vs Salad').
    """
    language = get_language_from_config(config)
    agent = SpikePredictorAgent()
    result = agent.predict(food_description)
    return (
        f"Risk Level: {result.risk_level}. GL: {result.estimated_gl}. "
        f"{result.explanation} Fix: {result.smart_fix}. "
        f"Target response language code: {language}."
    )


@tool
def calculate_bmr(weight: float, height: float, age: int, gender: str) -> float:
    """
    Calculate Basal Metabolic Rate (BMR) using Harris-Benedict equation.
    Args:
        weight: Weight in kilograms.
        height: Height in centimeters.
        age: Age in years.
        gender: Gender ('male' or 'female').
    """
    if gender == "male":
        return 10 * weight + 6.25 * height - 5 * age + 5
    else:
        return 10 * weight + 6.25 * height - 5 * age - 161
