const configuredApiUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

export const API_BASE_URL =
  configuredApiUrl && !configuredApiUrl.includes("your-api-domain.com")
    ? configuredApiUrl
    : "http://localhost:5000/api/v1";

export const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, "");

export const resolveMediaUrl = (value) => {
  if (!value || typeof value !== "string") return value;
  if (value.startsWith("/")) return `${API_ORIGIN}${value}`;
  return value.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, API_ORIGIN);
};

export const IS_API_PLACEHOLDER =
  !configuredApiUrl || configuredApiUrl.includes("your-api-domain.com");

export const API_TIMEOUT_MS = 20000;
