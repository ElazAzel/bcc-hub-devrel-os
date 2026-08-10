import { defineConfig, devices } from "@playwright/test";

const testPort = process.env.PLAYWRIGHT_PORT ?? "3004";

export default defineConfig({ testDir: "./e2e", timeout: 30_000, fullyParallel: true, reporter: "list", use: { baseURL: `http://127.0.0.1:${testPort}`, trace: "retain-on-failure" }, webServer: { command: `npm run dev -- --port ${testPort}`, url: `http://127.0.0.1:${testPort}`, reuseExistingServer: true, timeout: 120_000, env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "" } }, projects: [{ name: "mobile", use: { ...devices["Pixel 7"] } }, { name: "desktop", use: { ...devices["Desktop Chrome"] } }] });
