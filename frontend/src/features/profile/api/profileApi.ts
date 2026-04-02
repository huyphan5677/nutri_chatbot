import { api } from "@/shared/api/client";

export const profileApi = {
  submitOnboarding: async (data: any) => {
    const response = await api.post("/onboarding", data);
    return response.data;
  },
  getOnboarding: async () => {
    const response = await api.get("/onboarding");
    return response.data;
  },
  updateOnboarding: async (data: any) => {
    const response = await api.put("/onboarding", data);
    return response.data;
  },
};
