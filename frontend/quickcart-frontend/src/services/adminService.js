import api from "../api/axios";

function normalizeArray(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.content)) return payload.content;
  if (Array.isArray(payload.users)) return payload.users;
  return [];
}

function unwrapApiData(payload) {
  if (!payload || typeof payload !== "object") return payload;
  if (payload.data !== undefined) return payload.data;
  return payload;
}

export async function createCatalogManager(payload) {
  const response = await api.post("/admin/users", payload);
  return unwrapApiData(response.data);
}

export async function getCatalogManagers() {
  const response = await api.get("/users", {
    params: { role: "CATALOG_MANAGER" },
  });
  return normalizeArray(unwrapApiData(response.data));
}

export async function updateCatalogManager(id, payload) {
  const response = await api.patch(`/users/${id}`, payload);
  return unwrapApiData(response.data);
}

export async function updateCatalogManagerStatus(id, isActive) {
  const response = await api.patch(`/users/${id}/status`, {
    isActive,
  });
  return unwrapApiData(response.data);
}

export async function deleteCatalogManager(id) {
  const response = await api.delete(`/users/${id}`);
  return unwrapApiData(response.data);
}

export async function resetCatalogManagerPassword(id, password) {
  const response = await api.patch(`/users/${id}/reset-password`, {
    password,
  });
  return unwrapApiData(response.data);
}
