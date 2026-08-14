import { NextResponse } from "next/server";
import { escapeTelegramHtml, isUuid, parseContextArgument, parseTelegramCommand, telegramDisplayName, truncateTelegramHtml } from "@/lib/telegram";
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
  if (command.name === "contexts") return sendContexts(admin, chatId, connection.owner_id);
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
  return sendMessage(chatId, "<b>Telegram подключён</b> к твоему рабочему пространству.\n\n<b>Команды</b>\n<code>/help</code> — команды\n<code>/task полный-ID-проекта-или-события | текст</code> — создать задачу\n<code>/note полный-ID-задачи | текст</code> — сохранить заметку\n<code>/today</code> — фокус на сегодня");
}

async function sendTasks(admin: ReturnType<typeof getTelegramAdminClient> & object, chatId: number, ownerId: string) {
  const { data, error } = await admin.from("tasks").select("id,title,status,due_date,priority").eq("owner_id", ownerId).is("archived_at", null).not("status", "in", "(Done,Cancelled)").order("due_date", { ascending: true, nullsFirst: false }).limit(10);
  if (error) return sendMessage(chatId, "Не удалось загрузить задачи. Попробуй ещё раз.");
  if (!data?.length) return sendMessage(chatId, "Активных задач нет. Создай задачу внутри проекта или события: /task ID | текст.");
  const lines = data.map((task, index) => `${index + 1}. <b>${escapeTelegramHtml(task.title)}</b>${task.due_date ? ` — срок <code>${escapeTelegramHtml(task.due_date)}</code>` : ""}\n   ${escapeTelegramHtml(task.status || "Inbox")} · ${escapeTelegramHtml(task.priority || "Normal")}\n   ID: <code>${escapeTelegramHtml(task.id)}</code>`);
  return sendMessage(chatId, `<b>Активные задачи</b>:\n\n${lines.join("\n\n")}\n\nЧтобы закрыть задачу: <code>/done полный-ID</code>`);
}

async function sendToday(admin: ReturnType<typeof getTelegramAdminClient> & object, chatId: number, ownerId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: tasks }, { data: commitments }] = await Promise.all([
    admin.from("tasks").select("title,status,due_date").eq("owner_id", ownerId).is("archived_at", null).not("status", "in", "(Done,Cancelled)").lte("due_date", today).order("due_date", { ascending: true }).limit(10),
    admin.from("commitments").select("title,status,due_date").eq("owner_id", ownerId).is("archived_at", null).not("status", "in", "(Done,Cancelled)").lte("due_date", today).order("due_date", { ascending: true }).limit(10)
  ]);
  const taskLines = (tasks ?? []).map((item) => `• <b>${escapeTelegramHtml(item.title)}</b> — ${escapeTelegramHtml(item.due_date || "срок не указан")}`);
  const commitmentLines = (commitments ?? []).map((item) => `• <b>${escapeTelegramHtml(item.title)}</b> — ${escapeTelegramHtml(item.due_date || "срок не указан")}`);
  const result = [`<b>Фокус на сегодня</b> <code>${today}</code> (UTC):`, "", "<b>Задачи</b>:", ...(taskLines.length ? taskLines : ["• Нет просроченных задач и задач на сегодня"]), "", "<b>Договорённости</b>:", ...(commitmentLines.length ? commitmentLines : ["• Нет просроченных договорённостей"])];
  return sendMessage(chatId, result.join("\n"));
}

async function createTask(admin: ReturnType<typeof getTelegramAdminClient> & object, chatId: number, ownerId: string, argument: string, from: NonNullable<TelegramUpdate["message"]>["from"]) {
  const parsed = parseContextArgument(argument);
  if (!parsed || !isUuid(parsed.contextId)) return sendMessage(chatId, "Формат: /task полный-ID-проекта-или-события | текст задачи");
  const [{ data: project }, { data: event }] = await Promise.all([
    admin.from("projects").select("id").eq("owner_id", ownerId).eq("id", parsed.contextId).maybeSingle(),
    admin.from("events").select("id,project_id").eq("owner_id", ownerId).eq("id", parsed.contextId).maybeSingle()
  ]);
  if (!project && !event) return sendMessage(chatId, "Проект или событие с таким ID не найдено. Получи ID в BCC HUB или командах списка.");
  const { data, error } = await admin.from("tasks").insert({ owner_id: ownerId, title: parsed.text.slice(0, 500), status: "Inbox", priority: "Normal", project_id: project?.id ?? event?.project_id ?? null, event_id: event?.id ?? null, source_type: "Telegram", source_label: telegramDisplayName(from ?? {}), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }).select("id,title").single();
  if (!error && data) await recordTelegramActivity(admin, ownerId, "tasks", data.id, `Created from Telegram: ${data.title}`);
  if (error || !data) return sendMessage(chatId, "Не удалось создать задачу. Попробуй ещё раз.");
  return sendMessage(chatId, `<b>Задача сохранена</b>\n${escapeTelegramHtml(data.title)}\n\nID: <code>${escapeTelegramHtml(data.id)}</code>`);
}

