import { apiPost } from "../api/client.js";
import type { SavedCredentials } from "./credentials.js";

export interface CliAuthTokenData {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  accessExpire: number;
  userId: string;
  scope: string;
}

export async function initLoopbackAuth(input: {
  baseUrl: string;
  redirectUri: string;
  clientVersion: string;
}): Promise<{ sessionId: string; state: string; loginUrl: string; expiresIn: number }> {
  return apiPost("/xagent/plugin/cli/auth/init", {
    clientName: "xagent-plugin",
    clientVersion: input.clientVersion,
    redirectUri: input.redirectUri
  }, { baseUrl: input.baseUrl });
}

export async function exchangeLoopbackCode(input: {
  baseUrl: string;
  sessionId: string;
  state: string;
  code: string;
}): Promise<SavedCredentials> {
  const token = await apiPost<CliAuthTokenData>(
    "/xagent/plugin/cli/auth/exchange",
    {
      sessionId: input.sessionId,
      state: input.state,
      code: input.code
    },
    { baseUrl: input.baseUrl }
  );
  return {
    accessToken: token.accessToken,
    refreshToken: token.refreshToken,
    accessExpire: token.accessExpire,
    userId: token.userId,
    scope: token.scope
  };
}

export async function initDeviceAuth(input: {
  baseUrl: string;
  clientVersion: string;
}): Promise<{
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete: string;
  expiresIn: number;
  interval: number;
}> {
  return apiPost(
    "/xagent/plugin/cli/auth/device",
    { clientName: "xagent-plugin", clientVersion: input.clientVersion },
    { baseUrl: input.baseUrl }
  );
}

export async function pollDeviceToken(input: {
  baseUrl: string;
  deviceCode: string;
}): Promise<SavedCredentials> {
  const token = await apiPost<CliAuthTokenData>(
    "/xagent/plugin/cli/auth/token",
    { deviceCode: input.deviceCode },
    { baseUrl: input.baseUrl }
  );
  return {
    accessToken: token.accessToken,
    refreshToken: token.refreshToken,
    accessExpire: token.accessExpire,
    userId: token.userId,
    scope: token.scope
  };
}

export async function refreshAccessToken(input: {
  baseUrl: string;
  refreshToken: string;
}): Promise<SavedCredentials> {
  const token = await apiPost<CliAuthTokenData>(
    "/xagent/plugin/cli/auth/refresh",
    { refreshToken: input.refreshToken },
    { baseUrl: input.baseUrl }
  );
  return {
    accessToken: token.accessToken,
    refreshToken: token.refreshToken,
    accessExpire: token.accessExpire,
    userId: token.userId,
    scope: token.scope
  };
}
