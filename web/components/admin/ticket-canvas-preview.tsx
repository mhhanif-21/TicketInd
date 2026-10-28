'use client';

import type { CSSProperties } from 'react';
import { QrCode } from 'lucide-react';
import {
  TICKET_TEMPLATE_CANVAS_WIDTH,
  ticketElementSample,
  type TicketTemplateElement,
  type TicketTemplateSample,
} from '@/lib/admin/ticket-template';

const canvasContainerStyle = {
  containerType: 'inline-size',
} as CSSProperties;

const qrContainerStyle = {
  containerType: 'size',
} as CSSProperties;

export function TicketCanvasPreview({
  backgroundUrl,
  elements,
  sample,
  aspectRatio = 3 / 4,
  className,
}: {
  backgroundUrl: string | null;
  elements: TicketTemplateElement[];
  sample?: TicketTemplateSample;
  aspectRatio?: number;
  className?: string;
}) {
  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border border-outline-variant bg-surface-container ${className ?? ''}`}
      style={{
        ...canvasContainerStyle,
        aspectRatio: String(aspectRatio),
      }}
    >
      {backgroundUrl ? (
        // A signed Supabase URL is intentionally rendered as a plain image.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={backgroundUrl}
          alt="Ticket template background"
          className="absolute inset-0 h-full w-full"
          style={{ objectFit: 'fill' }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-container px-6 text-center">
          <p className="font-description text-sm text-on-surface-variant">
            Upload a background image to preview the custom ticket.
          </p>
        </div>
      )}

      {backgroundUrl ? elements.map((element, index) => {
        const boxStyle: CSSProperties = {
          left: `${element.x * 100}%`,
          top: `${element.y * 100}%`,
          width: `${element.width * 100}%`,
          height: `${element.height * 100}%`,
        };

        if (element.type === 'qr') {
          return (
            <div
              key={`qr-${index}`}
              className="absolute flex items-center justify-center"
              style={{ ...boxStyle, ...qrContainerStyle }}
            >
              <div
                className="flex items-center justify-center rounded-[2px] bg-white p-[5%]"
                style={{
                  width: 'min(100cqw, 100cqh)',
                  height: 'min(100cqw, 100cqh)',
                }}
              >
                <QrCode aria-hidden="true" className="h-full w-full text-black" strokeWidth={1.6} />
              </div>
            </div>
          );
        }

        return (
          <div
            key={`${element.type}-${element.token ?? ''}-${index}`}
            className="absolute flex items-center justify-center overflow-hidden px-0.5 text-center"
            style={boxStyle}
          >
            <span
              className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap font-bold leading-none"
              style={{
                color: element.color,
                fontSize: `${(element.fontSize / TICKET_TEMPLATE_CANVAS_WIDTH) * 100}cqw`,
              }}
            >
              {ticketElementSample(element, sample)}
            </span>
          </div>
        );
      }) : null}
    </div>
  );
}
