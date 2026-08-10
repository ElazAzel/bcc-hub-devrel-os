import { expect, test } from "@playwright/test";

test("workspace opens and has no horizontal overflow", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test("quick add opens from the mobile navigation", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Быстро добавить" }).last().click();
  await expect(page.getByRole("dialog")).toContainText("Быстрое добавление");
});
