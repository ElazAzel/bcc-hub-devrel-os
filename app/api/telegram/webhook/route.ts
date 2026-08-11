import { NextResponse } from "next/server";
import { isUuid, parseTelegramCommand, telegramDisplayName, truncateTelegramText } from "@/lib/telegram";
import {
  getTelegramAdminClient,
  hasTelegramWebhookSecret,
  hashTelegramLinkCode,
  telegramApi,
  TELEGRAM_MAX_BODY_BYTES,
  type TelegramUpdate
} from "../_server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const jsonOk = () => NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  if (!hasTelegramWebhookSecret(request.headers.get("x-telegram-bot-api-secret-token"))) {
    return new NextResponse("Not found", { status: 404 });
  }
  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > TELEGRAM_MAX_BODY_BYTES) return new NextResponse("Payload too large", { status: 413 });

  let update: TelegramUpdate;
  try {
    update = JSON.parse(rawBody) as TelegramUpdate;
  } catch {
    return new NextResponse("Invalid payload", { status: 400 });
  }
  if (!Number.isSafeInteger(update.update_id) || !update.message?.chat?.id) return jsonOk();

  const admin = getTelegramAdminClient();
  if (!admin) return NextResponse.json({ error: "Telegram integration is not configured." }, { status: 503 });
  const chatId = update.message.chat.id;
  const { data: insertedUpdate, error: updateError } = await admin
    .from("telegram_updates")
    .upsert({ update_id: update.update_id, chat_id: chatId }, { onConflict: "update_id", ignoreDuplicates: true })
    .select("update_id");
  if (updateError) return NextResponse.json({ error: "Unable to accept update." }, { status: 503 });
  if (!insertedUpdate?.length) return jsonOk();

  try {
    await handleTelegramMessage(admin, chatId, update);
  } catch (error) {
    console.error("Telegram webhook processing failed", error instanceof Error ? error.message : "unknown error");
  }
  return jsonOk();
}

async function handleTelegramMessage(admin: ReturnType<typeof getTelegramAdminClient> & object, chatId: number, update: TelegramUpdate) {
  const message = update.message;
  const text = message?.text?.trim() || "";
  const command = parseTelegramCommand(text);
  const from = message?.from;

  if (command?.name === "start") {
    await connectChat(admin, chatId, command.argument, from);
    return;
  }

  const { data: connection } = await admin.from("telegram_connections").select("owner_id, username, first_name").eq("chat_id", chatId).maybeSingle();
  if (!connection) {
    await sendMessage(chatId, "Сначала подключи Telegram в BCC HUB: открой Настройки → Telegram, получи одноразовый код и отправь его командой /start КОД.");
    return;
  }
  await admin.from("telegram_connections").update({ last_seen_at: new Date().toISOString() }).eq("chat_id", chatId);

  if (!command || command.name === "help") return sendMessage(chatId, helpText());
  if (command.name === "today") return sendToday(admin, chatId, connection.owner_id);
  if (command.name === "tasks") return sendTasks(admin, chatId, connection.owner_id);
  if (command.name === "task") return createTask(admin, chatId, connection.owner_id, command.argument, from);
  if (command.name === "note") return createNote(admin, chatId, connection.owner_id, command.argument, from);
  if (command.name === "done") return completeTask(admin, chatId, connection.owner_id, command.argument);
  return sendMessage(chatId, "Не знаю такую команду. Напиши /help, чтобы увидеть доступные действия.");
}

async function connectChat(admin: ReturnType<typeof getTelegramAdminClient> & object, chatId: number, code: string, from: TelegramUpdate["message"] extends never ? never : NonNullable<TelegramUpdate["message"]>["from"]) {
  if (!code) return sendMessage(chatId, "Код подключения не указан. Открой BCC HUB → Настройки → Telegram и отправь: /start КОД.");
  const { data, error } = await admin.rpc("consume_telegram_link_code", {
    p_code_hash: hashTelegramLinkCode(code),
    p_chat_id: chatId,
    p_username: from?.username ?? null,
    p_first_name: from?.first_name ?? null,
    p_last_name: from?.last_name ?? null
  });
  if (error || !data?.[0]?.connected) return sendMessage(chatId, "Код недействителен или уже использован. Создай новый код в Настройках BCC HUB.");
  return sendMessage(chatId, "Telegram подключён к твоему рабочему пространству.\n\n/help — команды\n/task текст — создать задачу\n/note текст — сохранить заметку\n/today — фокус на сегодня");
}

