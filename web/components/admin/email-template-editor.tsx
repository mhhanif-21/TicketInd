'use client';

import { useRef, useState } from 'react';
import { AlertCircle, Loader2, Save } from 'lucide-react';
import { useToast } from '@/components/admin/toast';
import { adminFetch } from '@/lib/admin/api';
import {
  emailTemplateTokenOptions,
  insertEmailToken,
  validateEmailTemplateDraft,
  type EmailTemplateConfig,
  type EmailTemplateKind,
  type EmailTemplateSaveResponse,
} from '@/lib/admin/email-template';
import { cn } from '@/lib/admin/format';

const inputClassName =
  'w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 py-2.5 text-sm text-on-surface placeholder:text-secondary/60 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60';

export function EmailTemplateEditor({
  eventId,
  kind,
  title,
  description,
  initial,
}: {
  eventId: string;
  kind: EmailTemplateKind;
  title: string;
  description: string;
  initial: EmailTemplateConfig;
}) {
  const { toast } = useToast();
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [active, setActive] = useState(initial.is_active);
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState(initial.body);
  const [lastFocused, setLastFocused] = useState<'subject' | 'body'>('body');
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tokens = initial.token_options.length > 0
    ? initial.token_options
    : emailTemplateTokenOptions(kind);
  const busy = saving || toggling;

  async function persist(isActive: boolean) {
    await adminFetch<EmailTemplateSaveResponse>(
      `/api/v1/events/${eventId}/approval-email-template`,
      {
        method: 'PUT',
        body: JSON.stringify({
          kind,
          is_active: isActive,
          subject,
          body,
        }),
      },
    );
  }

  async function disableTemplate() {
    if (busy) return;
    setError(null);
    setToggling(true);
    const previous = active;
    setActive(false);
    try {
      await persist(false);
      toast({
        variant: 'success',
        title: 'Default email restored',
        description: `${kind === 'otp' ? 'OTP' : 'Ticket'} emails now use the default template.`,
      });
    } catch (disableError) {
      setActive(previous);
      setError(disableError instanceof Error
        ? disableError.message
        : 'The email template status could not be updated.');
    } finally {
      setToggling(false);
    }
  }

  function toggle() {
    if (busy) return;
    if (active) {
      void disableTemplate();
      return;
    }
    setActive(true);
    setError(null);
  }

  async function save() {
    if (busy || !active) return;
    setError(null);
    const validation = validateEmailTemplateDraft(active, subject, body);
    if (validation) {
      setError(validation);
      return;
    }

    setSaving(true);
    try {
      await persist(true);
      toast({
        variant: 'success',
        title: `${kind === 'otp' ? 'OTP' : 'Ticket'} email template saved`,
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'The email template could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  function addToken(token: string) {
    const field = token === 'TICKET_IMAGE' && lastFocused === 'subject'
      ? 'body'
      : lastFocused;
    setLastFocused(field);
    if (field === 'subject') {
      const input = subjectRef.current;
      const start = input?.selectionStart ?? subject.length;
      const end = input?.selectionEnd ?? start;
      const result = insertEmailToken(subject, token, start, end);
      setSubject(result.value);
      requestAnimationFrame(() => {
        input?.focus();
        input?.setSelectionRange(result.cursor, result.cursor);
      });
      return;
    }

    const input = bodyRef.current;
    const start = input?.selectionStart ?? body.length;
    const end = input?.selectionEnd ?? start;
    const result = insertEmailToken(body, token, start, end);
    setBody(result.value);
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(result.cursor, result.cursor);
    });
  }

  return (
    <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-[0_4px_12px_rgba(0,0,0,0.04)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-on-surface">{title}</h2>
          <p className="mt-1 max-w-2xl font-description text-sm text-on-surface-variant">
            {description}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={active}
          aria-label={`Enable custom ${kind} email`}
          onClick={toggle}
          disabled={busy}
          className={cn(
            'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
            active ? 'bg-primary' : 'bg-surface-container-high',
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'inline-block h-5 w-5 rounded-full bg-white shadow transition-transform',
              active ? 'translate-x-5' : 'translate-x-0.5',
            )}
          />
        </button>
      </div>

      {!active ? (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-surface-container-low px-3.5 py-3">
          <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
          <p className="font-description text-xs text-on-surface-variant">
            Default template is currently in use. Turn on the switch to write a custom email.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor={`${kind}-email-subject`} className="block text-sm font-medium text-on-surface">
              Email subject
            </label>
            <input
              id={`${kind}-email-subject`}
              ref={subjectRef}
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              onFocus={() => setLastFocused('subject')}
              placeholder={
                kind === 'otp'
                  ? 'Your verification code for [EVENT_NAME]'
                  : 'Your ticket for [EVENT_NAME]'
              }
              disabled={busy}
              className={`${inputClassName} mt-1.5`}
            />
          </div>

          <div>
            <label htmlFor={`${kind}-email-body`} className="block text-sm font-medium text-on-surface">
              Email body
            </label>
            <textarea
              id={`${kind}-email-body`}
              ref={bodyRef}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              onFocus={() => setLastFocused('body')}
              rows={8}
              disabled={busy}
              placeholder={
                kind === 'otp'
                  ? 'Hi [NAME], your verification code is [CODE].'
                  : 'Hi [NAME], your ticket for [EVENT_NAME] is ready.'
              }
              className={`${inputClassName} mt-1.5 resize-y`}
            />
          </div>

          <div className="rounded-xl border border-outline-variant bg-surface-container-low/60 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-on-surface">Token palette</p>
              <p className="font-description text-[10px] text-on-surface-variant">
                Inserts into {lastFocused === 'subject' ? 'subject' : 'body'}
              </p>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tokens.map((token) => (
                <button
                  key={token}
                  type="button"
                  onClick={() => addToken(token)}
                  disabled={busy}
                  className="rounded-full border border-outline-variant bg-surface-container-lowest px-2.5 py-1 font-mono text-[11px] font-semibold text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                >
                  [{token}]
                </button>
              ))}
            </div>
            <p className="mt-2 font-description text-[11px] leading-relaxed text-on-surface-variant">
              {kind === 'ticket'
                ? '[TICKET_IMAGE] embeds the generated ticket image and is only valid in the body.'
                : 'OTP codes are only delivered by email. Check the token before enabling the template.'}
            </p>
          </div>

          {error ? (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 font-description text-sm text-red-800">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void save()}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition-transform hover:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : (
                <Save aria-hidden="true" className="h-4 w-4" />
              )}
              Save template
            </button>
          </div>
        </div>
      )}

      {!active && error ? (
        <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 font-description text-sm text-red-800">
          {error}
        </p>
      ) : null}
    </section>
  );
}
