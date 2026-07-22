// QoreID identity verification (https://docs.qoreid.com).
//
// Auth: POST /token with { clientId, secret } -> { accessToken, expiresIn }.
// The token is cached in-process and refreshed ~60s before it expires.
//
// Results are mapped to the same contract the controller already consumes
// from dojahService:
//   success   -> { ok: true,  status: "verified", data: { entity } }
//   not found -> { ok: false, status: "failed",   data: { error, message } }
//   failed    -> { ok: false, status: "failed",   data: { error, message } }
//   no creds / timeout / network error
//             -> { ok: false, status: "mocked",   message }   (controller maps
//                this to manual_review — never crash, never hang)
const QOREID_BASE_URL = process.env.QOREID_BASE_URL || "https://api.qoreid.com";
const REQUEST_TIMEOUT_MS = 15000;
const TOKEN_REFRESH_MARGIN_MS = 60000;

let tokenCache = { accessToken: null, expiresAt: 0 };

const getCredentials = () => ({
  clientId: process.env.QOREID_CLIENT_ID,
  secret: process.env.QOREID_SECRET,
});

const result = (overrides) => ({
  provider: "qoreid",
  environment: "live",
  ...overrides,
});

// Nothing definitive happened (missing credentials, timeout, network error).
// The controller maps status "mocked" to manual_review.
const inconclusiveResult = (reference, message) =>
  result({ ok: false, status: "mocked", reference, message });

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

const getAccessToken = async () => {
  if (tokenCache.accessToken && Date.now() < tokenCache.expiresAt - TOKEN_REFRESH_MARGIN_MS) {
    return tokenCache.accessToken;
  }

  const { clientId, secret } = getCredentials();
  const response = await fetchWithTimeout(`${QOREID_BASE_URL}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ clientId, secret }),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.accessToken) {
    throw new Error(data.message || `QoreID token request failed (HTTP ${response.status})`);
  }

  const expiresInMs = (Number(data.expiresIn) || 3600) * 1000;
  tokenCache = { accessToken: data.accessToken, expiresAt: Date.now() + expiresInMs };

  return tokenCache.accessToken;
};

// QoreID replies with an applicant/summary/status envelope, e.g.
//   { nin: {...}, summary: { nin_check: { status: "EXACT_MATCH", ... } },
//     status: { state: "complete", status: "id_verified" } }
// and a 404 (with a message) when the id has no record. Anything we cannot
// recognise maps to a failed result with a message — never an uncaught throw.
const VERIFIED_SIGNALS = ["verified", "id_verified", "exact_match"];

const mapQoreIdResponse = ({ ok, httpStatus, body, reference, label, entityKeys = [] }) => {
  const payload = body && typeof body === "object" ? body : {};
  const summaryBlock =
    payload.summary && typeof payload.summary === "object"
      ? Object.values(payload.summary)[0]
      : null;
  const summaryStatus =
    summaryBlock && typeof summaryBlock === "object" ? summaryBlock.status : summaryBlock;
  const overallStatus =
    payload.status && typeof payload.status === "object"
      ? payload.status.status || payload.status.state
      : payload.status;
  const normalizedSummary = String(summaryStatus || "").toLowerCase();
  const normalizedOverall = String(overallStatus || "").toLowerCase();
  const message = payload.message || payload.error || "";

  if (httpStatus === 404 || /not.?found|no record/i.test(message)) {
    return result({
      ok: false,
      status: "failed",
      reference,
      data: {
        error: `${label} not found`,
        message: message || `No record found for this ${label}`,
      },
    });
  }

  if (
    ok &&
    (VERIFIED_SIGNALS.includes(normalizedOverall) || VERIFIED_SIGNALS.includes(normalizedSummary))
  ) {
    const entity =
      entityKeys.map((key) => payload[key]).find((value) => value && typeof value === "object") ||
      { ...payload };

    return result({
      ok: true,
      status: "verified",
      reference,
      data: {
        entity: { ...entity, reference },
        summary: payload.summary,
        qoreIdStatus: payload.status,
      },
    });
  }

  return result({
    ok: false,
    status: "failed",
    reference,
    data: {
      error: `${label} verification failed`,
      message:
        message ||
        `QoreID returned status "${overallStatus || summaryStatus || `HTTP ${httpStatus}`}"`,
    },
  });
};

const postIdentity = async ({ path, body, reference, label, entityKeys }) => {
  const { clientId, secret } = getCredentials();

  if (!clientId || !secret) {
    return inconclusiveResult(reference, "QoreID credentials are not configured");
  }

  try {
    const token = await getAccessToken();
    const response = await fetchWithTimeout(`${QOREID_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));

    return mapQoreIdResponse({
      ok: response.ok,
      httpStatus: response.status,
      body: data,
      reference,
      label,
      entityKeys,
    });
  } catch (error) {
    // Timeout, DNS/network failure, or a token-endpoint error — nothing
    // definitive about the applicant, so route to manual review.
    const message =
      error.name === "AbortError"
        ? `QoreID request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`
        : `QoreID request failed: ${error.message}`;

    return inconclusiveResult(reference, message);
  }
};

