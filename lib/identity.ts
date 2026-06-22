import * as Crypto from "expo-crypto";
import AsyncStorage from "@react-native-async-storage/async-storage";

const GUEST_ID_KEY = "guest_id";
const GUEST_CREATED_AT_KEY = "guest_created_at";
const DAYS_UNTIL_EXPIRY = 7;

export async function getOrCreateGuestId(): Promise<string> {
  const existing = await AsyncStorage.getItem(GUEST_ID_KEY);
  if (existing) {
    return existing;
  }
  // Generate a new guest UUID
  const id = Crypto.randomUUID();
  const now = new Date().toISOString();

  await AsyncStorage.setItem(GUEST_ID_KEY, id);
  await AsyncStorage.setItem(GUEST_CREATED_AT_KEY, now);

  return id;
}

export async function getGuestCreatedAt(): Promise<Date | null> {
  const raw = await AsyncStorage.getItem(GUEST_CREATED_AT_KEY);
  if (!raw) return null;
  return new Date(raw);
}

export async function getDaysRemaining(): Promise<number> {
  const createdAt = await getGuestCreatedAt();
  if (!createdAt) return DAYS_UNTIL_EXPIRY;

  const now = new Date();
  const diffMs = now.getTime() - createdAt.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, DAYS_UNTIL_EXPIRY - diffDays);
}

export async function isGuestExpired(): Promise<boolean> {
  const remaining = await getDaysRemaining();
  return remaining === 0;
}
