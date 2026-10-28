/**
 * Admin clients need the event record but never the PIN hash or creation key.
 * Keep those server-only fields out of every write response.
 */
export function serializeAdminEvent<T extends {
  volunteerPinHash?: unknown;
  creationKey?: unknown;
}>(event: T): Omit<T, 'volunteerPinHash' | 'creationKey'> {
  const safeEvent = { ...event } as Record<string, unknown>;
  delete safeEvent.volunteerPinHash;
  delete safeEvent.creationKey;
  return safeEvent as Omit<T, 'volunteerPinHash' | 'creationKey'>;
}
