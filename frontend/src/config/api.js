const configuredApiUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

export const API_BASE_URL =
  configuredApiUrl && !configuredApiUrl.includes("your-api-domain.com")
    ? configuredApiUrl
    : "http://localhost:5000/api/v1";

export const IS_API_PLACEHOLDER =
  !configuredApiUrl || configuredApiUrl.includes("your-api-domain.com");

export const API_TIMEOUT_MS = 20000;
