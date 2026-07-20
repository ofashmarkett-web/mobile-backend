import { create } from "zustand";
import { clearSession, loadSession, saveSession } from "../services/sessionStorage";

export const FIGMA_TRACKS = {
  splash: ["34-8", "41-717", "41-725"],
  auth: ["21-11", "41-258", "41-521", "41-300", "41-566", "41-479", "42-587", "41-623"],
  vendor: [
    "133-2063",
    "133-2109",
    "133-2131",
    "133-2139",
    "129-3533",
    "147-2366",
    "133-1108",
    "133-1309",
    "147-1804",
    "147-2463",
    "133-2822",
    "136-1724",
    "147-3820",
    "124-1776",
    "124-2467",
    "124-2500",
    "124-2554",
    "124-3177",
    "124-2881",
    "132-1478",
    "124-2914",
    "124-2659",
    "124-3052",
    "124-3283",
    "124-3442",
    "132-1363",
    "124-3405",
    "133-1680",
    "133-1719",
    "133-1749",
    "133-1604",
    "133-1779",
    "147-3160",
    "133-1465",
    "136-1586",
  ],
  rider: [
    "147-2786",
    "147-2886",
    "147-3931",
    "147-2858",
    "147-2868",
    "147-3117",
    "147-3132",
    "147-3000",
    "147-3010",
    "147-3022",
    "147-3034",
    "147-3046",
    "147-3081",
    "147-3468",
    "147-3648",
    "147-4461",
    "147-4527",
    "151-2426",
    "152-2544",
  ],
};

const initialMetadata = {
  id: null,
  email: "",
  phone: "",
  role: "buyer",
  isEmailVerified: false,
  isKycVerified: false,
  profile: {
    firstName: "",
    lastName: "",
    avatarUrl: "",
    address: "",
  },
  vendor: {
    businessName: "",
    cacNumber: "",
    taxId: "",
    storeCategory: "",
    deliveryRadiusKm: 0,
  },
  rider: {
    vehicleType: "",
    plateNumber: "",
    capacityKg: 0,
    ratePerKm: 0,
  },
  verification: {
    otpToken: "",
    bvnToken: "",
    ninToken: "",
    livenessToken: "",
    dojahReference: "",
  },
};

export const useUserStore = create((set, get) => ({
  token: null,
  activeTrack: "auth",
  activeSteps: {
    splash: 0,
    auth: 0,
    vendor: 0,
    rider: 0,
  },
  userMetadata: initialMetadata,
  currentNode: () => {
    const { activeTrack, activeSteps } = get();
    return FIGMA_TRACKS[activeTrack]?.[activeSteps[activeTrack]] || null;
  },
  hydrateSession: async () => {
    const session = await loadSession();

    if (!session?.token || !session?.user) {
      return null;
    }

    set((state) => ({
      token: session.token,
      userMetadata: {
        ...state.userMetadata,
        ...session.user,
      },
    }));

    return session;
  },
  setSession: ({ token, user }) => {
    saveSession({ token, user }).catch(() => {});
    set((state) => ({
      token,
      userMetadata: {
        ...state.userMetadata,
        ...user,
      },
    }));
  },
  setRole: (role) =>
    set((state) => ({
      activeTrack: role === "vendor" || role === "rider" ? role : "auth",
      userMetadata: {
        ...state.userMetadata,
        role,
      },
    })),
  setTrack: (track) =>
    set((state) => ({
      activeTrack: FIGMA_TRACKS[track] ? track : state.activeTrack,
    })),
  setStep: (track, step) =>
    set((state) => ({
      activeSteps: {
        ...state.activeSteps,
        [track]: Math.max(0, Math.min(step, (FIGMA_TRACKS[track]?.length || 1) - 1)),
      },
    })),
  nextStep: () =>
    set((state) => {
      const max = (FIGMA_TRACKS[state.activeTrack]?.length || 1) - 1;

      return {
        activeSteps: {
          ...state.activeSteps,
          [state.activeTrack]: Math.min(state.activeSteps[state.activeTrack] + 1, max),
        },
      };
    }),
  previousStep: () =>
    set((state) => ({
      activeSteps: {
        ...state.activeSteps,
        [state.activeTrack]: Math.max(state.activeSteps[state.activeTrack] - 1, 0),
      },
    })),
  patchUserMetadata: (patch) =>
    set((state) => ({
      userMetadata: {
        ...state.userMetadata,
        ...patch,
      },
    })),
  patchNestedMetadata: (key, patch) =>
    set((state) => ({
      userMetadata: {
        ...state.userMetadata,
        [key]: {
          ...state.userMetadata[key],
          ...patch,
        },
      },
    })),
  resetUser: () => {
    clearSession().catch(() => {});
    set({
      token: null,
      activeTrack: "auth",
      activeSteps: {
        splash: 0,
        auth: 0,
        vendor: 0,
        rider: 0,
      },
      userMetadata: initialMetadata,
    });
  },
}));
