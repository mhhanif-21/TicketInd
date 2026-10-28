'use client';

import { Mail, UserRound } from 'lucide-react';
import type { AdminFormFieldDraft } from '@/lib/admin/form-fields';

const controlClassName =
  'w-full rounded-xl border border-outline-variant bg-surface-container-low/40 px-3.5 py-2.5 text-sm text-on-surface placeholder:text-secondary/60 disabled:cursor-not-allowed disabled:opacity-100';

function RequiredMark({ required }: { required: boolean }) {
  return required ? <span className="ml-0.5 text-error">*</span> : null;
}

function PreviewLabel({ field }: { field: AdminFormFieldDraft }) {
  return (
    <p className="text-sm font-semibold text-on-surface">
      {field.fieldName}
      <RequiredMark required={field.isRequired} />
    </p>
  );
}

function OptionPreview({
  options,
  multiple,
}: {
  options: string[];
  multiple: boolean;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => (
        <label
          key={option}
          className="flex items-center gap-2.5 rounded-xl border border-outline-variant bg-surface-container-low/30 px-3 py-2.5 text-sm text-on-surface"
        >
          <input
            type={multiple ? 'checkbox' : 'radio'}
            disabled
            className="h-4 w-4 rounded border-outline-variant text-primary"
          />
          {option}
        </label>
      ))}
    </div>
  );
}

export function FormPreview({ fields }: { fields: AdminFormFieldDraft[] }) {
  const staticName = fields.find((field) => field.fieldKind === 'static_name');
  const staticEmail = fields.find((field) => field.fieldKind === 'static_email');
  const custom = fields.filter((field) => field.fieldKind === 'custom');

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)] sm:p-6">
      <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low/40 px-3.5 py-2.5">
        <p className="font-description text-xs text-on-surface-variant">
          Read-only preview. This is how participants will see the registration form.
        </p>
      </div>

      <div className="mt-6 space-y-5">
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-on-surface">
            <UserRound aria-hidden="true" className="mr-1.5 inline h-4 w-4 text-secondary" />
            {staticName?.fieldName ?? 'Nama'}
            <RequiredMark required />
          </p>
          <input
            disabled
            placeholder="Participant full name"
            className={controlClassName}
          />
        </div>

        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-on-surface">
            <Mail aria-hidden="true" className="mr-1.5 inline h-4 w-4 text-secondary" />
            {staticEmail?.fieldName ?? 'Email'}
            <RequiredMark required />
          </p>
          <input
            disabled
            type="email"
            placeholder="participant@email.com"
            className={controlClassName}
          />
        </div>

        {custom.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <PreviewLabel field={field} />

            {field.fieldType === 'text' || field.fieldType === 'number' || field.fieldType === 'email' ? (
              <input
                disabled
                type={field.fieldType}
                placeholder={
                  field.fieldType === 'email'
                    ? 'name@example.com'
                    : field.fieldType === 'number'
                      ? '0'
                      : `Enter ${field.fieldName.toLowerCase()}`
                }
                className={controlClassName}
              />
            ) : field.fieldType === 'textarea' ? (
              <textarea
                disabled
                rows={3}
                placeholder={`Enter ${field.fieldName.toLowerCase()}`}
                className={`${controlClassName} resize-none`}
              />
            ) : field.fieldType === 'select' ? (
              <select disabled className={controlClassName}>
                <option>Select {field.fieldName}</option>
              </select>
            ) : field.fieldType === 'radio' ? (
              <OptionPreview options={field.options} multiple={false} />
            ) : field.fieldType === 'checkbox' ? (
              <OptionPreview options={field.options} multiple />
            ) : (
              <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low/30 px-4 py-6 text-center">
                <p className="text-sm font-medium text-on-surface">
                  {field.fieldType === 'image' ? 'Upload an image' : 'Upload a file'}
                </p>
                <p className="mt-1 font-description text-xs text-on-surface-variant">
                  {field.fieldType === 'image'
                    ? 'JPG or PNG, up to 4 MB.'
                    : 'PDF, up to 4 MB.'}
                </p>
              </div>
            )}
          </div>
        ))}

        {custom.length === 0 ? (
          <p className="rounded-xl bg-surface-container-low px-4 py-3 font-description text-xs text-on-surface-variant">
            No custom questions. Participants only need to enter their name and email.
          </p>
        ) : null}

        <div className="border-t border-outline-variant pt-5">
          <div className="flex items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-on-primary opacity-70">
            Submit registration
          </div>
        </div>
      </div>
    </div>
  );
}
