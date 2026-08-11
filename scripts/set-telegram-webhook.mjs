const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const appUrl = process.env.APP_URL?.replace(/\/$/, "");
const commands = [
  { command: "start", description: "Подключить рабочее пространство" },
  { command: "task", description: "Создать задачу" },
  { command: "note", description: "Сохранить заметку" },
  { command: "tasks", description: "Показать активные задачи" },
  { command: "today", description: "Показать фокус на сегодня" },
  { command: "done", description: "Закрыть задачу по ID" },
  { command: "help", description: "Показать все команды" }
];

if (!token || !secret || !appUrl) {
  console.error("Нужны TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET и APP_URL.");
  process.exit(1);
}
if (!/^https:\/\//i.test(appUrl)) {
  console.error("APP_URL должен начинаться с https://.");
  process.exit(1);
}

async function telegramApi(method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload)
  });
  const result = await response.json();
  if (!response.ok || !result.ok) {
    console.error(`Telegram API: ${result.description || "неизвестная ошибка"}`);
    process.exit(1);
  }
}

await telegramApi("setWebhook", {
  url: `${appUrl}/api/telegram/webhook`,
  secret_token: secret,
  allowed_updates: ["message"],
  drop_pending_updates: false
});

await telegramApi("setMyCommands", { commands });

console.log(`Telegram webhook и меню команд настроены: ${appUrl}/api/telegram/webhook`);
