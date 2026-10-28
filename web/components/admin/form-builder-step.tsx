'use client';

import { useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Lock, Plus } from 'lucide-react';
import { SortableFormFieldCard } from '@/components/admin/sortable-form-field-card';
import {
  ADMIN_FORM_FIELD_TYPES,
  MAX_CUSTOM_FORM_FIELDS,
  createAdminFormField,
  customFieldCount,
  fieldTypeLabel,
  moveAdminFormField,
  removeAdminFormField,
  reorderAdminFormFields,
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
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const customCount = customFieldCount(fields);
  const atLimit = customCount >= MAX_CUSTOM_FORM_FIELDS;
  const customFields = fields.filter((field) => field.fieldKind === 'custom');

  function addField() {
    if (atLimit || disabled) return;
    onChange([...fields, createAdminFormField(newType)]);
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    onChange(reorderAdminFormFields(
      fields,
      String(event.active.id),
      String(event.over.id),
    ));
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
          <p className="flex items-center gap-1.5 px-1 font-description text-xs text-on-surface-variant">
            <span aria-hidden="true" className="inline-block h-1 w-4 rounded-full bg-outline-variant" />
            Drag the handle or use the arrow buttons to reorder questions.
          </p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={customFields.map((field) => field.key)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {customFields.map((field, customIndex) => (
                  <SortableFormFieldCard
                    key={field.key}
                    field={field}
                    index={customIndex}
                    count={customFields.length}
                    disabled={disabled}
                    onPatch={(patch) => onChange(updateAdminFormField(fields, field.key, patch))}
                    onOptionChange={(optionIndex, value) => {
                      const options = [...field.options];
                      options[optionIndex] = value;
                      onChange(updateAdminFormField(fields, field.key, { options }));
                    }}
                    onRemoveOption={(optionIndex) => {
                      const options = field.options.filter((_, index) => index !== optionIndex);
                      onChange(updateAdminFormField(fields, field.key, { options }));
                    }}
                    onAddOption={() => onChange(updateAdminFormField(
                      fields,
                      field.key,
                      { options: [...field.options, `Option ${field.options.length + 1}`] },
                    ))}
                    onRemove={() => onChange(removeAdminFormField(fields, field.key))}
                    onMove={(direction) => onChange(moveAdminFormField(fields, field.key, direction))}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
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
