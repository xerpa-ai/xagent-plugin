import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { URL } from "node:url";
import type { IncomingMessage, ServerResponse } from "node:http";
import { exchangeLoopbackCode, initLoopbackAuth } from "./exchange.js";
import type { SavedCredentials } from "./credentials.js";

interface CallbackResult {
  code: string;
  state: string;
}

interface CallbackServer {
  port: number;
  wait: (expectedState: string) => Promise<CallbackResult>;
  close: () => void;
}

interface CallbackState {
  settled: boolean;
  onCallback?: (result: CallbackResult) => void;
}

export async function loginWithLoopback(input: {
  baseUrl: string;
  clientVersion: string;
  openBrowser: boolean;
}): Promise<SavedCredentials> {
  const callback = await waitForCallback();
  try {
    const redirectUri = `http://127.0.0.1:${callback.port}/callback`;
    const init = await initLoopbackAuth({
      baseUrl: input.baseUrl,
      redirectUri,
      clientVersion: input.clientVersion
    });

    if (input.openBrowser) {
      await openBrowser(init.loginUrl);
    } else {
      process.stdout.write(`Open this URL in your browser:\n${init.loginUrl}\n`);
    }

    const result = await callback.wait(init.state);
    return exchangeLoopbackCode({
      baseUrl: input.baseUrl,
      sessionId: init.sessionId,
      state: result.state,
      code: result.code
    });
  } catch (error) {
    callback.close();
    throw error;
  }
}

async function waitForCallback(): Promise<CallbackServer> {
  return new Promise((resolve, reject) => {
    const state: CallbackState = { settled: false };
    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      handleCallbackRequest(req, res, state.onCallback);
    });
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("unable to bind loopback server"));
        return;
      }
      resolve({
        port: address.port,
        close: createCloseServer(server),
        wait: createCallbackWaiter(server, state)
      });
    });
  });
}

function createCloseServer(server: ReturnType<typeof createServer>): () => void {
  return () => server.close();
}

function createCallbackWaiter(
  server: ReturnType<typeof createServer>,
  state: CallbackState
): (expectedState: string) => Promise<CallbackResult> {
  return (expectedState) => waitForSingleCallback({
    expectedState,
    state,
    close: createCloseServer(server)
  });
}

function handleCallbackRequest(
  req: IncomingMessage,
  res: ServerResponse,
  onCallback: ((result: CallbackResult) => void) | undefined
): void {
  if (!req.url) {
    res.statusCode = 400;
    res.end("missing url");
    return;
  }
  const parsed = new URL(req.url, "http://127.0.0.1");
  const code = parsed.searchParams.get("code") ?? "";
  const state = parsed.searchParams.get("state") ?? "";
  res.statusCode = 200;
  res.end("XAgent CLI login completed. You can return to terminal.");
  onCallback?.({ code, state });
}

function waitForSingleCallback(input: {
  expectedState: string;
  state: CallbackState;
  close: () => void;
}): Promise<CallbackResult> {
  return new Promise((resolveWait, rejectWait) => {
    const timer = setTimeout(() => {
      if (!input.state.settled) {
        input.state.settled = true;
        input.close();
        rejectWait(new Error("timeout waiting for browser callback"));
      }
    }, 120_000);
    input.state.onCallback = ({ code, state }) => {
      if (input.state.settled) {
        return;
      }
      input.state.settled = true;
      clearTimeout(timer);
      input.close();
      if (!code || state !== input.expectedState) {
        rejectWait(new Error("invalid callback state or code"));
        return;
      }
      resolveWait({ code, state });
    };
  });
}

async function openBrowser(url: string): Promise<void> {
  let cmd = "xdg-open";
  let args = [url];
  if (process.platform === "darwin") {
    cmd = "open";
  }
  if (process.platform === "win32") {
    cmd = "cmd";
    args = ["/c", "start", "", url];
  }
  await new Promise<void>((resolve) => {
    execFile(cmd, args, () => resolve());
  });
}
