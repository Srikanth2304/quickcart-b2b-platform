import api from "../api/axios";

function unwrap(payload) {
  if (!payload || typeof payload !== "object") return payload;
  if (payload.data !== undefined) return payload.data;
  return payload;
}

function normalizeArray(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.content)) return payload.content;
  if (Array.isArray(payload.products)) return payload.products;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

export async function getMyProducts(page = 0, size = 10) {
  const response = await api.get("/products/my", {
    params: { page, size },
  });
  const payload = unwrap(response.data);
  const list = normalizeArray(payload);
  return {
    content: list,
    totalPages: Number(payload?.totalPages || 1),
    totalElements: Number(payload?.totalElements || list.length),
  };
}

export async function createProduct(payload) {
  const response = await api.post("/products", payload);
  return unwrap(response.data);
}

export async function updateProduct(id, payload) {
  const response = await api.patch(`/products/${id}`, payload);
  return unwrap(response.data);
}

export async function updateProductStatus(id, isActive) {
  const response = await api.patch(`/products/${id}/status`, {
    isActive,
  });
  return unwrap(response.data);
}

export async function deleteProduct(id) {
  const response = await api.delete(`/products/${id}`);
  return unwrap(response.data);
}

export async function uploadProductImages(id, payload) {
  const response = await api.post(`/products/${id}/images`, payload);
  return unwrap(response.data);
}

export async function getBrands() {
  const response = await api.get("/brands");
  const payload = unwrap(response.data);
  return normalizeArray(payload);
}

export async function getCategories() {
  const response = await api.get("/categories");
  const payload = unwrap(response.data);
  return normalizeArray(payload);
}
