import { describe, expect, it } from 'vitest';
import {
  createAdminFormField,
  defaultAdminFormFields,
  formFieldsFromEvent,
  moveAdminFormField,
  updateAdminFormField,
  validateAdminFormFields,
} from '@/lib/admin/form-fields';

describe('admin form fields', () => {
  it('always includes the locked name and email fields', () => {
    const fields = defaultAdminFormFields();
    expect(fields.map((field) => field.fieldKind)).toEqual(['static_name', 'static_email']);
    expect(fields.every((field) => field.isRequired)).toBe(true);
  });

  it('restores static and custom fields from an event', () => {
    const fields = formFieldsFromEvent([
      { id: 'custom-1', fieldName: 'Organization', fieldType: 'text', fieldKind: 'custom', order: 2 },
      { id: 'static-email', fieldName: 'Email', fieldType: 'email', fieldKind: 'static_email', order: 1 },
      { id: 'static-name', fieldName: 'Nama', fieldType: 'text', fieldKind: 'static_name', order: 0 },
    ]);

    expect(fields.map((field) => field.fieldName)).toEqual(['Nama', 'Email', 'Organization']);
    expect(fields[2].id).toBe('custom-1');
  });

  it('builds an ordered payload including static fields', () => {
    const fields = [
      ...defaultAdminFormFields(),
      createAdminFormField('select'),
    ].map((field) => field.fieldKind === 'custom'
      ? { ...field, fieldName: 'Ticket type', options: ['General', 'VIP'] }
      : field);

    const validation = validateAdminFormFields(fields);
    expect(validation.error).toBeNull();
    expect(validation.payload?.map((field) => field.order)).toEqual([0, 1, 2]);
    expect(validation.payload?.[2]).toMatchObject({
      field_kind: 'custom',
      field_name: 'Ticket type',
      field_type: 'select',
      options: ['General', 'VIP'],
    });
  });

  it('rejects reserved labels and duplicate labels', () => {
    const base = defaultAdminFormFields();
    const reserved = validateAdminFormFields([
      ...base,
      { ...createAdminFormField('text'), fieldName: 'Nama' },
    ]);
    expect(reserved.error).toContain('reserved');

    const duplicate = validateAdminFormFields([
      ...base,
      { ...createAdminFormField('text'), fieldName: 'Company' },
      { ...createAdminFormField('text'), fieldName: ' company ' },
    ]);
    expect(duplicate.error).toContain('duplicated');
  });

  it('requires at least two unique options for choice fields', () => {
    const choice = createAdminFormField('radio');
    const validation = validateAdminFormFields([
      ...defaultAdminFormFields(),
      { ...choice, fieldName: 'Food', options: ['Vegan'] },
    ]);
    expect(validation.error).toContain('two answer options');
  });

  it('clears options when the type is no longer a choice', () => {
    const choice = createAdminFormField('checkbox');
    const updated = updateAdminFormField(
      [choice],
      choice.key,
      { fieldType: 'text' },
    );
    expect(updated[0].options).toEqual([]);
  });

  it('moves only custom fields within the custom section', () => {
    const base = defaultAdminFormFields();
    const first = { ...createAdminFormField('text'), fieldName: 'First' };
    const second = { ...createAdminFormField('text'), fieldName: 'Second' };
    const fields = [...base, first, second];

    const moved = moveAdminFormField(fields, second.key, -1);
    expect(moved.map((field) => field.fieldName)).toEqual(['Nama', 'Email', 'Second', 'First']);
    expect(moveAdminFormField(fields, first.key, -1)).toBe(fields);
  });
});
