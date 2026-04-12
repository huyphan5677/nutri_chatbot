export interface DraftMeal {
  id: string;
  name: string;
  meal_type: string; // breakfast | lunch | dinner | snack
  calories: number;
  protein_grams: number;
  carbs_grams: number;
  fat_grams: number;
  fiber_grams?: number;
  ingredients: string[];
  instructions?: string[];
  description?: string;
  why?: string;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  servings?: number;
  dietary_tags?: string[];
  per_person_breakdown?: string[];
  adjustment_tips?: string[];
  isLoading?: boolean;
}

export interface DraftDay {
  day_number: number;
  eat_date: string;
  day_header?: string;
  meals: DraftMeal[];
}

export interface MenuDraftState {
  draft_id: string;
  total_days: number;
  name: string;
  start_date: string;
  end_date: string;
  days: DraftDay[];
  saved: boolean;
  is_modified?: boolean;
}

export function parseDraftPayload(raw: Record<string, any>): MenuDraftState {
  let idCounter = 0;

  const days: DraftDay[] = (raw.days || []).map((day: any) => ({
    day_number: day.day_number,
    eat_date: day.eat_date || "",
    day_header: day.day_header,
    meals: (day.meals || []).map((meal: any) => ({
      id: `draft-meal-${++idCounter}-${Date.now()}`,
      name: meal.name || "Unknown",
      meal_type: meal.meal_type || "lunch",
      calories: Number(meal.calories) || 0,
      protein_grams: Number(meal.protein_grams) || 0,
      carbs_grams: Number(meal.carbs_grams) || 0,
      fat_grams: Number(meal.fat_grams) || 0,
      fiber_grams:
        meal.fiber_grams != null ? Number(meal.fiber_grams) : undefined,
      ingredients: meal.ingredients || [],
      instructions: meal.instructions,
      description: meal.description,
      why: meal.why,
      prep_time_minutes: meal.prep_time_minutes,
      cook_time_minutes: meal.cook_time_minutes,
      servings: meal.servings,
      dietary_tags: meal.dietary_tags,
      per_person_breakdown: meal.per_person_breakdown,
      adjustment_tips: meal.adjustment_tips,
      isLoading: false,
    })),
  }));

  return {
    draft_id: raw.draft_id || "",
    total_days: raw.total_days || days.length,
    name: raw.name || "Menu",
    start_date: raw.start_date || "",
    end_date: raw.end_date || "",
    days,
    saved: raw.saved || false,
    is_modified: raw.is_modified || false,
  };
}

export function buildMenuSummary(state: MenuDraftState): string {
  return state.days
    .map((day) => {
      const header = day.day_header || `Day ${day.day_number}`;
      const meals = day.meals
        .map((m) => `${m.meal_type}: ${m.name}`)
        .join(", ");
      return `${header}: ${meals}`;
    })
    .join("\n");
}
