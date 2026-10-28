import { describe, expect, it } from 'vitest';
import {
  emailTemplateTokenOptions,
  insertEmailToken,
  validateEmailTemplateDraft,
} from '@/lib/admin/email-template';

describe('admin email template helpers', () => {
  it('inserts a token at the current selection', () => {
    expect(insertEmailToken('Hello , welcome', 'NAME', 6, 6)).toEqual({
      value: 'Hello [NAME], welcome',
      cursor: 12,
    });
    expect(insertEmailToken('Hello old', 'NAME', 6, 9)).toEqual({
      value: 'Hello [NAME]',
      cursor: 12,
    });
  });

  it('provides separate OTP and ticket token palettes', () => {
    expect(emailTemplateTokenOptions('otp')).toContain('CODE');
    expect(emailTemplateTokenOptions('otp')).toContain('WHATSAPP_GROUP_LINK');
    expect(emailTemplateTokenOptions('ticket')).toContain('TICKET_IMAGE');
    expect(emailTemplateTokenOptions('ticket')).not.toContain('CODE');
  });

  it('requires subject and body only when custom email is active', () => {
    expect(validateEmailTemplateDraft(false, '', '')).toBeNull();
    expect(validateEmailTemplateDraft(true, '', 'Body')).toContain('subject');
    expect(validateEmailTemplateDraft(true, 'Subject', '  ')).toContain('body');
    expect(validateEmailTemplateDraft(true, 'Subject', 'Body')).toBeNull();
  });
});
