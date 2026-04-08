import api from "../api/axios";

function normalizeArray(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.content)) return payload.content;
  if (Array.isArray(payload.users)) return payload.users;
  if (Array.isArray(payload.categories)) return payload.categories;
  return [];
}

function unwrap(payload) {
  if (!payload || typeof payload !== "object") return payload;
  if (payload.data !== undefined) return payload.data;
  return payload;
}

export async function getPendingUsers() {
  const response = await api.get("/users/pending");
  return normalizeArray(unwrap(response.data));
}

export async function approveUser(id) {
  const response = await api.patch(`/users/${id}/approve`);
  return unwrap(response.data);
}

export async function rejectUser(id) {
  const response = await api.patch(`/users/${id}/reject`);
  return unwrap(response.data);
}

export async function createBrandsBulk(payload) {
  const response = await api.post("/brands/bulk", payload);
  return unwrap(response.data);
}

export async function getBrands() {
  const response = await api.get("/brands");
  return normalizeArray(unwrap(response.data));
}

export async function updateBrand(id, payload) {
  const response = await api.patch(`/brands/${id}`, payload);
  return unwrap(response.data);
}

export async function updateBrandStatus(id, isActive) {
  const response = await api.patch(`/brands/${id}/status`, { isActive });
  return unwrap(response.data);
}

export async function deleteBrand(id, force = false) {
  const response = await api.delete(`/brands/${id}`, {
    params: force ? { force: true } : {},
  });
  return unwrap(response.data);
}

export async function createCategoriesBulk(payload) {
  const response = await api.post("/categories/bulk", payload);
  return unwrap(response.data);
}

export async function getCategories() {
  const response = await api.get("/categories");
  return normalizeArray(unwrap(response.data));
}

export async function updateCategory(id, payload) {
  const response = await api.patch(`/categories/${id}`, payload);
  return unwrap(response.data);
}

export async function deleteCategory(id, force = false) {
  const response = await api.delete(`/categories/${id}`, {
    params: force ? { force: true } : {},
  });
  return unwrap(response.data);
}

export async function getCategoryTree() {
  const response = await api.get("/categories/tree");
  return normalizeArray(unwrap(response.data));
}
