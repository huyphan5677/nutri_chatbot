import { api } from "@/shared/api/client";

export interface GroceryItemDTO {
  id: string;
  name: string;
  category: string;
  quantity: string;
  is_purchased: boolean;
}

export interface GroceryListResponse {
  items: GroceryItemDTO[];
}

export interface GroceryMenuGroupDTO {
  meal_plan_id?: string | null;
  meal_plan_name: string;
  start_date?: string | null;
  end_date?: string | null;
  status?: string | null;
  items: GroceryItemDTO[];
}

export interface GroceryByMenuResponse {
  menus: GroceryMenuGroupDTO[];
}

export interface UpdateGroceryItemPayload {
  name?: string;
  category?: string;
  quantity?: string;
  is_purchased?: boolean;
}

export const groceryApi = {
  getCurrentGroceryList: async (): Promise<GroceryListResponse> => {
    const response = await api.get("/grocery/current");
    return response.data;
  },

  getGroceryByMenu: async (): Promise<GroceryByMenuResponse> => {
    const response = await api.get("/grocery/by-menu");
    return response.data;
  },

  deleteGroceryItem: async (id: string): Promise<void> => {
    await api.delete(`/grocery/${id}`);
  },

  deleteGroceryByMenu: async (mealPlanId: string): Promise<void> => {
    await api.delete(`/grocery/by-menu/${mealPlanId}`);
  },

  updateGroceryItem: async (
    id: string,
    payload: UpdateGroceryItemPayload,
  ): Promise<GroceryItemDTO> => {
    const response = await api.patch(`/grocery/${id}`, payload);
    return response.data;
  },

  // ----- Store listing -----

  getLotteBranches: async (): Promise<LotteBranch[]> => {
    const response = await api.get("/grocery/stores/lotte");
    return response.data;
  },

  getWinmartProvinces: async (): Promise<string[]> => {
    const response = await api.get("/grocery/stores/winmart/provinces");
    return response.data;
  },

  getWinmartStores: async (province: string): Promise<WinmartStore[]> => {
    const response = await api.get("/grocery/stores/winmart", {
      params: { province },
    });
    return response.data;
  },

  // ----- Shopping -----

  startShopping: async (
    payload: ShoppingRequest,
  ): Promise<ShoppingOrderStartResponse> => {
    const response = await api.post("/grocery/shopping/start", payload);
    return response.data;
  },

  getShoppingOrder: async (orderId: string): Promise<ShoppingOrderResponse> => {
    const response = await api.get(`/grocery/shopping/order/${orderId}`);
    return response.data;
  },

  getLatestShoppingOrder: async (
    mealPlanId: string,
  ): Promise<ShoppingOrderResponse | null> => {
    try {
      const response = await api.get<ShoppingOrderResponse>(
        `/grocery/shopping/latest/${mealPlanId}`,
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },
};

// -----
// Types
// -----

export interface LotteBranch {
  code: string;
  name: string;
}

export interface WinmartStore {
  storeCode: string;
  storeName: string;
  storeGroupCode: string;
  officeAddress: string;
  districtTitle: string;
  wardTitle: string;
}

export type ShoppingStrategy =
  | "lotte_priority"
  | "winmart_priority"
  | "cost_optimized";

export interface ShoppingRequest {
  meal_plan_id: string;
  strategy: ShoppingStrategy;
  lotte_branch_id: string;
  winmart_store_code: string;
  winmart_store_group_code: string;
}

export interface FridgeCoveredDTO {
  name: string;
  fridge_quantity: string;
  required_quantity: string;
}

export interface ShoppingProductDTO {
  ingredient_name: string;
  quantity?: string | null;
  required_quantity?: string | null;
  package_size?: string | null;
  fridge_quantity?: string | null;
  fridge_deducted?: string | null;
  original_quantity?: string | null;
  buy_quantity?: number;
  product_name: string;
  price?: number | null;
  stock?: number;
  product_url: string;
  source_mart: string;
  description: string;
}

export interface ShoppingResultDTO {
  items: ShoppingProductDTO[];
  not_found: string[];
  fridge_covered: FridgeCoveredDTO[];
  total_estimated_cost: number;
  strategy: string;
  summary: string;
}

export interface ShoppingOrderStartResponse {
  order_id: string;
  status: string;
  message: string;
}

export interface ShoppingOrderResponse {
  order_id: string;
  status: string; // "processing" | "completed" | "failed"
  result_data: ShoppingResultDTO | null;
}
