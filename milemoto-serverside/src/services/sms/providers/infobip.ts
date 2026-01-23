import { mapInfobipError } from './infobipErrors.js';

type InfobipPayload = {
  baseUrl: string;
  apiKey: string;
  senderId: string;
  toNumber: string;
  message: string;
};

export async function sendInfobipSms({
  baseUrl,
  apiKey,
  senderId,
  toNumber,
  message,
}: InfobipPayload): Promise<{ ok: true; messageId?: string; raw?: unknown }> {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
  const url = `${normalizedBaseUrl}/sms/2/text/advanced`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `App ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      messages: [
        {
          from: senderId,
          destinations: [{ to: toNumber }],
          text: message,
        },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    const friendly = mapInfobipError(detail);
    throw new Error(`Infobip request failed (${res.status}). ${friendly}`);
  }

  let raw: unknown = null;
  try {
    raw = await res.json();
  } catch {
    raw = null;
  }

  const messageId =
    (raw as { messages?: Array<{ messageId?: string }> } | null)?.messages?.[0]?.messageId ??
    undefined;

  const result: { ok: true; messageId?: string; raw?: unknown } = {
    ok: true,
    raw,
  };
  if (messageId) {
    result.messageId = messageId;
  }
  return result;
}
