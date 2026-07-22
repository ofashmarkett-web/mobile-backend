// Provider-agnostic KYC facade. The onboarding controller talks to this module
// only; the concrete provider is chosen per call from the environment:
//
//   KYC_MODE=simulation  (current default) -> dojahService's simulation path,
//     unchanged: NIN/BVN ending 00 -> not found, 01 -> failed, else success,
//     with realistic latency.
//   KYC_MODE=live + KYC_PROVIDER=qoreid (or unset) -> real QoreID calls
//     (qoreIdService). Missing QoreID credentials never crash — the service
//     returns the "mocked" style result the controller maps to manual_review.
//   KYC_MODE=live + KYC_PROVIDER=dojah -> legacy Dojah behaviour, unchanged.
//
// All four functions keep the exact names and result shapes the controller
// already consumes from dojahService.
const dojahService = require("./dojahService");
const qoreIdService = require("./qoreIdService");

const activeProvider = () => {
  // Simulation is implemented inside dojahService (its KYC_MODE branch) —
  // delegating keeps today's behaviour byte-for-byte identical.
  if (process.env.KYC_MODE === "simulation") return dojahService;

  const provider = String(process.env.KYC_PROVIDER || "qoreid").toLowerCase();

  return provider === "dojah" ? dojahService : qoreIdService;
};

const verifyBvn = (params) => activeProvider().verifyBvn(params);
const verifyNin = (params) => activeProvider().verifyNin(params);
const verifyDocument = (params) => activeProvider().verifyDocument(params);
const startLiveness = (params) => activeProvider().startLiveness(params);

module.exports = {
  verifyBvn,
  verifyNin,
  verifyDocument,
  startLiveness,
};
