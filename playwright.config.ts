import { defineConfig, devices } from "@playwright/test";

const testPort = process.env.PLAYWRIGHT_PORT ?? "3004";

export default defineConfig({ testDir: "./e2e", timeout: 30_000, fullyParallel: true, reporter: "list", use: { baseURL: `http://127.0.0.1:${testPort}`, trace: "retain-on-failure", screenshot: "only-on-failure" }, webServer: { command: `node node_modules/next/dist/bin/next dev --port ${testPort}`, url: `http://127.0.0.1:${testPort}`, reuseExistingServer: false, gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 }, timeout: 120_000, env: { ...process.env, PLAYWRIGHT_TEST: "1", NEXT_PUBLIC_DATA_MODE: "local", NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "" } }, projects: [{ name: "mobile", use: { ...devices["Pixel 7"] } }, { name: "tablet", use: { viewport: { width: 768, height: 1024 }, isMobile: false } }, { name: "desktop", use: { ...devices["Desktop Chrome"] } }] });
