type InfobipErrorResponse = {
  requestError?: {
    serviceException?: {
      messageId?: string;
      text?: string;
    };
  };
  error?: {
    message?: string;
  };
};

function extractRawErrorMessage(detail: string): string {
  if (!detail) return '';
  try {
    const parsed = JSON.parse(detail) as InfobipErrorResponse;
    return parsed.requestError?.serviceException?.text ?? parsed.error?.message ?? detail;
  } catch {
    return detail;
  }
}

export function mapInfobipError(detail: string): string {
  const raw = extractRawErrorMessage(detail).trim();
  if (!raw) return 'Request failed. Please verify your Infobip settings.';

  const lower = raw.toLowerCase();

  if (
    lower.includes('unauthorized') ||
    lower.includes('not authorized') ||
    lower.includes('api key')
  ) {
    return 'API key is invalid or missing. Please check your Infobip API key.';
  }
  if (lower.includes('credit') || lower.includes('insufficient')) {
    return 'Insufficient credits on your Infobip account. Please top up.';
  }
  if (
    lower.includes('sender') &&
    (lower.includes('not registered') || lower.includes('not approved'))
  ) {
    return 'Sender ID is not approved. Verify the sender before sending messages.';
  }
  if (
    lower.includes('template') &&
    (lower.includes('not approved') || lower.includes('not found'))
  ) {
    return 'WhatsApp template is not approved or not found. Choose an approved template.';
  }
  if (lower.includes('number') && (lower.includes('invalid') || lower.includes('not valid'))) {
    return 'Phone number is invalid. Use E.164 format with country code.';
  }
  if (lower.includes('throttl') || lower.includes('rate limit')) {
    return 'Request was throttled. Please wait and try again.';
  }

  return raw;
}
