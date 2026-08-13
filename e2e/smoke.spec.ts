import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function createFromQuickAdd(page: Page, type: RegExp, fieldLabel: string, value: string) {
  const quickAdd = page.getByRole("button", { name: "Быстро добавить" }).last();
  await expect(quickAdd).toBeVisible();
  await quickAdd.click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: type }).click();
  await dialog.getByLabel(fieldLabel, { exact: true }).fill(value);
  await dialog.getByRole("button", { name: "Создать", exact: true }).click();
  await expect(dialog).toContainText("Запись создана");
  await dialog.getByText("Закрыть", { exact: true }).click();
  await expect(dialog).toBeHidden();
}

test("health endpoint is available without authentication", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBe(true);
  expect(await response.json()).toMatchObject({ status: "ok", mode: "local", supabaseConfigured: false });
});

test("workspace opens and has no horizontal overflow", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test("quick add opens from the mobile navigation", async ({ page }) => {
  await page.goto("/");
  const quickAdd = page.getByRole("button", { name: "Быстро добавить" }).last();
  await expect(quickAdd).toBeVisible();
  await quickAdd.click();
  await expect(page.getByRole("dialog")).toContainText("Быстрое добавление");
});

test("core records persist and global search opens a detail page", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/");
  const suffix = `${test.info().project.name}-${Date.now()}`;
  const taskTitle = `Проверка задачи ${suffix}`;

  await createFromQuickAdd(page, /^задачу$/i, "Название", taskTitle);
  await createFromQuickAdd(page, /^проект$/i, "Название", `Проверка проекта ${suffix}`);
  await createFromQuickAdd(page, /^контакт$/i, "Имя", `Контакт ${suffix}`);
  await createFromQuickAdd(page, /^взаимодействие$/i, "Название", `Встреча ${suffix}`);

  await page.reload();
  const searchButton = page.getByRole("button", { name: /Найти запись|Поиск по рабочему пространству/ }).first();
  await searchButton.click();
  const searchDialog = page.getByRole("dialog");
  await searchDialog.getByPlaceholder("Проект, задача, контакт или действие…").fill(taskTitle);
  await expect(searchDialog.getByText(taskTitle, { exact: true })).toBeVisible();
  await searchDialog.getByText(taskTitle, { exact: true }).click();
  await expect(page).toHaveURL(/\/tasks\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: taskTitle })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: taskTitle })).toBeVisible();
});

test("task detail supports subtasks, comments and relationship map", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/tasks/seed-11");
  await expect(page.getByRole("heading", { name: "Подтвердить спикера" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Субзадачи" })).toBeVisible();

  await page.getByRole("button", { name: "Добавить субзадачу" }).click();
  const subtaskDialog = page.getByRole("dialog");
  await subtaskDialog.getByLabel("Название").fill(`Подзадача ${Date.now()}`);
  await subtaskDialog.getByRole("button", { name: "Создать субзадачу" }).click();
  await expect(subtaskDialog).toBeHidden();
  await expect(page.getByText(/Подзадача \d+/)).toBeVisible();

  await page.getByLabel("Новый комментарий").fill("Контекст сохранён в рабочей записи");
  await page.getByRole("button", { name: "Добавить комментарий" }).click();
  await expect(page.getByText("Контекст сохранён в рабочей записи")).toBeVisible();

  await page.getByRole("tab", { name: "Связи и карта" }).click();
  await expect(page.getByRole("heading", { name: "Связи записи" })).toBeVisible();
  await expect(page.getByText("Центр карты")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
