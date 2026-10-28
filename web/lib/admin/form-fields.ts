export const ADMIN_FORM_FIELD_TYPES = [
  'text',
  'textarea',
  'number',
  'email',
  'select',
  'radio',
  'checkbox',
  'file',
  'image',
] as const;

export type AdminFormFieldType = (typeof ADMIN_FORM_FIELD_TYPES)[number];
export type AdminFormFieldKind = 'custom' | 'static_name' | 'static_email';

export interface AdminFormFieldDraft {
  key: string;
  id?: string;
  fieldKey?: string;
  fieldKind: AdminFormFieldKind;
  fieldName: string;
  fieldType: AdminFormFieldType;
  isRequired: boolean;
  options: string[];
}

export interface AdminFormFieldPayload {
  id?: string;
  field_key?: string;
  field_kind: AdminFormFieldKind;
  field_name: string;
  field_type: AdminFormFieldType;
  is_required: boolean;
  options: string[] | null;
  order: number;
}

export const MAX_CUSTOM_FORM_FIELDS = 23;

const STATIC_FIELD_NAMES = new Set(['nama', 'email']);

const FIELD_TYPE_LABELS: Record<AdminFormFieldType, string> = {
  text: 'Short text',
  textarea: 'Long text',
  number: 'Number',
  email: 'Email',
  select: 'Select',
  radio: 'Radio',
  checkbox: 'Checkbox',
  file: 'File upload',
  image: 'Image upload',
};

function normalizeLabel(value: string): string {
  return value.normalize('NFKC').replace(/\s+/g, '').toLowerCase();
}

function isChoiceType(type: AdminFormFieldType): boolean {
  return type === 'select' || type === 'radio' || type === 'checkbox';
}

function isAllowedType(value: unknown): value is AdminFormFieldType {
  return typeof value === 'string'
    && ADMIN_FORM_FIELD_TYPES.includes(value as AdminFormFieldType);
}

function staticFields(): AdminFormFieldDraft[] {
  return [
    {
      key: 'static-name',
      fieldKind: 'static_name',
      fieldName: 'Nama',
      fieldType: 'text',
      isRequired: true,
      options: [],
    },
    {
      key: 'static-email',
      fieldKind: 'static_email',
      fieldName: 'Email',
      fieldType: 'email',
      isRequired: true,
      options: [],
    },
  ];
}

export function defaultAdminFormFields(): AdminFormFieldDraft[] {
  return staticFields();
}

export function formFieldsFromEvent(
  fields: Array<{
    id?: string;
    fieldKey?: string;
    fieldKind?: string;
    fieldName?: string;
    fieldType?: string;
    isRequired?: boolean;
    options?: string[] | null;
    order?: number;
  }> | null | undefined,
): AdminFormFieldDraft[] {
  if (!fields || fields.length === 0) return defaultAdminFormFields();

  const normalized = [...fields].sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
  const custom = normalized
    .filter((field) => field.fieldKind === 'custom' || (!field.fieldKind && !STATIC_FIELD_NAMES.has(normalizeLabel(field.fieldName ?? ''))))
    .map((field, index) => ({
      key: field.id || field.fieldKey || `custom-${index}`,
      id: field.id,
      fieldKey: field.fieldKey,
      fieldKind: 'custom' as const,
      fieldName: field.fieldName ?? '',
      fieldType: isAllowedType(field.fieldType) ? field.fieldType : 'text',
      isRequired: Boolean(field.isRequired),
      options: Array.isArray(field.options) ? field.options : [],
    }));

  return [...staticFields(), ...custom];
}

export function customFieldCount(fields: AdminFormFieldDraft[]): number {
  return fields.filter((field) => field.fieldKind === 'custom').length;
}

export function fieldTypeLabel(type: AdminFormFieldType): string {
  return FIELD_TYPE_LABELS[type];
}

