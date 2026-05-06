export interface ApiClientOptions {
  baseUrl: string;
  accessToken?: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

export async function apiPost<TResponse>(
  path: string,
  payload: unknown,
  options: ApiClientOptions
): Promise<TResponse> {
  return request<TResponse>("POST", path, payload, options);
}

export async function apiGet<TResponse>(path: string, options: ApiClientOptions): Promise<TResponse> {
  return request<TResponse>("GET", path, undefined, options);
}

async function request<TResponse>(
  method: "GET" | "POST",
  path: string,
  payload: unknown,
  options: ApiClientOptions
): Promise<TResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 15_000);
  try {
    const headers: Record<string, string> = {
      "content-type": "application/json"
    };
    if (options.accessToken) {
      headers.Authorization = `Bearer ${options.accessToken}`;
    }
    if (options.headers) {
      Object.assign(headers, options.headers);
    }
    const response = await fetch(new URL(path, normalizeBaseUrl(options.baseUrl)), {
      method,
      headers,
      body: payload === undefined ? undefined : JSON.stringify(payload),
      signal: controller.signal
    });
    const body = await readJsonEnvelope<TResponse>(response);
    if (!response.ok) {
      throw new Error(body.msg ?? `request failed: ${response.status}`);
    }
    if (body.success === false) {
      throw new Error(body.msg ?? `request failed with code ${body.code ?? "unknown"}`);
    }
    return (body.data ?? body) as TResponse;
  } finally {
    clearTimeout(timeout);
  }
}

async function readJsonEnvelope<TResponse>(response: Response): Promise<{
  success?: boolean;
  code?: number;
  data?: TResponse;
  msg?: string;
}> {
  try {
    return await response.json() as {
      success?: boolean;
      code?: number;
      data?: TResponse;
      msg?: string;
    };
  } catch {
    return {};
  }
}

export function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}
