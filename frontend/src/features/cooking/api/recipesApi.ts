export interface Recipe {
  id: string;
  name: string;
  description: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  total_calories: number | null;
  type: string | null;
  image_url: string | null;
  instructions: string | null;
  source_url: string | null;
}

export interface RecipeSearchResponse {
  recipes: Recipe[];
  total: number;
}

export interface Collection {
  id: string;
  name: string;
  is_default: boolean;
  recipe_count: number;
}

const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem("nutri_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

export const searchRecipes = async (
  query?: string,
  type?: string,
  maxTime?: number,
  page: number = 1,
  pageSize: number = 12,
): Promise<RecipeSearchResponse> => {
  const params = new URLSearchParams();
  if (query) params.append("q", query);
  if (type) params.append("type", type);
  if (maxTime) params.append("max_time", maxTime.toString());
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, pageSize);
  params.append("skip", ((safePage - 1) * safePageSize).toString());
  params.append("limit", safePageSize.toString());

  const queryString = params.toString();
  const url = `/api/v1/recipes${queryString ? `?${queryString}` : ""}`;

  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) {
    throw new Error("Failed to fetch recipes");
  }
  return res.json();
};

export const webSearchRecipe = async (query: string): Promise<Recipe[]> => {
  const url = `/api/v1/recipes/web-search?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.detail || "Failed to perform web search");
  }
  return res.json();
};

export const getCollections = async (): Promise<Collection[]> => {
  const url = `/api/v1/collections`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("Failed to fetch collections");
  const data = await res.json();
  return data.collections;
};

export const createCollection = async (name: string): Promise<Collection> => {
  const url = `/api/v1/collections`;
  const res = await fetch(url, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Failed to create collection");
  return res.json();
};

export const deleteCollection = async (id: string): Promise<void> => {
  const url = `/api/v1/collections/${id}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete collection");
};

export const getCollectionRecipes = async (id: string): Promise<Recipe[]> => {
  const url = `/api/v1/collections/${id}/recipes`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("Failed to fetch collection recipes");
  const data = await res.json();
  return data.recipes;
};

export const addRecipeToCollection = async (
  collectionId: string,
  recipeId: string,
): Promise<void> => {
  const url = `/api/v1/collections/${collectionId}/recipes`;
  const res = await fetch(url, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ recipe_id: recipeId }),
  });
  if (!res.ok) throw new Error("Failed to add recipe to collection");
};

export const removeRecipeFromCollection = async (
  collectionId: string,
  recipeId: string,
): Promise<void> => {
  const url = `/api/v1/collections/${collectionId}/recipes/${recipeId}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to remove recipe from collection");
};

export const updateRecipe = async (
  recipeId: string,
  payload: Partial<Recipe>,
): Promise<Recipe> => {
  const url = `/api/v1/recipes/${recipeId}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.detail || "Failed to update recipe");
  }
  return res.json();
};

export const deleteRecipe = async (recipeId: string): Promise<void> => {
  const url = `/api/v1/recipes/${recipeId}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.detail || "Failed to delete recipe");
  }
};
