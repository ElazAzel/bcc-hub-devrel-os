import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function createFromQuickAdd(page: Page, type: RegExp, fieldLabel: string, value: string) {
  const quickAdd = page.getByRole("button", { name: "Быстро добавить" }).last();
  await expect(quickAdd).toBeVisible();
  await quickAdd.click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: type }).click();
  await dialog.getByLabel(fieldLabel, { exact: true }).fill(value);
  if (/задачу/i.test(type.source)) {
    await dialog.getByLabel("Тип контекста").selectOption("projects");
    const contextRecord = dialog.getByLabel("Запись контекста");
    await expect(contextRecord.locator("option")).not.toHaveCount(1);
    await contextRecord.selectOption({ index: 1 });
  }
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

test("core routes render without browser errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  for (const path of ["/", "/tasks", "/tasks?view=gantt", "/calendar", "/analytics"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }
  expect(errors).toEqual([]);
});

test("calendar switches between list and calendar views", async ({ page }) => {
  await page.goto("/calendar");

  await expect(page.getByRole("tab", { name: "Календарь" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("calendar-grid")).toBeVisible();
  await expect(page.getByRole("button", { name: "Предыдущий месяц" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Следующий месяц" })).toBeVisible();

  await page.getByRole("button", { name: "Следующий месяц" }).click();
  await expect(page).toHaveURL(/\/calendar\?.*view=calendar.*month=\d{4}-\d{2}/);

  await page.getByRole("tab", { name: "Список" }).click();
  await expect(page).toHaveURL(/\/calendar\?.*view=list/);
  await expect(page.getByRole("tab", { name: "Список" })).toHaveAttribute("aria-selected", "true");
});

test("quick add opens from the mobile navigation", async ({ page }) => {
  await page.goto("/");
  const quickAdd = page.getByRole("button", { name: "Быстро добавить" }).last();
  await expect(quickAdd).toBeVisible();
  await quickAdd.click();
  await expect(page.getByRole("dialog")).toContainText("Быстрое добавление");
});

test("quick add allows records with optional fields left blank", async ({ page }) => {
  await page.goto("/");
  const quickAdd = page.getByRole("button", { name: "Быстро добавить" }).last();
  await quickAdd.click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: /^проект$/i }).click();
  await dialog.getByRole("button", { name: "Создать", exact: true }).click();
  await expect(dialog).toContainText("Запись создана");
  await dialog.getByText("Закрыть", { exact: true }).click();
  await expect(dialog).toBeHidden();
  await quickAdd.click();
  const taskDialog = page.getByRole("dialog");
  await taskDialog.getByRole("button", { name: /^задачу$/i }).click();
  await expect(taskDialog.getByLabel("Статус")).toHaveValue("");
  await expect(taskDialog.getByLabel("Приоритет")).toHaveValue("");
  await taskDialog.getByRole("button", { name: /Показать дополнительные поля/ }).click();
  await expect(taskDialog.locator("[required]")).toHaveCount(0);
  await expect(taskDialog.getByLabel("Время начала")).toHaveValue("");
  await expect(taskDialog.getByLabel("Время окончания")).toHaveValue("");
  await expect(taskDialog.getByLabel("Формат встречи")).toHaveValue("");
  await taskDialog.getByRole("button", { name: "Создать", exact: true }).click();
  await expect(taskDialog).toContainText("Запись создана");
  await taskDialog.getByText("Закрыть", { exact: true }).click();
  await expect(taskDialog).toBeHidden();
});

test("core records persist and global search opens a detail page", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/");
  const suffix = `${test.info().project.name}-${Date.now()}`;
  const taskTitle = `Проверка задачи ${suffix}`;

  await createFromQuickAdd(page, /^проект$/i, "Название", `Проверка проекта ${suffix}`);
  await createFromQuickAdd(page, /^задачу$/i, "Название", taskTitle);
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
  await page.getByRole("button", { name: "Добавить заметку" }).click();
  const noteDialog = page.getByRole("dialog");
  await noteDialog.getByLabel("Заголовок").fill(`Заметка ${suffix}`);
  await noteDialog.getByLabel("Текст заметки").fill("Контекст задачи сохранён рядом с задачей");
  await noteDialog.getByRole("button", { name: "Сохранить заметку" }).click();
  await expect(noteDialog).toBeHidden();
  await expect(page.getByText(`Заметка ${suffix}`, { exact: true })).toBeVisible();
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
  await page.goto("/tasks");
  await expect(page.getByText(/Субзадача ·/).first()).toBeVisible();
  await page.getByRole("button", { name: "Открыть диаграмму Ганта" }).click();
  await expect(page.locator("h1", { hasText: "Диаграмма Ганта" })).toBeVisible();
});

test("task planning dates and @ mentions work in the editor", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/tasks/seed-11");
  await expect(page.getByRole("heading", { name: "Подтвердить спикера" })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Редактировать" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Дата старта", { exact: true }).fill("2026-08-10");
  await dialog.getByLabel("Дата окончания", { exact: true }).fill("2026-08-20");
  const description = dialog.locator("textarea").first();
  await description.fill("Согласовать детали с @Demo");
  await expect(dialog.getByRole("option").filter({ hasText: "@Demo Speaker" })).toBeVisible();
  await dialog.getByRole("option").filter({ hasText: "@Demo Speaker" }).click();
  await dialog.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("link", { name: "@Demo Speaker" })).toHaveAttribute("href", "/people/seed-21");
  await expect(page.getByText(/Период/)).toBeVisible();
});