// QoreID name matching wants firstname/lastname; profiles store one fullName.
const splitFullName = (fullName) => {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);

  return {
    firstname: parts[0] || "",
    lastname: parts.length > 1 ? parts[parts.length - 1] : "",
  };
};

// POST /v1/ng/identities/nin/{nin} with { firstname, lastname }
const verifyNin = ({ nin, userId, role, fullName }) => {
  const reference = `${role}:${userId}:nin`;

  if (!/^\d{11}$/.test(nin || "")) {
    return Promise.resolve(
      result({
        ok: false,
        status: "failed",
        reference,
        data: { error: "NIN must be exactly 11 digits" },
      }),
    );
  }

  return postIdentity({
    path: `/v1/ng/identities/nin/${nin}`,
    body: splitFullName(fullName),
    reference,
    label: "NIN",
    entityKeys: ["nin"],
  });
};

// POST /v1/ng/identities/bvn-basic/{bvn} with { firstname, lastname }.
// (BVN is not part of the core onboarding flow and never gates verification.)
const verifyBvn = ({ bvn, userId, role, fullName }) => {
  const reference = `${role}:${userId}:bvn`;

  if (!/^\d{11}$/.test(bvn || "")) {
    return Promise.resolve(
      result({
        ok: false,
        status: "failed",
        reference,
        data: { error: "BVN must be exactly 11 digits" },
      }),
    );
  }

  return postIdentity({
    path: `/v1/ng/identities/bvn-basic/${bvn}`,
    body: splitFullName(fullName),
    reference,
    label: "BVN",
    entityKeys: ["bvn_basic", "bvn"],
  });
};

// Document check: QoreID's REST identity API verifies documents by ID NUMBER
// (e.g. POST /v1/ng/identities/drivers-license/{idNumber}), but our onboarding
// flow captures a document IMAGE and never collects the document's number.
// QoreID's image-based document verification is only offered through its
// hosted SDK/workflow products, not a documented server-side REST endpoint,
// so rather than invent one we route the document check to manual review
// (status "mocked" -> manual_review in the controller).
const verifyDocument = ({ userId, role, documentType, imageUrl }) => {
  const reference = `${role}:${userId}:document`;

  if (!imageUrl) {
    return Promise.resolve(
      result({
        ok: false,
        status: "failed",
        reference,
        data: { error: "A document image is required" },
      }),
    );
  }

  return Promise.resolve(
    inconclusiveResult(
      reference,
      `QoreID has no REST endpoint for image-based ${documentType || "document"} verification — routed to manual review`,
    ),
  );
};

// Face match: POST /v1/ng/identities/face-verification/nin with
// { idNumber, photoUrl }. This needs the applicant's NIN alongside the selfie,
// but profiles only persist a synthetic reference string ("role:userId:nin"),
// not the NIN itself, so the controller cannot supply idNumber today. When a
// NIN is not provided the check routes to manual review instead of guessing;
// if NIN persistence is added later, passing `nin` here activates the real call.
const startLiveness = ({ userId, role, imageUrl, nin }) => {
  const reference = `${role}:${userId}:liveness`;

  if (!imageUrl) {
    return Promise.resolve(
      result({
        ok: false,
        status: "failed",
        reference,
        data: { error: "A selfie image is required for the liveness check" },
      }),
    );
  }

  if (!/^\d{11}$/.test(nin || "")) {
    return Promise.resolve(
      inconclusiveResult(
        reference,
        "QoreID face verification requires the applicant's NIN, which is not stored on the profile — routed to manual review",
      ),
    );
  }

  return postIdentity({
    path: "/v1/ng/identities/face-verification/nin",
    body: { idNumber: nin, photoUrl: imageUrl },
    reference,
    label: "Face verification",
    entityKeys: ["face_verification"],
  });
};

module.exports = {
  verifyBvn,
  verifyNin,
  verifyDocument,
  startLiveness,
  // Exported for unit smoke tests of the response mapping.
  mapQoreIdResponse,
};
