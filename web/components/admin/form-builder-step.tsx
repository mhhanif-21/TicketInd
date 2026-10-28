'use client';

import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  Lock,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import {
  ADMIN_FORM_FIELD_TYPES,
  MAX_CUSTOM_FORM_FIELDS,
  createAdminFormField,
  customFieldCount,
  fieldTypeLabel,
  moveAdminFormField,
  removeAdminFormField,
  updateAdminFormField,
  type AdminFormFieldDraft,
  type AdminFormFieldType,
} from '@/lib/admin/form-fields';
import { cn } from '@/lib/admin/format';

const inputClassName =
  'w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60';

function LockedField({ field }: { field: AdminFormFieldDraft }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-low/50 px-4 py-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-secondary">
        <Lock aria-hidden="true" className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-on-surface">{field.fieldName}</p>
        <p className="font-description text-xs text-secondary">
          {field.fieldType === 'email' ? 'Email address' : 'Full name'} · required · system field
        </p>
      </div>
      <span className="rounded-full border border-outline-variant px-2 py-0.5 font-label-caps text-[9px] uppercase tracking-[0.08em] text-secondary">
        Locked
      </span>
    </div>
  );
}

export function FormBuilderStep({
  fields,
  onChange,
  error,
  disabled = false,
}: {
  fields: AdminFormFieldDraft[];
  onChange: (fields: AdminFormFieldDraft[]) => void;
  error?: string | null;
  disabled?: boolean;
}) {
  const [newType, setNewType] = useState<AdminFormFieldType>('text');
  const customCount = customFieldCount(fields);
  const atLimit = customCount >= MAX_CUSTOM_FORM_FIELDS;
  const customFields = fields.filter((field) => field.fieldKind === 'custom');

  function addField() {
    if (atLimit || disabled) return;
    onChange([...fields, createAdminFormField(newType)]);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-on-surface">Registration form</h2>
            <p className="mt-1 font-description text-sm text-on-surface-variant">
              Name and email are always collected. Add questions participants need to answer.
            </p>
          </div>
          <span className="rounded-full bg-surface-container px-2.5 py-1 font-label-caps text-[10px] font-semibold uppercase tracking-[0.08em] text-secondary">
            {customCount} / {MAX_CUSTOM_FORM_FIELDS} custom
          </span>
        </div>

        <div className="mt-5 space-y-2">
          {fields
            .filter((field) => field.fieldKind !== 'custom')
            .map((field) => <LockedField key={field.key} field={field} />)}
        </div>
      </div>

      {customFields.length > 0 ? (
        <div className="space-y-3">
          {customFields.map((field, customIndex) => {
            const choice = ['select', 'radio', 'checkbox'].includes(field.fieldType);
            return (
              <div
                key={field.key}
                className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-[0_2px_8px_rgba(0,0,0,0.03)] sm:p-5"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-1 hidden rounded-md p-1 text-secondary sm:block">
                    <GripVertical aria-hidden="true" className="h-4 w-4" />
                  </span>

                  <div className="min-w-0 flex-1 space-y-4">
                    <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                      <div>
                        <label htmlFor={`field-name-${field.key}`} className="sr-only">
                          Field label
                        </label>
                        <input
                          id={`field-name-${field.key}`}
                          value={field.fieldName}
                          onChange={(event) => onChange(updateAdminFormField(
                            fields,
                            field.key,
                            { fieldName: event.target.value },
                          ))}
                          placeholder="Question label"
                          maxLength={255}
                          disabled={disabled}
                          className={inputClassName}
                        />
                      </div>
                      <div>
                        <label htmlFor={`field-type-${field.key}`} className="sr-only">
                          Field type
                        </label>
                        <select
                          id={`field-type-${field.key}`}
                          value={field.fieldType}
                          onChange={(event) => onChange(updateAdminFormField(
                            fields,
                            field.key,
                            { fieldType: event.target.value as AdminFormFieldType },
                          ))}
                          disabled={disabled}
                          className={inputClassName}
                        >
                          {ADMIN_FORM_FIELD_TYPES.map((type) => (
                            <option key={type} value={type}>{fieldTypeLabel(type)}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {choice ? (
                      <div className="space-y-2 rounded-xl bg-surface-container-low/70 p-3">
                        <p className="font-label-caps text-[10px] font-semibold uppercase tracking-[0.1em] text-secondary">
                          Answer options
                        </p>
                        {field.options.map((option, optionIndex) => (
                          <div key={`${field.key}-option-${optionIndex}`} className="flex items-center gap-2">
                            <input
                              value={option}
                              onChange={(event) => {
                                const options = [...field.options];
                                options[optionIndex] = event.target.value;
                                onChange(updateAdminFormField(fields, field.key, { options }));
                              }}
                              placeholder={`Option ${optionIndex + 1}`}
                              disabled={disabled}
                              aria-label={`Option ${optionIndex + 1} for ${field.fieldName}`}
                              className={inputClassName}
                            />
                            <button
                              type="button"
                              aria-label={`Remove option ${optionIndex + 1}`}
                              disabled={disabled || field.options.length <= 2}
                              onClick={() => {
                                const options = field.options.filter((_, index) => index !== optionIndex);
                                onChange(updateAdminFormField(fields, field.key, { options }));
                              }}
                              className="rounded-lg p-2 text-secondary transition-colors hover:bg-surface-container hover:text-error focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-30"
                            >
                              <X aria-hidden="true" className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => onChange(updateAdminFormField(
                            fields,
                            field.key,
                            { options: [...field.options, `Option ${field.options.length + 1}`] },
                          ))}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <Plus aria-hidden="true" className="h-3.5 w-3.5" />
                          Add option
                        </button>
                      </div>
                    ) : null}

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-on-surface">
                        <input
                          type="checkbox"
                          checked={field.isRequired}
                          onChange={(event) => onChange(updateAdminFormField(
                            fields,
                            field.key,
                            { isRequired: event.target.checked },
                          ))}
                          disabled={disabled}
                          className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary"
                        />
                        Required
                      </label>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label="Move question up"
                          disabled={disabled || customIndex === 0}
                          onClick={() => onChange(moveAdminFormField(fields, field.key, -1))}
                          className="rounded-lg border border-outline-variant p-1.5 text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-30"
                        >
                          <ArrowUp aria-hidden="true" className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Move question down"
                          disabled={disabled || customIndex === customFields.length - 1}
                          onClick={() => onChange(moveAdminFormField(fields, field.key, 1))}
                          className="rounded-lg border border-outline-variant p-1.5 text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-30"
                        >
                          <ArrowDown aria-hidden="true" className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove ${field.fieldName}`}
                          disabled={disabled}
                          onClick={() => onChange(removeAdminFormField(fields, field.key))}
                          className="ml-1 rounded-lg border border-outline-variant p-1.5 text-secondary transition-colors hover:border-red-200 hover:bg-red-50 hover:text-error focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-30"
                        >
                          <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest px-5 py-8 text-center">
          <p className="text-sm font-semibold text-on-surface">No custom questions yet</p>
          <p className="mt-1 font-description text-xs text-on-surface-variant">
            Participants will only enter their name and email.
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="new-field-type" className="block text-sm font-medium text-on-surface">
              Add a question
            </label>
            <select
              id="new-field-type"
              value={newType}
              onChange={(event) => setNewType(event.target.value as AdminFormFieldType)}
              disabled={disabled || atLimit}
              className={cn(inputClassName, 'mt-1.5')}
            >
              {ADMIN_FORM_FIELD_TYPES.map((type) => (
                <option key={type} value={type}>{fieldTypeLabel(type)}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={addField}
            disabled={disabled || atLimit}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition-transform hover:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add question
          </button>
        </div>
        {atLimit ? (
          <p className="mt-3 font-description text-xs text-amber-700">
            You have reached the maximum of {MAX_CUSTOM_FORM_FIELDS} custom questions.
          </p>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 font-description text-sm text-red-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}
