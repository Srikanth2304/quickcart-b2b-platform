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

export async function fetchPendingUsers() {
  const response = await api.get("/users/pending");
  return normalizeArray(unwrapApiData(response.data));
}

export async function getAllUsers(role) {
  const response = await api.get("/users", {
    params: role ? { role } : {},
  });
  return normalizeArray(unwrapApiData(response.data));
}

export async function updateUser(id, payload) {
  const response = await api.patch(`/users/${id}`, payload);
  return unwrapApiData(response.data);
}

export async function updateUserStatus(id, isActive) {
  const response = await api.patch(`/users/${id}/status`, {
    isActive,
  });
  return unwrapApiData(response.data);
}

export async function deleteUser(id) {
  const response = await api.delete(`/users/${id}`);
  return unwrapApiData(response.data);
}

export async function resetUserPassword(id, password) {
  const response = await api.patch(`/users/${id}/reset-password`, {
    password,
  });
  return unwrapApiData(response.data);
}

export async function fetchUserCounts() {
  const response = await api.get("/users/counts");
  const payload = unwrapApiData(response.data) || {};
  return {
    totalUsers: Number(payload.totalUsers || payload.users || 0),
    totalAdmins: Number(payload.totalAdmins || payload.admins || 0),
    pendingUsers: Number(payload.pendingUsers || payload.pending || 0),
  };
}

export async function fetchAdmins() {
  return getAllUsers("ADMIN");
}

export async function fetchAllUsers() {
  return getAllUsers();
}

export async function createAdminUser({ name, email, password }) {
  const response = await api.post("/admin/users", {
    name,
    email,
    password,
    roles: ["ADMIN"],
    isActive: true,
  });
  return unwrapApiData(response.data);
}
