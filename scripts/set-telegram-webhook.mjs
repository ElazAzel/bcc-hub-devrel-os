const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const appUrl = process.env.APP_URL?.replace(/\/$/, "");

if (!token || !secret || !appUrl) {
  console.error("Нужны TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET и APP_URL.");
  process.exit(1);
}
if (!/^https:\/\//i.test(appUrl)) {
  console.error("APP_URL должен начинаться с https://.");
  process.exit(1);
}

const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    url: `${appUrl}/api/telegram/webhook`,
    secret_token: secret,
    allowed_updates: ["message"],
    drop_pending_updates: false
  })
});
const result = await response.json();
if (!response.ok || !result.ok) {
  console.error("Telegram webhook не удалось настроить.");
  process.exit(1);
}
console.log(`Telegram webhook настроен: ${appUrl}/api/telegram/webhook`);
