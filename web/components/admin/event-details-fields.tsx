'use client';

import { FormField } from '@/components/admin/form-field';
import type { EventDetailsDraft, EventDetailsErrors } from '@/lib/admin/event-form';

const inputClassName =
  'w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 py-2.5 text-sm text-on-surface placeholder:text-secondary/60 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60';
const selectClassName = `${inputClassName} pr-8`;

export function EventDetailsFields({
  value,
  errors,
  disabled = false,
  onChange,
}: {
  value: EventDetailsDraft;
  errors: EventDetailsErrors;
  disabled?: boolean;
  onChange: (patch: Partial<EventDetailsDraft>) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <FormField label="Event name" htmlFor="event-name" error={errors.name} required>
          <input
            id="event-name"
            value={value.name}
            onChange={(event) => onChange({ name: event.target.value })}
            placeholder="e.g. Jakarta Tech Summit 2026"
            maxLength={255}
            disabled={disabled}
            className={inputClassName}
          />
        </FormField>

        <FormField label="Location" htmlFor="event-location" error={errors.location} required>
          <input
            id="event-location"
            value={value.location}
            onChange={(event) => onChange({ location: event.target.value })}
            placeholder="e.g. Jakarta Convention Center"
            maxLength={255}
            disabled={disabled}
            className={inputClassName}
          />
        </FormField>

        <FormField
          label="Event date & time"
          htmlFor="event-date"
          error={errors.date}
          hint="Displayed in your local timezone."
          required
        >
          <input
            id="event-date"
            type="datetime-local"
            value={value.date}
            onChange={(event) => onChange({ date: event.target.value })}
            disabled={disabled}
            className={inputClassName}
          />
        </FormField>

        <FormField
          label="Capacity"
          htmlFor="event-capacity"
          error={errors.capacity}
          hint="Maximum number of active registrations."
          required
        >
          <input
            id="event-capacity"
            type="number"
            inputMode="numeric"
            min={1}
            max={1_000_000}
            step={1}
            value={value.capacity}
            onChange={(event) => onChange({ capacity: event.target.value })}
            placeholder="e.g. 250"
            disabled={disabled}
            className={inputClassName}
          />
        </FormField>

        <FormField
          label="Registration mode"
          htmlFor="event-registration-mode"
          hint={
            value.registrationMode === 'Manual Review'
              ? 'Every registration waits for admin approval before a ticket is issued.'
              : 'Registrations are accepted automatically when capacity is available.'
          }
        >
          <select
            id="event-registration-mode"
            value={value.registrationMode}
            onChange={(event) => onChange({
              registrationMode: event.target.value as EventDetailsDraft['registrationMode'],
            })}
            disabled={disabled}
            className={selectClassName}
          >
            <option value="Auto-Accept">Auto-Accept</option>
            <option value="Manual Review">Manual Review</option>
          </select>
        </FormField>

        <FormField
          label="Poster format"
          htmlFor="event-poster-aspect"
          hint="Used for cropping new images. Existing selected or saved images keep their crop."
        >
          <select
            id="event-poster-aspect"
            value={value.posterAspectMode}
            onChange={(event) => onChange({
              posterAspectMode: event.target.value as EventDetailsDraft['posterAspectMode'],
            })}
            disabled={disabled}
            className={selectClassName}
          >
            <option value="landscape">Landscape · 16:9</option>
            <option value="portrait">Portrait · 4:5</option>
            <option value="banner">Banner · 19:6</option>
          </select>
        </FormField>
      </div>

      <FormField
        label="Description"
        htmlFor="event-description"
        error={errors.description}
        hint={`${value.description.length.toLocaleString('en-US')} / 10,000 characters`}
      >
        <textarea
          id="event-description"
          value={value.description}
          onChange={(event) => onChange({ description: event.target.value })}
          rows={5}
          maxLength={10_000}
          disabled={disabled}
          placeholder="Tell participants what to expect."
          className={`${inputClassName} resize-y`}
        />
      </FormField>

      <FormField
        label="WhatsApp group URL"
        htmlFor="event-whatsapp"
        error={errors.whatsappGroupUrl}
        hint="Optional. Use an https://chat.whatsapp.com/... or https://wa.me/... link."
      >
        <input
          id="event-whatsapp"
          type="url"
          value={value.whatsappGroupUrl}
          onChange={(event) => onChange({ whatsappGroupUrl: event.target.value })}
          placeholder="https://chat.whatsapp.com/..."
          disabled={disabled}
          className={inputClassName}
        />
      </FormField>

      {errors.form ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 font-description text-sm text-red-800">
          {errors.form}
        </p>
      ) : null}
    </div>
  );
}
