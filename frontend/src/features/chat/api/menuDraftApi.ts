import { api } from "@/shared/api/client";

export interface EditDishPayload {
  action: "swap" | "add";
  meal_type: string;
  day_number: number;
  custom_prompt: string;
  original_dish_name?: string;
  current_menu_summary: string;
}

export interface EditDishMeal {
  name: string;
  description?: string;
  instructions: string[];
  per_person_breakdown: string[];
  adjustment_tips: string[];
  why?: string;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  calories: number;
  protein_grams: number;
  carbs_grams: number;
  fat_grams: number;
  fiber_grams: number;
  dietary_tags: string[];
  ingredients: string[];
  meal_type: string;
  servings?: number;
}

export interface EditDishResponse {
  status: "success" | "error";
  action: string;
  meal: EditDishMeal | null;
  error?: string;
}

export const menuDraftApi = {
  editDish: async (payload: EditDishPayload): Promise<EditDishResponse> => {
    const response = await api.post("/draft/edit-dish", payload);
    return response.data;
  },
};
