import { initDeviceAuth, pollDeviceToken } from "./exchange.js";
import type { SavedCredentials } from "./credentials.js";

export async function loginWithDeviceCode(input: {
  baseUrl: string;
  clientVersion: string;
}): Promise<SavedCredentials> {
  const start = Date.now();
  const init = await initDeviceAuth({
    baseUrl: input.baseUrl,
    clientVersion: input.clientVersion
  });
  process.stdout.write(`User code: ${init.userCode}\n`);
  process.stdout.write(`Open: ${init.verificationUriComplete || init.verificationUri}\n`);

  const deadline = Date.now() + init.expiresIn * 1000;
  let intervalMs = Math.max(init.interval, 2) * 1000;
  while (Date.now() < deadline) {
    try {
      return await pollDeviceToken({ baseUrl: input.baseUrl, deviceCode: init.deviceCode });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("slow_down")) {
        intervalMs += 1000;
      } else if (!message.includes("authorization_pending")) {
        throw error;
      }
    }
    await sleep(intervalMs);
  }
  throw new Error(`device login expired after ${Math.floor((Date.now() - start) / 1000)}s`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
