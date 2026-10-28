export type EmailTemplateKind = 'otp' | 'ticket';

export interface EmailTemplateConfig {
  kind: EmailTemplateKind;
  is_active: boolean;
  subject: string;
  body: string;
  token_options: string[];
}

export interface EmailTemplateResponse {
  status: 'success';
  data: EmailTemplateConfig;
}

export interface EmailTemplateSaveResponse {
  status: 'success';
  message?: string;
}

export const EMAIL_TEMPLATE_TOKEN_OPTIONS: Record<EmailTemplateKind, readonly string[]> = {
  otp: ['NAME', 'EMAIL', 'EVENT_NAME', 'CODE', 'WHATSAPP_GROUP_LINK'],
  ticket: ['NAME', 'EMAIL', 'EVENT_NAME', 'TICKET_IMAGE'],
};

export function emailTemplateTokenOptions(kind: EmailTemplateKind): string[] {
  return [...EMAIL_TEMPLATE_TOKEN_OPTIONS[kind]];
}

export interface InsertEmailTokenResult {
  value: string;
  cursor: number;
}

export function insertEmailToken(
  value: string,
  token: string,
  selectionStart: number,
  selectionEnd: number,
): InsertEmailTokenResult {
  const start = Math.max(0, Math.min(selectionStart, value.length));
  const end = Math.max(start, Math.min(selectionEnd, value.length));
  const inserted = `[${token}]`;
  return {
    value: `${value.slice(0, start)}${inserted}${value.slice(end)}`,
    cursor: start + inserted.length,
  };
}

export function validateEmailTemplateDraft(
  active: boolean,
  subject: string,
  body: string,
): string | null {
  if (!active) return null;
  if (!subject.trim()) return 'Email subject is required when the custom template is enabled.';
  if (!body.trim()) return 'Email body is required when the custom template is enabled.';
  return null;
}
