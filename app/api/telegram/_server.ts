import { createHash, timingSafeEqual } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const TELEGRAM_MAX_BODY_BYTES = 64 * 1024;

export function hashTelegramLinkCode(value: string) {
  return createHash("sha256").update(value.trim().toUpperCase()).digest("hex");
}

export function hasTelegramWebhookSecret(value: string | null) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!value || !expected) return false;
  const actualBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export function getTelegramAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ADMIN_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function telegramApi<T>(method: string, payload: Record<string, unknown>): Promise<T> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Telegram bot is not configured.");
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8000)
  });
  const result = await response.json() as { ok?: boolean; result?: T; description?: string };
  if (!response.ok || !result.ok) throw new Error(result.description || "Telegram API request failed.");
  return result.result as T;
}

export type TelegramMessage = {
  message_id?: number;
  text?: string;
  chat?: { id?: number; type?: string };
  from?: { id?: number; username?: string; first_name?: string; last_name?: string };
};

export type TelegramUpdate = {
  update_id?: number;
  message?: TelegramMessage;
};
