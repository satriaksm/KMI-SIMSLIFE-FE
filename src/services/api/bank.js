import api from "@/libs/axios";

export async function fetchBanks() {
  const res = await api.get("/api/banks");
  const payload = res?.data;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;

  return [];
}
