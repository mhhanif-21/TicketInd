import { QrCode, Ticket } from 'lucide-react';
import { formatEventDateTime } from '@/lib/admin/format';

export function DefaultTicketPreview({
  eventName,
  eventDate,
  location,
}: {
  eventName: string;
  eventDate: string;
  location: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between gap-3 border-b border-outline-variant px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-on-primary">
            <Ticket aria-hidden="true" className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-bold tracking-tight text-on-surface">Event Gate</p>
            <p className="font-label-caps text-[9px] uppercase tracking-[0.16em] text-secondary">
              Event ticket
            </p>
          </div>
        </div>
        <span className="rounded-full border border-outline-variant px-2 py-0.5 font-label-caps text-[9px] uppercase tracking-[0.08em] text-secondary">
          Default design
        </span>
      </div>

      <div className="grid gap-5 p-5 sm:grid-cols-[1fr_132px]">
        <div className="min-w-0">
          <p className="font-label-caps text-[9px] uppercase tracking-[0.14em] text-secondary">
            Event
          </p>
          <p className="mt-1 line-clamp-2 text-lg font-semibold leading-tight text-on-surface">
            {eventName || 'Your event name'}
          </p>
          <dl className="mt-4 space-y-2">
            <div>
              <dt className="font-label-caps text-[9px] uppercase tracking-[0.12em] text-secondary">Date</dt>
              <dd className="mt-0.5 text-xs font-medium text-on-surface">{formatEventDateTime(eventDate)}</dd>
            </div>
            <div>
              <dt className="font-label-caps text-[9px] uppercase tracking-[0.12em] text-secondary">Location</dt>
              <dd className="mt-0.5 line-clamp-2 text-xs font-medium text-on-surface">{location || 'Event location'}</dd>
            </div>
            <div>
              <dt className="font-label-caps text-[9px] uppercase tracking-[0.12em] text-secondary">Attendee</dt>
              <dd className="mt-0.5 text-xs font-medium text-on-surface">Participant name</dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-3">
          <QrCode aria-hidden="true" className="h-20 w-20 text-on-surface" />
          <p className="mt-2 font-mono text-xs font-semibold tracking-[0.18em] text-on-surface">
            A1B2C3D4
          </p>
          <p className="mt-0.5 font-label-caps text-[8px] uppercase tracking-[0.12em] text-secondary">
            Ticket code
          </p>
        </div>
      </div>
    </div>
  );
}
