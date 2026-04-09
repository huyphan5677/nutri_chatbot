import { api } from "@/shared/api/client";

export interface RecipeDTO {
  id: string;
  name: string;
  description?: string;
  instructions?: string;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  total_calories?: number;
  dietary_tags?: string[];
  macros?: Record<string, number>;
  ingredients?: Array<{
    name: string;
    quantity?: number;
  }>;
}

export interface MealDTO {
  id: string;
  eat_date: string;
  meal_type: string;
  recipe: RecipeDTO;
}

export interface MealPlanResponse {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  meals: MealDTO[];
}

export interface MealPlanSummary {
  id: string;
  name?: string;
  start_date: string;
  end_date: string;
  status?: string;
}

export interface SaveMenuFromChatResponse {
  status: "saved" | "already_saved";
  meal_plan_id?: string;
  shopping_list?: Array<{
    name: string;
    category?: string | null;
    quantity: string;
  }>;
}

export interface UpdateCurrentMenuPayload {
  name?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  total_days?: number;
  total_meals?: number;
}

export interface DeleteCurrentMenuResponse {
  status: "deleted";
  meal_plan_id: string;
}

export const menuApi = {
  getCurrentMenu: async (): Promise<MealPlanResponse> => {
    const response = await api.get("/menus/current");
    return response.data;
  },

  getMenus: async (): Promise<MealPlanSummary[]> => {
    const response = await api.get("/menus");
    return response.data;
  },

  getMenuById: async (menuId: string): Promise<MealPlanResponse> => {
    const response = await api.get(`/menus/${menuId}`);
    return response.data;
  },

  saveMenuFromChat: async (
    chatMessageId: string,
    modifiedDraft?: any,
  ): Promise<SaveMenuFromChatResponse> => {
    const payload: any = { chat_message_id: chatMessageId };
    if (modifiedDraft) {
      payload.modified_draft = modifiedDraft;
    }
    const response = await api.post("/menus/save-from-chat", payload);
    return response.data;
  },

  updateCurrentMenu: async (
    payload: UpdateCurrentMenuPayload,
  ): Promise<MealPlanResponse> => {
    const response = await api.patch("/menus/current", payload);
    return response.data;
  },

  updateMenuById: async (
    menuId: string,
    payload: UpdateCurrentMenuPayload,
  ): Promise<MealPlanResponse> => {
    const response = await api.patch(`/menus/${menuId}`, payload);
    return response.data;
  },

  deleteCurrentMenu: async (): Promise<DeleteCurrentMenuResponse> => {
    const response = await api.delete("/menus/current");
    return response.data;
  },

  deleteMenuById: async (
    menuId: string,
  ): Promise<DeleteCurrentMenuResponse> => {
    const response = await api.delete(`/menus/${menuId}`);
    return response.data;
  },
};
