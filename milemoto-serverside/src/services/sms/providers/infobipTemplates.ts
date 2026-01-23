import { mapInfobipError } from './infobipErrors.js';

type InfobipTemplateResponse = Record<string, unknown>;

type TemplateInfo = {
  name: string;
  status: string;
};

const APPROVED_STATUSES = new Set(['APPROVED', 'APPROVED_BY_WHATSAPP', 'APPROVED_BY_FB', 'ACTIVE']);

function normalizeTemplates(payload: InfobipTemplateResponse): TemplateInfo[] {
  const raw =
    (Array.isArray(payload.templates) && payload.templates) ||
    (Array.isArray(payload.results) && payload.results) ||
    (Array.isArray(payload) && payload) ||
    [];

  if (!Array.isArray(raw)) return [];

  return raw
    .map((entry) => {
      const obj = entry as Record<string, unknown>;
      const name =
        typeof obj.name === 'string'
          ? obj.name
          : typeof obj.templateName === 'string'
            ? obj.templateName
            : '';
      const status =
        typeof obj.status === 'string'
          ? obj.status
          : typeof obj.state === 'string'
            ? obj.state
            : typeof obj.approvalStatus === 'string'
              ? obj.approvalStatus
              : '';
      return { name, status };
    })
    .filter((template) => template.name);
}

export async function fetchInfobipWhatsappTemplates(input: {
  baseUrl: string;
  apiKey: string;
  senderId: string;
}): Promise<TemplateInfo[]> {
  const url = new URL(
    `/whatsapp/2/senders/${encodeURIComponent(input.senderId)}/templates`,
    input.baseUrl
  );
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `App ${input.apiKey}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const friendly = mapInfobipError(body);
    throw new Error(`Infobip templates request failed (${res.status}). ${friendly}`);
  }

  const json = (await res.json().catch(() => ({}))) as InfobipTemplateResponse;
  return normalizeTemplates(json);
}

export async function isInfobipTemplateApproved(input: {
  baseUrl: string;
  apiKey: string;
  senderId: string;
  templateName: string;
}): Promise<boolean> {
  const templates = await fetchInfobipWhatsappTemplates(input);
  const match = templates.find((template) => template.name === input.templateName);
  if (!match) return false;
  return APPROVED_STATUSES.has(match.status.toUpperCase());
}