async function sendTasks(admin: ReturnType<typeof getTelegramAdminClient> & object, chatId: number, ownerId: string) {
  const { data, error } = await admin.from("tasks").select("id,title,status,due_date,priority").eq("owner_id", ownerId).is("archived_at", null).not("status", "in", "(Done,Cancelled)").order("due_date", { ascending: true, nullsFirst: false }).limit(10);
  if (error) return sendMessage(chatId, "Не удалось загрузить задачи. Попробуй ещё раз.");
  if (!data?.length) return sendMessage(chatId, "Активных задач нет. Можно создать первую командой /task текст.");
  const lines = data.map((task, index) => `${index + 1}. ${task.title}${task.due_date ? ` — срок ${task.due_date}` : ""}\n   ${task.status || "Inbox"} · ${task.priority || "Normal"}\n   ID: ${task.id}`);
  return sendMessage(chatId, `Активные задачи:\n\n${lines.join("\n\n")}\n\nЧтобы закрыть задачу: /done полный-ID`);
}

async function sendToday(admin: ReturnType<typeof getTelegramAdminClient> & object, chatId: number, ownerId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: tasks }, { data: commitments }] = await Promise.all([
    admin.from("tasks").select("title,status,due_date").eq("owner_id", ownerId).is("archived_at", null).not("status", "in", "(Done,Cancelled)").lte("due_date", today).order("due_date", { ascending: true }).limit(10),
    admin.from("commitments").select("title,status,due_date").eq("owner_id", ownerId).is("archived_at", null).not("status", "in", "(Done,Cancelled)").lte("due_date", today).order("due_date", { ascending: true }).limit(10)
  ]);
  const taskLines = (tasks ?? []).map((item) => `• ${item.title} — ${item.due_date || "срок не указан"}`);
  const commitmentLines = (commitments ?? []).map((item) => `• ${item.title} — ${item.due_date || "срок не указан"}`);
  const result = [`Фокус на сегодня (${today}, UTC):`, "", "Задачи:", ...(taskLines.length ? taskLines : ["• Нет просроченных задач и задач на сегодня"]), "", "Договорённости:", ...(commitmentLines.length ? commitmentLines : ["• Нет просроченных договорённостей"])];
  return sendMessage(chatId, result.join("\n"));
}

async function createTask(admin: ReturnType<typeof getTelegramAdminClient> & object, chatId: number, ownerId: string, argument: string, from: NonNullable<TelegramUpdate["message"]>["from"]) {
  const title = argument.trim();
  if (!title) return sendMessage(chatId, "Напиши текст задачи: /task Подтвердить спикера");
  const { data, error } = await admin.from("tasks").insert({ owner_id: ownerId, title: title.slice(0, 500), status: "Inbox", priority: "Normal", source_type: "Telegram", source_label: telegramDisplayName(from ?? {}), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }).select("id,title").single();
  if (error || !data) return sendMessage(chatId, "Не удалось создать задачу. Попробуй ещё раз.");
  return sendMessage(chatId, `Задача сохранена:\n${data.title}\n\nID: ${data.id}`);
}

async function createNote(admin: ReturnType<typeof getTelegramAdminClient> & object, chatId: number, ownerId: string, argument: string, from: NonNullable<TelegramUpdate["message"]>["from"]) {
  const situation = argument.trim();
  if (!situation) return sendMessage(chatId, "Напиши заметку: /note После встречи нужно отправить follow-up");
  const title = situation.length > 80 ? `${situation.slice(0, 77).trimEnd()}…` : situation;
  const { data, error } = await admin.from("knowledge_cases").insert({ owner_id: ownerId, title, situation, trigger: "Telegram", people: telegramDisplayName(from ?? {}), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }).select("id,title").single();
  if (error || !data) return sendMessage(chatId, "Не удалось сохранить заметку. Попробуй ещё раз.");
  return sendMessage(chatId, `Заметка сохранена в Память:\n${data.title}\n\nID: ${data.id}`);
}

async function completeTask(admin: ReturnType<typeof getTelegramAdminClient> & object, chatId: number, ownerId: string, argument: string) {
  if (!isUuid(argument)) return sendMessage(chatId, "Нужен полный ID задачи из команды /tasks.");
  const { data, error } = await admin.from("tasks").update({ status: "Done", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("owner_id", ownerId).eq("id", argument).select("title").maybeSingle();
  if (error || !data) return sendMessage(chatId, "Задача не найдена в твоём рабочем пространстве.");
  return sendMessage(chatId, `Готово. Задача закрыта:\n${data.title}`);
}

function helpText() {
  return "Команды BCC HUB:\n\n/task текст — создать задачу\n/note текст — сохранить заметку в Память\n/tasks — активные задачи\n/today — просроченное и ближайшее\n/done полный-ID — закрыть задачу\n/help — эта подсказка";
}

async function sendMessage(chatId: number, text: string) {
  await telegramApi("sendMessage", { chat_id: chatId, text: truncateTelegramText(text) });
}
