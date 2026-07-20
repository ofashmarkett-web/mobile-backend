import AsyncStorage from "@react-native-async-storage/async-storage";

const SESSION_KEY = "ofash.session.v1";

export const saveSession = async ({ token, user }) => {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ token, user }));
};

export const loadSession = async () => {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const clearSession = async () => {
  await AsyncStorage.removeItem(SESSION_KEY);
};
