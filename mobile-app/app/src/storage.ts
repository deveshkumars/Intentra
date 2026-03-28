import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVER_URL_KEY = '@gstack_monitor:server_url';

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