async function createNote(admin: ReturnType<typeof getTelegramAdminClient> & object, chatId: number, ownerId: string, argument: string, from: NonNullable<TelegramUpdate["message"]>["from"]) {
  const parsed = parseContextArgument(argument);
  if (!parsed || !isUuid(parsed.contextId)) return sendMessage(chatId, "Формат: /note полный-ID-задачи | текст заметки");
  const { data: task } = await admin.from("tasks").select("id,title,project_id,event_id").eq("owner_id", ownerId).eq("id", parsed.contextId).maybeSingle();
  if (!task) return sendMessage(chatId, "Задача с таким ID не найдена. Получи полный ID командой /tasks.");
  const title = parsed.text.length > 80 ? `${parsed.text.slice(0, 77).trimEnd()}…` : parsed.text;
  const { data, error } = await admin.from("knowledge_cases").insert({ owner_id: ownerId, title, situation: parsed.text, task_id: task.id, trigger: "Telegram", people: telegramDisplayName(from ?? {}), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }).select("id,title").single();
  if (!error && data) await recordTelegramActivity(admin, ownerId, "knowledge", data.id, `Created from Telegram: ${data.title}`);
  if (error || !data) return sendMessage(chatId, "Не удалось сохранить заметку. Попробуй ещё раз.");
  return sendMessage(chatId, `<b>Заметка сохранена в Память</b>\n${escapeTelegramHtml(data.title)}\n\nID: <code>${escapeTelegramHtml(data.id)}</code>`);
}

async function completeTask(admin: ReturnType<typeof getTelegramAdminClient> & object, chatId: number, ownerId: string, argument: string) {
  if (!isUuid(argument)) return sendMessage(chatId, "Нужен полный ID задачи из команды /tasks.");
  const { data, error } = await admin.from("tasks").update({ status: "Done", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("owner_id", ownerId).eq("id", argument).select("title").maybeSingle();
  if (!error && data) await recordTelegramActivity(admin, ownerId, "tasks", argument, `Task completed from Telegram: ${data.title}`);
  if (error || !data) return sendMessage(chatId, "Задача не найдена в твоём рабочем пространстве.");
  return sendMessage(chatId, `<b>Готово. Задача закрыта</b>\n${escapeTelegramHtml(data.title)}`);
}

function helpText() {
  return "<b>Команды BCC HUB</b>\n\n<code>/contexts</code> — проекты и события для привязки\n<code>/task полный-ID-проекта-или-события | текст</code> — создать задачу\n<code>/note полный-ID-задачи | текст</code> — сохранить заметку в Память\n<code>/tasks</code> — активные задачи\n<code>/today</code> — просроченное и ближайшее\n<code>/done полный-ID</code> — закрыть задачу\n<code>/help</code> — эта подсказка";
}

async function sendContexts(admin: ReturnType<typeof getTelegramAdminClient> & object, chatId: number, ownerId: string) {
  const [{ data: projects }, { data: events }] = await Promise.all([
    admin.from("projects").select("id,title").eq("owner_id", ownerId).is("archived_at", null).order("updated_at", { ascending: false }).limit(10),
    admin.from("events").select("id,title,date_start").eq("owner_id", ownerId).is("archived_at", null).order("date_start", { ascending: false }).limit(10)
  ]);
  const projectLines = (projects ?? []).map((item) => `• <b>Проект:</b> ${escapeTelegramHtml(item.title)}\n  ID: <code>${escapeTelegramHtml(item.id)}</code>`);
  const eventLines = (events ?? []).map((item) => `• <b>Событие:</b> ${escapeTelegramHtml(item.title)}${item.date_start ? ` — ${escapeTelegramHtml(item.date_start)}` : ""}\n  ID: <code>${escapeTelegramHtml(item.id)}</code>`);
  if (!projectLines.length && !eventLines.length) return sendMessage(chatId, "Пока нет проектов или событий. Создай контекст в BCC HUB.");
  return sendMessage(chatId, `<b>Контексты для новых задач</b>\n\n${[...projectLines, ...eventLines].join("\n\n")}\n\nПример: <code>/task ID | Подтвердить спикера</code>`);
}

async function recordTelegramActivity(admin: ReturnType<typeof getTelegramAdminClient> & object, ownerId: string, entityType: string, entityId: string, message: string) {
  if (!entityId) return;
  const { error } = await admin.from("activity_log").insert({ owner_id: ownerId, entity_type: entityType, entity_id: entityId, action: "telegram update", message, created_at: new Date().toISOString() });
  if (error) console.error("Unable to write Telegram activity", error.message);
}

async function sendMessage(chatId: number, text: string) {
  await telegramApi("sendMessage", { chat_id: chatId, text: truncateTelegramHtml(text), parse_mode: "HTML" });
}
