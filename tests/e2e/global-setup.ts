import { mkdirSync } from "node:fs";
import { chromium, type FullConfig } from "@playwright/test";

export const DEV_HOST = { email: "admin@local.test", password: "local-dev-password" };

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL ?? "http://localhost:3000";
  mkdirSync("tests/e2e/.auth", { recursive: true });
  const browser = await chromium.launch({ channel: "chrome" });
  const context = await browser.newContext({ baseURL });
  const res = await context.request.post("/auth/dev-login", { form: DEV_HOST, maxRedirects: 0 });
  if (res.status() !== 303) {
    throw new Error(`dev-login failed (${res.status()}). Is DEV_LOGIN_ENABLED=true and the dev host created?`);
  }
  await context.storageState({ path: "tests/e2e/.auth/host.json" });
  await browser.close();
}
