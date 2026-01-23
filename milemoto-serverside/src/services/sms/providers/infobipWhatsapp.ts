import { mapInfobipError } from './infobipErrors.js';

type InfobipWhatsappPayload = {
  baseUrl: string;
  apiKey: string;
  senderId: string;
  toNumber: string;
  templateName: string;
  language: string;
  placeholders: string[];
};

export async function sendInfobipWhatsapp({
  baseUrl,
  apiKey,
  senderId,
  toNumber,
  templateName,
  language,
  placeholders,
}: InfobipWhatsappPayload): Promise<{ ok: true; messageId?: string; raw?: unknown }> {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
  const url = `${normalizedBaseUrl}/whatsapp/1/message/template`;

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
          to: toNumber,
          content: {
            templateName,
            templateData: {
              body: {
                placeholders,
              },
            },
            language,
          },
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