export function createAdminFormField(type: AdminFormFieldType): AdminFormFieldDraft {
  return {
    key: `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    fieldKind: 'custom',
    fieldName: 'New question',
    fieldType: type,
    isRequired: false,
    options: isChoiceType(type) ? ['Option 1', 'Option 2'] : [],
  };
}

export function updateAdminFormField(
  fields: AdminFormFieldDraft[],
  key: string,
  patch: Partial<AdminFormFieldDraft>,
): AdminFormFieldDraft[] {
  return fields.map((field) => {
    if (field.key !== key) return field;
    const next = { ...field, ...patch };
    if (!isChoiceType(next.fieldType)) next.options = [];
    if (isChoiceType(next.fieldType) && next.options.length < 2) {
      next.options = next.options.length > 0 ? next.options : ['Option 1', 'Option 2'];
    }
    return next;
  });
}

export function removeAdminFormField(
  fields: AdminFormFieldDraft[],
  key: string,
): AdminFormFieldDraft[] {
  return fields.filter((field) => field.key !== key || field.fieldKind !== 'custom');
}

function customRange(fields: AdminFormFieldDraft[]): { start: number; end: number } {
  const start = fields.findIndex((field) => field.fieldKind === 'custom');
  return start === -1
    ? { start: fields.length, end: fields.length }
    : { start, end: fields.length };
}

export function reorderAdminFormFields(
  fields: AdminFormFieldDraft[],
  activeKey: string,
  overKey: string,
): AdminFormFieldDraft[] {
  if (activeKey === overKey) return fields;

  const custom = fields.filter((field) => field.fieldKind === 'custom');
  const from = custom.findIndex((field) => field.key === activeKey);
  const to = custom.findIndex((field) => field.key === overKey);
  if (from === -1 || to === -1) return fields;

  const reordered = [...custom];
  const [moved] = reordered.splice(from, 1);
  reordered.splice(to, 0, moved);

  let customIndex = 0;
  return fields.map((field) => (
    field.fieldKind === 'custom' ? reordered[customIndex++] : field
  ));
}

export function moveAdminFormField(
  fields: AdminFormFieldDraft[],
  key: string,
  direction: -1 | 1,
): AdminFormFieldDraft[] {
  const index = fields.findIndex((field) => field.key === key);
  const { start, end } = customRange(fields);
  const target = index + direction;
  if (index < start || target < start || target >= end) return fields;

  const next = [...fields];
  const [field] = next.splice(index, 1);
  next.splice(target, 0, field);
  return next;
}

export function validateAdminFormFields(fields: AdminFormFieldDraft[]): {
  payload: AdminFormFieldPayload[] | null;
  error: string | null;
} {
  const custom = fields.filter((field) => field.fieldKind === 'custom');
  if (custom.length > MAX_CUSTOM_FORM_FIELDS) {
    return {
      payload: null,
      error: `A maximum of ${MAX_CUSTOM_FORM_FIELDS} custom fields is allowed.`,
    };
  }

  const labels = new Set<string>();
  for (const field of custom) {
    const label = field.fieldName.trim();
    if (!label) {
      return { payload: null, error: 'Every custom field needs a label.' };
    }
    if (label.length > 255) {
      return { payload: null, error: `Field “${label}” must be 255 characters or fewer.` };
    }
    const normalized = normalizeLabel(label);
    if (STATIC_FIELD_NAMES.has(normalized)) {
      return {
        payload: null,
        error: 'Nama and Email are reserved system fields. Choose a different label.',
      };
    }
    if (labels.has(normalized)) {
      return { payload: null, error: `The field “${label}” is duplicated.` };
    }
    labels.add(normalized);

    if (isChoiceType(field.fieldType)) {
      const options = field.options.map((option) => option.trim()).filter(Boolean);
      if (options.length < 2) {
        return {
          payload: null,
          error: `The field “${label}” needs at least two answer options.`,
        };
      }
      if (new Set(options).size !== options.length) {
        return {
          payload: null,
          error: `The answer options for “${label}” must be unique.`,
        };
      }
    }
  }

  const payload = fields.map((field, index): AdminFormFieldPayload => ({
    ...(field.id ? { id: field.id } : {}),
    ...(field.fieldKey ? { field_key: field.fieldKey } : {}),
    field_kind: field.fieldKind,
    field_name: field.fieldName.trim(),
    field_type: field.fieldType,
    is_required: field.isRequired,
    options: isChoiceType(field.fieldType)
      ? field.options.map((option) => option.trim()).filter(Boolean)
      : null,
    order: index,
  }));

  return { payload, error: null };
}
