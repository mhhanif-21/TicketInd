import { describe, expect, it } from 'vitest';
import {
  buildParticipantAnswerRows,
  buildParticipantListQuery,
  displayParticipantAnswerValue,
  participantHasDownloadableTicket,
  participantOrganizationValue,
  participantTicketDownloadUrl,
  participantTicketNeedsRetry,
  withDownloadFileName,
} from '@/lib/admin/participants';
import type { AdminParticipantFilters } from '@/lib/admin/types';

const baseFilters: AdminParticipantFilters = {
  page: 2,
  limit: 25,
  search: '',
  status: 'all',
  attendance: 'all',
  sort: 'desc',
  startDate: null,
  endDate: null,
};

describe('admin participant helpers', () => {
  it('builds the server query with pagination, search, status, attendance, and dates', () => {
    expect(buildParticipantListQuery(baseFilters)).toBe('page=2&limit=25&sort=desc');

    const query = buildParticipantListQuery({
      ...baseFilters,
      search: '  ada lovelace  ',
      status: 'Pending',
      attendance: 'present',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
    });
    const params = new URLSearchParams(query);
    expect(params.get('search')).toBe('ada lovelace');
    expect(params.get('status')).toBe('Pending');
    expect(params.get('attendance')).toBe('true');
    expect(params.get('start_date')).toBe('2026-10-01');
    expect(params.get('end_date')).toBe('2026-10-31');
  });

  it('uses the immutable label snapshot and preserves unknown answer keys', () => {
    const rows = buildParticipantAnswerRows({
      answers: {
        field_1: 'Informatics',
        field_2: ['AI', 'Web'],
        field_3: { fileName: 'cv.pdf', type: 'application/pdf', path: 'private/cv.pdf' },
      },
      answerFieldLabels: {
        field_1: 'Major',
        field_2: 'Interests',
        field_3: 'CV',
      },
    });

    expect(rows.map((row) => row.label)).toEqual(['Major', 'Interests', 'CV']);
    expect(rows[1].value).toBe('AI, Web');
    expect(rows[2]).toMatchObject({
      value: 'cv.pdf',
      isFile: true,
      isImage: false,
      mimeType: 'application/pdf',
    });
  });

  it('humanizes answer keys without a snapshot label', () => {
    const rows = buildParticipantAnswerRows({
      answers: { field_4: 'Yes', t_shirt_size: 'L' },
      answerFieldLabels: null,
    });
    expect(rows.map((row) => row.label)).toEqual(['Field 4', 'T shirt size']);
  });

  it('detects image files from MIME type or file extension', () => {
    const rows = buildParticipantAnswerRows({
      answers: {
        photo: { fileName: 'photo.PNG', path: 'private/photo.png' },
        legacy: { fileName: 'scan.jpeg' },
      },
      answerFieldLabels: { photo: 'Photo', legacy: 'Scan' },
    });
    expect(rows[0]).toMatchObject({ isFile: true, isImage: true, mimeType: 'image/png' });
    expect(rows[1]).toMatchObject({ isFile: true, isImage: true, mimeType: 'image/jpeg' });
  });

  it('formats scalar, boolean, object, and empty answers', () => {
    expect(displayParticipantAnswerValue('  Ada  ')).toBe('Ada');
    expect(displayParticipantAnswerValue(true)).toBe('Yes');
    expect(displayParticipantAnswerValue(0)).toBe('0');
    expect(displayParticipantAnswerValue([])).toBe('—');
    expect(displayParticipantAnswerValue(null)).toBe('—');
    expect(displayParticipantAnswerValue({ path: 'secret', note: 'ok' })).toBe('note: ok');
  });

  it('finds the organization answer by a case-insensitive label', () => {
    expect(participantOrganizationValue({
      answers: { field_1: 'PT Contoh' },
      answerFieldLabels: { field_1: 'Nama Organisasi' },
    })).toBe('PT Contoh');
    expect(participantOrganizationValue({ answers: {}, answerFieldLabels: {} })).toBe('—');
  });

  it('adds a Supabase download flag to ticket artwork URLs', () => {
    const url = participantTicketDownloadUrl(
      'https://project.supabase.co/storage/v1/object/public/tickets/a.png?token=abc',
      'A1B2C3D4',
    );
    expect(url).not.toBeNull();
    const parsed = new URL(url!);
    expect(parsed.searchParams.get('token')).toBe('abc');
    expect(parsed.searchParams.get('download')).toBe('ticket-A1B2C3D4.png');
    expect(participantTicketDownloadUrl(null, 'A1B2C3D4')).toBeNull();
    expect(participantTicketDownloadUrl('not a url', 'A1B2C3D4')).toBeNull();
    expect(withDownloadFileName('https://example.com/export.csv', 'demo-participants.csv'))
      .toBe('https://example.com/export.csv?download=demo-participants.csv');
    expect(withDownloadFileName(null, 'demo.csv')).toBeNull();
  });

  it('only retries failed or legacy accepted tickets', () => {
    expect(participantTicketNeedsRetry({
      status: 'Accepted',
      qrCodeUrl: null,
      ticketJobStatus: null,
    })).toBe(true);
    expect(participantTicketNeedsRetry({
      status: 'Accepted',
      qrCodeUrl: null,
      ticketJobStatus: 'queued',
    })).toBe(false);
    expect(participantTicketNeedsRetry({
      status: 'Accepted',
      qrCodeUrl: 'https://example.com/ticket.png',
      ticketJobStatus: 'completed',
    })).toBe(false);
    expect(participantTicketNeedsRetry({
      status: 'Accepted',
      qrCodeUrl: 'https://example.com/ticket.png',
      ticketJobStatus: 'failed',
    })).toBe(true);
    expect(participantTicketNeedsRetry({
      status: 'Pending',
      qrCodeUrl: null,
      ticketJobStatus: 'failed',
    })).toBe(false);
    expect(participantHasDownloadableTicket({
      status: 'Accepted',
      qrCodeUrl: 'https://example.com/ticket.png',
      ticketCode: 'A1B2C3D4',
    })).toBe(true);
  });
});
