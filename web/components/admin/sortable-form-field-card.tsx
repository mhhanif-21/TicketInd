'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import {
  ADMIN_FORM_FIELD_TYPES,
  fieldTypeLabel,
  type AdminFormFieldDraft,
  type AdminFormFieldType,
} from '@/lib/admin/form-fields';
import { cn } from '@/lib/admin/format';

const inputClassName =
  'w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60';

export function SortableFormFieldCard({
  field,
  index,
  count,
  disabled,
  onPatch,
  onOptionChange,
  onRemoveOption,
  onAddOption,
  onRemove,
  onMove,
}: {
  field: AdminFormFieldDraft;
  index: number;
  count: number;
  disabled: boolean;
  onPatch: (patch: Partial<AdminFormFieldDraft>) => void;
  onOptionChange: (optionIndex: number, value: string) => void;
  onRemoveOption: (optionIndex: number) => void;
  onAddOption: () => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.key, disabled });

  const choice = ['select', 'radio', 'checkbox'].includes(field.fieldType);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        'rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-[0_2px_8px_rgba(0,0,0,0.03)] sm:p-5',
        isDragging && 'relative z-10 opacity-60 shadow-[0_16px_40px_rgba(0,0,0,0.16)]',
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          disabled={disabled}
          aria-label={`Drag to reorder ${field.fieldName || 'question'}`}
          title="Drag to reorder"
          className="mt-1 touch-none rounded-md p-1 text-secondary transition-colors hover:bg-surface-container hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          <GripVertical aria-hidden="true" className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <div>
              <label htmlFor={`field-name-${field.key}`} className="sr-only">
                Field label
              </label>
              <input
                id={`field-name-${field.key}`}
                value={field.fieldName}
                onChange={(event) => onPatch({ fieldName: event.target.value })}
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
                onChange={(event) => onPatch({
                  fieldType: event.target.value as AdminFormFieldType,
                })}
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
                    onChange={(event) => onOptionChange(optionIndex, event.target.value)}
                    placeholder={`Option ${optionIndex + 1}`}
                    disabled={disabled}
                    aria-label={`Option ${optionIndex + 1} for ${field.fieldName}`}
                    className={inputClassName}
                  />
                  <button
                    type="button"
                    aria-label={`Remove option ${optionIndex + 1}`}
                    disabled={disabled || field.options.length <= 2}
                    onClick={() => onRemoveOption(optionIndex)}
                    className="rounded-lg p-2 text-secondary transition-colors hover:bg-surface-container hover:text-error focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-30"
                  >
                    <X aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                disabled={disabled}
                onClick={onAddOption}
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
                onChange={(event) => onPatch({ isRequired: event.target.checked })}
                disabled={disabled}
                className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary"
              />
              Required
            </label>

            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Move question up"
                disabled={disabled || index === 0}
                onClick={() => onMove(-1)}
                className="rounded-lg border border-outline-variant p-1.5 text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-30"
              >
                <ArrowUp aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label="Move question down"
                disabled={disabled || index === count - 1}
                onClick={() => onMove(1)}
                className="rounded-lg border border-outline-variant p-1.5 text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-30"
              >
                <ArrowDown aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label={`Remove ${field.fieldName || 'question'}`}
                disabled={disabled}
                onClick={onRemove}
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
}
