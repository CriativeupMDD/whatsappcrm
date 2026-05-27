export type EvolutionConnectionStatus =
  | 'disconnected'
  | 'waiting_qrcode'
  | 'connected'
  | 'error';

interface EvolutionRequestOptions {
  apiUrl: string;
  apiKey: string;
  path: string;
  method?: 'GET' | 'POST' | 'DELETE';
  body?: Record<string, unknown>;
}

function baseUrl(apiUrl: string) {
  return apiUrl.replace(/\/+$/, '');
}

async function evolutionRequest({
  apiUrl,
  apiKey,
  path,
  method = 'GET',
  body,
}: EvolutionRequestOptions) {
  const response = await fetch(`${baseUrl(apiUrl)}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      apikey: apiKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message =
      data?.message || data?.error || `Evolution API returned ${response.status}`;
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }

  return data;
}

export function mapEvolutionStatus(value: unknown): EvolutionConnectionStatus {
  const raw =
    typeof value === 'string'
      ? value
      : typeof value === 'object' && value
        ? String(
            (value as { state?: unknown; status?: unknown; instance?: { state?: unknown } })
              .state ??
              (value as { status?: unknown }).status ??
              (value as { instance?: { state?: unknown } }).instance?.state ??
              ''
          )
        : '';
  const status = raw.toLowerCase();

  if (['open', 'connected', 'connect', 'online'].includes(status)) {
    return 'connected';
  }
  if (['connecting', 'qrcode', 'qr', 'pairing', 'waiting_qrcode'].includes(status)) {
    return 'waiting_qrcode';
  }
  if (['close', 'closed', 'disconnected', 'logout', 'offline'].includes(status)) {
    return 'disconnected';
  }
  return status ? 'error' : 'disconnected';
}

export function extractQrCode(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const data = payload as Record<string, unknown>;
  const nested = data.base64 ?? data.qrcode ?? data.qr ?? data.code;
  if (typeof nested === 'string') return nested;

  const instance = data.instance;
  if (instance && typeof instance === 'object') {
    const nestedInstance = instance as Record<string, unknown>;
    const qr = nestedInstance.base64 ?? nestedInstance.qrcode ?? nestedInstance.qr;
    if (typeof qr === 'string') return qr;
  }

  return null;
}

export async function createOrConnectEvolutionInstance(input: {
  apiUrl: string;
  apiKey: string;
  instanceName: string;
}) {
  try {
    await evolutionRequest({
      apiUrl: input.apiUrl,
      apiKey: input.apiKey,
      path: '/instance/create',
      method: 'POST',
      body: {
        instanceName: input.instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    if (!message.includes('exist') && !message.includes('already')) {
      throw error;
    }
  }

  return evolutionRequest({
    apiUrl: input.apiUrl,
    apiKey: input.apiKey,
    path: `/instance/connect/${encodeURIComponent(input.instanceName)}`,
  });
}

export async function getEvolutionStatus(input: {
  apiUrl: string;
  apiKey: string;
  instanceName: string;
}) {
  return evolutionRequest({
    apiUrl: input.apiUrl,
    apiKey: input.apiKey,
    path: `/instance/connectionState/${encodeURIComponent(input.instanceName)}`,
  });
}

export async function disconnectEvolution(input: {
  apiUrl: string;
  apiKey: string;
  instanceName: string;
}) {
  return evolutionRequest({
    apiUrl: input.apiUrl,
    apiKey: input.apiKey,
    path: `/instance/logout/${encodeURIComponent(input.instanceName)}`,
    method: 'DELETE',
  });
}
