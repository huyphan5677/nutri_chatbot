export const fetchLogs = async (
  type: "app" | "ai",
  lines: number = 100,
): Promise<string[]> => {
  const token = localStorage.getItem("nutri_token");
  if (!token) {
    throw new Error("LOGS_AUTH_REQUIRED");
  }

  const url = `/api/v1/system/logs?type=${type}&lines=${lines}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("LOGS_FETCH_FAILED");
  }

  return response.json();
};
