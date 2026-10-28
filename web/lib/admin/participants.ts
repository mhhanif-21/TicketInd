import type {
  AdminParticipant,
  AdminParticipantFilters,
} from '@/lib/admin/types';

export interface ParticipantAnswerRow {
  fieldKey: string;
  label: string;
  value: string;
  rawValue: unknown;
  isFile: boolean;
  isImage: boolean;
  mimeType: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function humanizeAnswerKey(key: string): string {
  const fieldNumber = /^field_?(\d+)$/i.exec(key);
  if (fieldNumber) return `Field ${fieldNumber[1]}`;

  const separated = key.replace(/[_-]+/g, ' ').trim();
  if (!separated) return 'Answer';
  return separated.charAt(0).toUpperCase() + separated.slice(1);
}

export function displayParticipantAnswerValue(value: unknown): string {
  if (value === null || value === undefined) return '—';

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || '—';
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (Array.isArray(value)) {
    const items = value
      .map(displayParticipantAnswerValue)
      .filter((item) => item !== '—');
    return items.length > 0 ? items.join(', ') : '—';
  }

  if (typeof value === 'object') {
    const record = asRecord(value);
    if (!record) return '—';

    const fileName = record.fileName;
    if (typeof fileName === 'string' && fileName.trim()) return fileName.trim();

    const entries = Object.entries(record)
      .filter(([key]) => key !== 'path')
      .map(([key, item]) => `${key}: ${displayParticipantAnswerValue(item)}`)
      .filter((entry) => !entry.endsWith(': —'));
    return entries.length > 0 ? entries.join(', ') : '—';
  }

  return String(value).trim() || '—';
}

function fileMimeType(rawValue: unknown, value: string): string {
  const record = asRecord(rawValue);
  const declared = typeof record?.type === 'string' ? record.type.trim().toLowerCase() : '';
  if (declared) return declared;

  const lowerName = value.toLowerCase();
  if (lowerName.endsWith('.pdf')) return 'application/pdf';
  if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) return 'image/jpeg';
  if (lowerName.endsWith('.png')) return 'image/png';
  if (lowerName.endsWith('.webp')) return 'image/webp';
  return 'application/octet-stream';
}

/**
 * Uses the immutable label snapshot from registration time, then fills in any
 * answers that are missing from the snapshot. This keeps historical labels
 * stable even if the event form is edited later.
 */
export function buildParticipantAnswerRows({
  answers,
  answerFieldLabels,
}: {
  answers: unknown;
  answerFieldLabels: unknown;
}): ParticipantAnswerRow[] {
  const answerMap = asRecord(answers) ?? {};
  const labelMap = asRecord(answerFieldLabels) ?? {};
  const keys = [...Object.keys(labelMap)];

  for (const key of Object.keys(answerMap)) {
    if (!keys.includes(key)) keys.push(key);
  }

  return keys.map((key) => {
    const configuredLabel = labelMap[key];
    const label = typeof configuredLabel === 'string' && configuredLabel.trim()
      ? configuredLabel.trim()
      : humanizeAnswerKey(key);
    const rawValue = answerMap[key];
    const value = displayParticipantAnswerValue(rawValue);
    const isFile = typeof asRecord(rawValue)?.fileName === 'string'
      && Boolean((asRecord(rawValue)?.fileName as string).trim());
    const mimeType = isFile ? fileMimeType(rawValue, value) : '';

    return {
      fieldKey: key,
      label,
      value,
      rawValue,
      isFile,
      isImage: isFile && mimeType.startsWith('image/'),
      mimeType,
    };
  });
}

const ORGANIZATION_LABELS = [
  'organisasi',
  'organization',
  'company',
  'perusahaan',
  'instansi',
];

export function participantOrganizationValue({
  answers,
  answerFieldLabels,
}: {
  answers: unknown;
  answerFieldLabels: unknown;
}): string {
  for (const row of buildParticipantAnswerRows({ answers, answerFieldLabels })) {
    const normalizedLabel = row.label.toLowerCase().trim();
    if (ORGANIZATION_LABELS.some((candidate) => (
      normalizedLabel === candidate || normalizedLabel.includes(candidate)
    ))) {
      return row.value;
    }
  }
  return '—';
}

export function buildParticipantListQuery(filters: AdminParticipantFilters): string {
  const params = new URLSearchParams({
    page: String(filters.page),
    limit: String(filters.limit),
    sort: filters.sort,
  });

  const search = filters.search.trim();
  if (search) params.set('search', search);
  if (filters.status !== 'all') params.set('status', filters.status);
  if (filters.attendance !== 'all') {
    params.set('attendance', filters.attendance === 'present' ? 'true' : 'false');
  }
  if (filters.startDate) params.set('start_date', filters.startDate);
  if (filters.endDate) params.set('end_date', filters.endDate);

  return params.toString();
}

/**
 * Supabase storage honors the `download` query flag for cross-origin files
 * where the HTML download attribute is ignored.
 */
export function withDownloadFileName(
  url: string | null | undefined,
  fileName: string,
): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    parsed.searchParams.set('download', fileName);
    return parsed.toString();
  } catch {
    return null;
  }
}

export function participantTicketDownloadUrl(
  qrCodeUrl: string | null | undefined,
  ticketCode: string | null | undefined,
): string | null {
  const safeCode = (ticketCode ?? 'ticket').replace(/[^a-z0-9_-]+/gi, '') || 'ticket';
  return withDownloadFileName(qrCodeUrl, `ticket-${safeCode}.png`);
}

export function participantTicketNeedsRetry(
  participant: Pick<AdminParticipant, 'status' | 'qrCodeUrl' | 'ticketJobStatus'>,
): boolean {
  if (participant.status !== 'Accepted') return false;
  if (participant.ticketJobStatus === 'failed') return true;
  // A missing QR with an existing queued/processing/completed job is not a
  // retryable failure. Only legacy accepted rows without any job can be
  // safely re-queued.
  return !participant.qrCodeUrl && !participant.ticketJobStatus;
}

export function participantHasDownloadableTicket(
  participant: Pick<AdminParticipant, 'status' | 'qrCodeUrl' | 'ticketCode'>,
): boolean {
  return participant.status === 'Accepted'
    && Boolean(participantTicketDownloadUrl(participant.qrCodeUrl, participant.ticketCode));
}
