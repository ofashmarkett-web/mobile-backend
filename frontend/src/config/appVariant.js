// Which app variant this bundle is: the market app (buyer + vendor, default)
// or the standalone O-Fash Rider app.
//
// expo-constants is not installed in this project, so detection relies on
// EXPO_PUBLIC_APP_VARIANT alone — Metro inlines EXPO_PUBLIC_* env vars at
// build time, making this a compile-time constant in the bundle. The
// start:rider script sets it alongside APP_VARIANT (which drives
// app.config.js) so config and runtime always agree.
export const IS_RIDER_APP = process.env.EXPO_PUBLIC_APP_VARIANT === "rider";
