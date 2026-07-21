import { API_BASE_URL, API_TIMEOUT_MS, IS_API_PLACEHOLDER } from "../config/api";

const withTimeout = (promise, timeoutMs = API_TIMEOUT_MS) => {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("Request timed out")), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

const request = async (path, { method = "GET", token, body } = {}) => {
  if (IS_API_PLACEHOLDER) {
    throw new Error("Set EXPO_PUBLIC_API_BASE_URL to your backend LAN URL");
  }

  let response;

  try {
    response = await withTimeout(
      fetch(`${API_BASE_URL}${path}`, {
        method,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      }),
    );
  } catch (error) {
    throw new Error(`Cannot reach server at ${API_BASE_URL}`);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || `Request failed (${response.status})`);
    error.status = response.status;
    error.code = data.code;
    throw error;
  }

  return data;
};

// Multipart upload for images picked from the device gallery/camera.
const uploadRequest = async (path, { token, files }) => {
  if (IS_API_PLACEHOLDER) {
    throw new Error("Set EXPO_PUBLIC_API_BASE_URL to your backend LAN URL");
  }

  const form = new FormData();

  files.forEach((file, index) => {
    const name = file.fileName || `photo-${index}.jpg`;
    form.append("images", {
      uri: file.uri,
      name,
      type: file.mimeType || "image/jpeg",
    });
  });

  const response = await withTimeout(
    fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: form,
    }),
    60000,
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || `Upload failed (${response.status})`);
    error.status = response.status;
    throw error;
  }

  return data;
};

export const authApi = {
  sendOtp: (payload) => request("/auth/otp-send", { method: "POST", body: payload }),
  verifyOtp: (payload) => request("/auth/otp-verify", { method: "POST", body: payload }),
  switchRole: (token, role) =>
    request("/auth/switch-role", { method: "POST", token, body: { role } }),
};

export const onboardingApi = {
  saveBuyer: (token, payload) => request("/onboarding/buyer", { method: "POST", token, body: payload }),
  saveVendor: (token, payload) => request("/onboarding/vendor", { method: "POST", token, body: payload }),
  saveRider: (token, payload) => request("/onboarding/rider", { method: "POST", token, body: payload }),
  submit: (token, role) => request(`/onboarding/${role}/submit`, { method: "POST", token }),
  status: (token, role) => request(`/onboarding/${role}/status`, { token }),
  startKyc: (token, role, check, payload) =>
    request(`/onboarding/${role}/kyc/${check}`, { method: "POST", token, body: payload }),
};

// Where a returning vendor/rider should land: the dashboard once onboarding
// has been submitted, otherwise the start of their onboarding flow.
export const resolveRoleLanding = async (token, role) => {
  const dashboards = { vendor: "VendorDashboard", rider: "RiderDashboard" };
  const starts = { vendor: "VendorStart", rider: "RiderStart" };

  if (!dashboards[role]) return undefined;

  try {
    const result = await onboardingApi.status(token, role);
    // KYC-verified users always land on their dashboard — never back through
    // KYC/onboarding — even if onboardingStatus lags behind.
    const done =
      ["submitted", "approved", "active"].includes(result.onboardingStatus) ||
      result.kycStatus === "verified";
    return done ? dashboards[role] : starts[role];
  } catch (error) {
    return starts[role];
  }
};

export const vendorApi = {
  store: (token) => request("/vendors/me/store", { token }),
  updateStore: (token, payload) =>
    request("/vendors/me/store", { method: "PATCH", token, body: payload }),
  home: (token) => request("/vendors/me/home", { token }),
  analytics: (token, period = "week") =>
    request(`/vendors/me/analytics?period=${period}`, { token }),
  reviews: (token) => request("/vendors/me/reviews", { token }),
  notifications: (token) => request("/vendors/me/notifications", { token }),
  personal: (token) => request("/vendors/me/personal", { token }),
  updatePersonal: (token, payload) =>
    request("/vendors/me/personal", { method: "PATCH", token, body: payload }),
};

export const productApi = {
  create: (token, payload) => request("/products", { method: "POST", token, body: payload }),
  mine: (token, filter = "all") => request(`/products/mine?filter=${filter}`, { token }),
  get: (token, id) => request(`/products/${id}`, { token }),
  update: (token, id, payload) =>
    request(`/products/${id}`, { method: "PATCH", token, body: payload }),
  updateStock: (token, id, payload) =>
    request(`/products/${id}/stock`, { method: "PATCH", token, body: payload }),
  setActive: (token, id, isActive) =>
    request(`/products/${id}/status`, { method: "PATCH", token, body: { isActive } }),
  remove: (token, id) => request(`/products/${id}`, { method: "DELETE", token }),
};

export const orderApi = {
  vendorList: (token, status = "all") => request(`/orders/vendor?status=${status}`, { token }),
  get: (token, id) => request(`/orders/${id}`, { token }),
  accept: (token, id) => request(`/orders/${id}/accept`, { method: "POST", token }),
  decline: (token, id) => request(`/orders/${id}/decline`, { method: "POST", token }),
  ready: (token, id, payload) =>
    request(`/orders/${id}/ready`, { method: "POST", token, body: payload }),
  cancelReady: (token, id) => request(`/orders/${id}/cancel-ready`, { method: "POST", token }),
};

const query = (params = {}) => {
  const pairs = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  return pairs.length ? `?${pairs.join("&")}` : "";
};

export const buyerApi = {
  me: (token) => request("/buyers/me", { token }),
  updateMe: (token, payload) => request("/buyers/me", { method: "PATCH", token, body: payload }),
  browse: (token, params) => request(`/buyers/marketplace/products${query(params)}`, { token }),
  product: (token, id) => request(`/buyers/marketplace/products/${id}`, { token }),
  vendors: (token) => request("/buyers/marketplace/vendors", { token }),
  orders: (token) => request("/orders/buyer", { token }),
  placeOrder: (token, payload) => request("/orders", { method: "POST", token, body: payload }),
  confirmDelivery: (token, id) => request(`/orders/${id}/confirm`, { method: "POST", token }),
  recordView: (id) => request(`/products/${id}/view`, { method: "POST" }).catch(() => {}),
};

export const disputeApi = {
  create: (token, payload) => request("/disputes", { method: "POST", token, body: payload }),
  vendorList: (token, state = "active") => request(`/disputes/vendor?state=${state}`, { token }),
  get: (token, id) => request(`/disputes/${id}`, { token }),
};

export const uploadApi = {
  images: (token, files) => uploadRequest("/uploads", { token, files }),
};

export default request;
