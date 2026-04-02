import { api } from "@/shared/api/client";

export interface InventoryItemDTO {
  id: string;
  name: string;
  category: string;
  quantity: string;
  expiration_date: string | null;
}

export interface InventoryListResponse {
  items: InventoryItemDTO[];
}

export interface AddInventoryItemRequest {
  name: string;
  category?: string;
  quantity?: string;
  expiration_date?: string | null;
}

export interface UpdateInventoryItemPayload {
  name?: string;
  category?: string;
  quantity?: string;
  expiration_date?: string | null;
}

export interface BulkAddInventoryRequest {
  items: AddInventoryItemRequest[];
}

export interface RenameCategoryRequest {
  old_name: string;
  new_name: string;
}

export const inventoryApi = {
  getCurrentInventory: async (): Promise<InventoryListResponse> => {
    const response = await api.get("/inventory/current");
    return response.data;
  },

  addInventoryItem: async (
    item: AddInventoryItemRequest,
  ): Promise<InventoryItemDTO> => {
    const response = await api.post("/inventory", item);
    return response.data;
  },

  bulkAddInventory: async (
    payload: BulkAddInventoryRequest,
  ): Promise<InventoryListResponse> => {
    const response = await api.post("/inventory/bulk", payload);
    return response.data;
  },

  updateInventoryItem: async (
    id: string,
    payload: UpdateInventoryItemPayload,
  ): Promise<InventoryItemDTO> => {
    const response = await api.patch(`/inventory/${id}`, payload);
    return response.data;
  },

  deleteInventoryItem: async (id: string): Promise<void> => {
    await api.delete(`/inventory/${id}`);
  },

  renameCategory: async (params: RenameCategoryRequest): Promise<{ status: string; count: number }> => {
    const response = await api.patch("/inventory/categories/rename", params);
    return response.data;
  },
};
