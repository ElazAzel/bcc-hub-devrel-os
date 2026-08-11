import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { TELEGRAM_COMMANDS } from "@/lib/telegram";
import { hashTelegramLinkCode, telegramApi } from "../_server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Требуется вход в рабочее пространство." }, { status: 401 });

  const code = `BCC-${randomBytes(9).toString("hex").toUpperCase().match(/.{1,6}/g)?.join("-") ?? ""}`;
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const now = new Date().toISOString();
  const { error: revokeError } = await supabase.from("telegram_link_codes").update({ used_at: now }).eq("owner_id", user.id).is("used_at", null);
  if (revokeError) return NextResponse.json({ error: "Не удалось подготовить подключение. Примени миграцию Telegram и повтори попытку." }, { status: 503 });
  const { error } = await supabase.from("telegram_link_codes").insert({ owner_id: user.id, code_hash: hashTelegramLinkCode(code), expires_at: expiresAt });
  if (error) return NextResponse.json({ error: "Не удалось создать код подключения. Примени миграцию Telegram и повтори попытку." }, { status: 503 });
  try {
    await telegramApi("setMyCommands", { commands: TELEGRAM_COMMANDS });
  } catch (telegramError) {
    console.error("Telegram command menu update failed", telegramError instanceof Error ? telegramError.message : "unknown error");
  }
  return NextResponse.json({ code, expiresAt, botUsername: "DevRelAssistbot" }, { headers: { "Cache-Control": "no-store" } });
}
