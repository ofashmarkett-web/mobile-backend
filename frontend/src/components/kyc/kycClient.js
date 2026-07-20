import { onboardingApi } from "../../services/apiClient";

// Errors that mean "we could not talk to the backend at all" rather than a
// real verification verdict. In development the backend runs with
// VENDOR_VERIFICATION_ENFORCED=false (KYC is not gating anything), so these
// must not dead-end onboarding — we let the user through and the backend
// keeps the check in manual_review until Dojah webhooks settle it.
const CONNECTIVITY_HINTS = [
  "cannot reach server",
  "request timed out",
  "expo_public_api_base_url",
];

export const isConnectivityIssue = (message = "") =>
  CONNECTIVITY_HINTS.some((hint) => String(message).toLowerCase().includes(hint));

/**
 * Runs one Dojah KYC check through the existing backend endpoint
 * (onboardingApi.startKyc — payload shapes unchanged) and maps the outcome to
 * the three UI states the result sheets understand.
 *
 * performKycCheck({ token, role, check, payload })
 *   -> { state: "success" | "failed" | "not_found", response?, error? }
 *
 * check: "bvn" | "nin" | "document" | "liveness"
 * payload: { bvn } | { nin } | { documentType, imageUrl } | { imageUrl }
 */
export const performKycCheck = async ({ token, role, check, payload }) => {
  if (!token) {
    // No session (dev preview) — nothing to verify against.
    return { state: "success" };
  }

  try {
    const response = await onboardingApi.startKyc(token, role, check, payload);
    const kyc = response?.kyc;

    if (!kyc || kyc.ok || kyc.status === "pending" || kyc.status === "mocked") {
      // "mocked" means Dojah credentials are not configured (dev bypass).
      return { state: "success", response };
    }

    const detail = JSON.stringify(kyc.data || kyc.message || "").toLowerCase();

    if (detail.includes("not found") || detail.includes("no record")) {
      return { state: "not_found", response };
    }

    return { state: "failed", response };
  } catch (error) {
    const message = String(error.message || "");

    if (isConnectivityIssue(message)) {
      return { state: "success", offline: true };
    }

    if (message.toLowerCase().includes("not found")) {
      return { state: "not_found", error };
    }

    return { state: "failed", error };
  }
};
