// App variants from one codebase:
//   default            -> O-Fash Markett (buyer + vendor)
//   APP_VARIANT=rider  -> O-Fash Rider (rider only)
// Pair APP_VARIANT with EXPO_PUBLIC_APP_VARIANT so the runtime (Metro inlines
// EXPO_PUBLIC_* at build time) agrees with the build-time config.
const appJson = require("./app.json");

module.exports = () => {
  const base = appJson.expo;
  const isRider = process.env.APP_VARIANT === "rider";

  if (!isRider) {
    return {
      ...base,
      extra: { ...base.extra, appVariant: "market" },
    };
  }

  return {
    ...base,
    name: "O-Fash Rider",
    slug: "ofash-rider",
    ...(base.android
      ? {
          android: {
            ...base.android,
            ...(base.android.package ? { package: `${base.android.package}.rider` } : {}),
          },
        }
      : {}),
    ...(base.ios
      ? {
          ios: {
            ...base.ios,
            ...(base.ios.bundleIdentifier
              ? { bundleIdentifier: `${base.ios.bundleIdentifier}.rider` }
              : {}),
          },
        }
      : {}),
    extra: { ...base.extra, appVariant: "rider" },
  };
};
