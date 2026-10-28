'use client';

import { Loader2, Mail, RefreshCw } from 'lucide-react';
import { EmailTemplateEditor } from '@/components/admin/email-template-editor';
import { useAdminEmailTemplate } from '@/lib/admin/queries/templates';

function EmailLoading({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-outline-variant bg-surface-container-lowest px-4 py-8 text-sm text-on-surface-variant">
      <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
      Loading {label}...
    </div>
  );
}

function EmailError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4">
      <p role="alert" className="font-description text-sm text-red-800">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 inline-flex items-center gap-2 rounded-xl border border-red-300 bg-surface-container-lowest px-3 py-2 text-xs font-semibold text-red-800 transition-colors hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600"
      >
        <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
        Try again
      </button>
    </div>
  );
}

export function EmailTemplateSection({
  eventId,
  enabled,
}: {
  eventId: string;
  enabled: boolean;
}) {
  const otpQuery = useAdminEmailTemplate(eventId, 'otp', enabled);
  const ticketQuery = useAdminEmailTemplate(eventId, 'ticket', enabled);

  if (!enabled) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-container text-on-surface">
          <Mail aria-hidden="true" className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-on-surface">Manual review emails</h2>
          <p className="mt-0.5 max-w-2xl font-description text-sm text-on-surface-variant">
            Customize the OTP email and the ticket email sent after a participant is approved.
            Only active templates replace the default Event Gate email.
          </p>
        </div>
      </div>

      {otpQuery.isLoading ? (
        <EmailLoading label="OTP template" />
      ) : otpQuery.isError || !otpQuery.data?.data ? (
        <EmailError
          message={otpQuery.error instanceof Error
            ? otpQuery.error.message
            : 'OTP email template could not be loaded.'}
          onRetry={() => void otpQuery.refetch()}
        />
      ) : (
        <EmailTemplateEditor
          key={`otp-${eventId}`}
          eventId={eventId}
          kind="otp"
          title="Email OTP"
          description="Sent when participants verify their registration using an email OTP."
          initial={otpQuery.data.data}
        />
      )}

      {ticketQuery.isLoading ? (
        <EmailLoading label="ticket email template" />
      ) : ticketQuery.isError || !ticketQuery.data?.data ? (
        <EmailError
          message={ticketQuery.error instanceof Error
            ? ticketQuery.error.message
            : 'Ticket email template could not be loaded.'}
          onRetry={() => void ticketQuery.refetch()}
        />
      ) : (
        <EmailTemplateEditor
          key={`ticket-${eventId}`}
          eventId={eventId}
          kind="ticket"
          title="Ticket / approval email"
          description="Sent after a Manual Review participant is approved and their ticket is ready."
          initial={ticketQuery.data.data}
        />
      )}
    </section>
  );
}
