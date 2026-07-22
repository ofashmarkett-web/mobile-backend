// KYC_MODE=simulation makes every check behave exactly like live Dojah
// (same response shapes, latency, and pass/fail outcomes) without calling the
// API — for building/demoing before live keys are issued.
// Simulation rules for NIN/BVN (11 digits required):
//   ends in 00 -> NOT FOUND, ends in 01 -> VERIFICATION FAILED, else -> SUCCESS
const KYC_MODE = process.env.KYC_MODE === "simulation" ? "simulation" : "live";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const simulatedLatency = () => wait(1200 + Math.floor(Math.random() * 1300));

const simulated = (overrides) => ({
  provider: "dojah",
  environment: "simulation",
  ...overrides,
});

const simulateNumberCheck = async ({ number, label, reference, entity }) => {
  await simulatedLatency();

  if (!/^\d{11}$/.test(number || "")) {
    return simulated({
      ok: false,
      status: "failed",
      reference,
      data: { error: `${label} must be exactly 11 digits` },
    });
  }

  if (number.endsWith("00")) {
    return simulated({
      ok: false,
      status: "failed",
      reference,
      data: { error: `${label} not found`, message: `No record found for this ${label}` },
    });
  }

  if (number.endsWith("01")) {
    return simulated({
      ok: false,
      status: "failed",
      reference,
      data: {
        error: `${label} verification failed`,
        message: "The details provided do not match this record",
      },
    });
  }

  return simulated({
    ok: true,
    status: "pending",
    reference,
    data: { entity },
  });
};

const simulateImageCheck = async ({ imageUrl, reference, entity, missingMessage }) => {
  await simulatedLatency();

  if (!imageUrl) {
    return simulated({
      ok: false,
      status: "failed",
      reference,
      data: { error: missingMessage },
    });
  }

  return simulated({ ok: true, status: "pending", reference, data: { entity } });
};

const DOJAH_ENV = process.env.DOJAH_ENV === "production" ? "production" : "test";
const DOJAH_BASE_URL =
  process.env.DOJAH_BASE_URL ||
  (DOJAH_ENV === "production" ? "https://api.dojah.io" : "https://sandbox.dojah.io");

const getDojahCredentials = () => {
  if (DOJAH_ENV === "production") {
    return {
      appId: process.env.DOJAH_LIVE_APP_ID || process.env.DOJAH_APP_ID,
      secretKey: process.env.DOJAH_LIVE_SECRET_KEY || process.env.DOJAH_SECRET_KEY,
    };
  }

  return {
    appId: process.env.DOJAH_TEST_APP_ID || process.env.DOJAH_APP_ID,
    secretKey: process.env.DOJAH_TEST_SECRET_KEY || process.env.DOJAH_SECRET_KEY,
  };
};

const dojahHeaders = () => {
  const { appId, secretKey } = getDojahCredentials();

  return {
    "Content-Type": "application/json",
    AppId: appId,
    Authorization: secretKey,
  };
};

const requestDojah = async (path, payload) => {
  const { appId, secretKey } = getDojahCredentials();

  if (!appId || !secretKey) {
    return {
      ok: false,
      provider: "dojah",
      environment: DOJAH_ENV,
      status: "mocked",
      reference: payload.reference,
      message: "Dojah credentials are not configured",
    };
  }

  const response = await fetch(`${DOJAH_BASE_URL}${path}`, {
    method: "POST",
    headers: dojahHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  return {
    ok: response.ok,
    provider: "dojah",
    environment: DOJAH_ENV,
    status: response.ok ? "pending" : "failed",
    data,
  };
};

const verifyBvn = ({ bvn, userId, role }) => {
  const reference = `${role}:${userId}:bvn`;

  if (KYC_MODE === "simulation") {
    return simulateNumberCheck({
      number: bvn,
      label: "BVN",
      reference,
      entity: {
        bvn,
        first_name: "SIMULATED",
        last_name: "ACCOUNT",
        date_of_birth: "01-01-1990",
        phone_number1: "08000000000",
        enrollment_bank: "044",
        reference,
      },
    });
  }

  return requestDojah("/api/v1/kyc/bvn/full", { bvn, reference });
};

const verifyNin = ({ nin, userId, role }) => {
  const reference = `${role}:${userId}:nin`;

  if (KYC_MODE === "simulation") {
    return simulateNumberCheck({
      number: nin,
      label: "NIN",
      reference,
      entity: {
        nin,
        first_name: "SIMULATED",
        last_name: "ACCOUNT",
        date_of_birth: "01-01-1990",
        gender: "M",
        reference,
      },
    });
  }

  return requestDojah("/api/v1/kyc/nin", { nin, reference });
};

const startLiveness = ({ userId, role, imageUrl }) => {
  const reference = `${role}:${userId}:liveness`;

  if (KYC_MODE === "simulation") {
    return simulateImageCheck({
      imageUrl,
      reference,
      missingMessage: "A selfie image is required for the liveness check",
      entity: {
        liveness: { liveness_check: true, liveness_probability: 99.2 },
        reference,
      },
    });
  }

  return requestDojah("/api/v1/kyc/face/liveness", { image_url: imageUrl, reference });
};

// CAC company lookup (optional trust badge — never gates approval).
// Simulation rules mirror the NIN/BVN convention:
//   regNumber ends in 00 -> NOT FOUND, ends in 01 -> VERIFICATION FAILED,
//   anything else -> SUCCESS with a fake entity carrying the companyName.
// Legacy live Dojah: CAC is not built for Dojah — return the "mocked" style
// result the controller treats as inconclusive (badge stays pending).
const verifyCac = async ({ regNumber, companyName, userId, role }) => {
  const reference = `${role}:${userId}:cac`;

  if (KYC_MODE !== "simulation") {
    return {
      ok: false,
      provider: "dojah",
      environment: DOJAH_ENV,
      status: "mocked",
      reference,
      message: "CAC verification is not available on the Dojah provider",
    };
  }

  await simulatedLatency();
  const value = String(regNumber || "").trim();

  if (!value) {
    return simulated({
      ok: false,
      status: "failed",
      reference,
      data: { error: "A CAC registration number is required" },
    });
  }

  if (value.endsWith("00")) {
    return simulated({
      ok: false,
      status: "failed",
      reference,
      data: {
        error: "CAC number not found",
        message: "No CAC record found for this registration number",
      },
    });
  }

  if (value.endsWith("01")) {
    return simulated({
      ok: false,
      status: "failed",
      reference,
      data: {
        error: "CAC verification failed",
        message: "The details provided do not match this CAC record",
      },
    });
  }

  return simulated({
    ok: true,
    status: "pending",
    reference,
    data: {
      entity: {
        regNumber: value,
        companyName: companyName || "SIMULATED BUSINESS",
        status: "ACTIVE",
        reference,
      },
    },
  });
};

const verifyDocument = ({ userId, role, documentType, imageUrl }) => {
  const reference = `${role}:${userId}:document`;

  if (KYC_MODE === "simulation") {
    return simulateImageCheck({
      imageUrl,
      reference,
      missingMessage: "A document image is required",
      entity: {
        document_type: documentType || "ID",
        status: "verified",
        reference,
      },
    });
  }

  return requestDojah("/api/v1/kyc/document/verify", {
    document_type: documentType,
    image_url: imageUrl,
    reference,
  });
};

module.exports = {
  verifyBvn,
  verifyNin,
  verifyCac,
  verifyDocument,
  startLiveness,
};
