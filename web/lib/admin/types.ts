export type EventStatus = 'Draft' | 'Published' | 'Cancelled';
export type EventRegistrationMode = 'Auto-Accept' | 'Manual Review';
export type PosterAspectMode = 'portrait' | 'landscape' | 'banner';
export type EventSort = 'date_desc' | 'date_asc' | 'created_desc' | 'created_asc';

export interface AdminUser {
  id?: string;
  name: string;
  email?: string;
}

export interface AdminSession {
  role: 'admin';
  user: AdminUser;
  expires_at: number | null;
}

export interface AdminEvent {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  location: string;
  date: string;
  posterUrl: string | null;
  posterAspectMode: PosterAspectMode;
  capacity: number;
  registrationMode: EventRegistrationMode;
  whatsappGroupUrl: string | null;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
  registrantsCount?: number;
}

export interface EventPageMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next_page: boolean;
}

export interface AdminEventListResponse {
  status: 'success';
  data: AdminEvent[];
  meta: EventPageMeta;
}

export interface AdminEventWriteResponse {
  status: 'success';
  message?: string;
  data: AdminEvent;
  idempotent_replay?: boolean;
}

export interface AdminEventUpdateResponse {
  status: 'success';
  message?: string;
  data: AdminEvent;
}

export interface AdminEventUpdatePayload {
  name?: string;
  location?: string;
  capacity?: number;
  date?: string;
  description?: string | null;
  registration_mode?: EventRegistrationMode;
  poster_aspect_mode?: PosterAspectMode;
  whatsapp_group_url?: string | null;
  status?: EventStatus;
}

export interface AdminEventDeleteResponse {
  status: 'success';
  message: string;
}

export interface AdminPinRegenerationResponse {
  status: 'success';
  message?: string;
  data: {
    pin: string;
  };
}

export interface AdminMediaRow {
  id: string;
  role: 'cover' | 'gallery';
  displayOrder: number;
  publicUrl: string;
}

export interface AdminEventMediaUploadResponse {
  status: 'success';
  message?: string;
  data: {
    posterUrl: string;
    media: Array<{
      role: 'cover' | 'gallery';
      displayOrder: number;
      publicUrl: string;
    }>;
  };
}

export interface AdminEventGalleryAppendResponse {
  status: 'success';
  data?: {
    media?: AdminMediaRow[];
  };
}

export interface AdminEventDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  location: string;
  date: string;
  posterUrl: string | null;
  posterAspectMode: PosterAspectMode;
  capacity: number;
  registrationMode: EventRegistrationMode;
  status: EventStatus;
  whatsapp_group_url: string | null;
  public_registration_url: string | null;
  public_qr_code_url: string | null;
  volunteer_pin: string | null;
  formFields?: Array<{
    id: string;
    fieldName: string;
    fieldType: string;
    isRequired: boolean;
    options: string[] | null;
    order: number;
    fieldKey: string;
    fieldKind: string;
  }>;
  media?: Array<{
    id: string;
    role: string;
    displayOrder: number;
    publicUrl: string;
  }>;
}

export interface AdminEventDetailResponse {
  status: 'success';
  data: AdminEventDetail;
}

export interface AdminEventStats {
  name: string;
  description: string | null;
  location: string;
  date: string;
  posterUrl: string | null;
  posterAspectMode: PosterAspectMode;
  registrationMode: EventRegistrationMode;
  status: EventStatus;
  media: Array<{
    id: string;
    role: string;
    display_order: number;
    public_url: string;
  }>;
  total_capacity: number;
  pending: number;
  accepted: number;
  present: number;
}

export interface AdminEventStatsResponse {
  status: 'success';
  data: AdminEventStats;
}

export interface DashboardEventSummary {
  id: string;
  name: string;
  slug: string;
  date: string;
  location: string;
  capacity?: number;
  registrants_count: number;
  posterUrl?: string | null;
  status?: EventStatus;
  createdAt?: string;
}

export interface DashboardStats {
  total_events: number;
  total_registrations: number;
  total_present: number;
  recent_events: DashboardEventSummary[];
  upcoming_events: DashboardEventSummary[];
}

export interface AdminDashboardResponse {
  status: 'success';
  data: DashboardStats;
}

export interface AdminSessionResponse {
  status: 'success';
  data: AdminSession;
}

export interface AdminEventFilters {
  page: number;
  limit: number;
  search: string;
  sort: EventSort;
  status: EventStatus | 'all';
}
