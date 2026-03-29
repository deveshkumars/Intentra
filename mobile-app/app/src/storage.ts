import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVER_URL_KEY = '@gstack_monitor:server_url';
const AUTH_TOKEN_KEY = '@gstack_monitor:auth_token';

export async function getServerUrl(): Promise<string | null> {
  return AsyncStorage.getItem(SERVER_URL_KEY);
}

export async function setServerUrl(url: string): Promise<void> {
  const normalized = url.replace(/\/$/, ''); // strip trailing slash
  await AsyncStorage.setItem(SERVER_URL_KEY, normalized);
}

export async function clearServerUrl(): Promise<void> {
  await AsyncStorage.removeItem(SERVER_URL_KEY);
}

export async function getAuthToken(): Promise<string | null> {
  return AsyncStorage.getItem(AUTH_TOKEN_KEY);
}

export async function setAuthToken(token: string): Promise<void> {
  if (token.trim()) {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token.trim());
  } else {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

export async function clearAuthToken(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
}
