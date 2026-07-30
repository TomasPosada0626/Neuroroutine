import { describe, expect, it } from 'vitest';
import { routineSchema, taskSchema } from '../schemas';

describe('routineSchema', () => {
  it('accepts a title within bounds and no notes', () => {
    const result = routineSchema.safeParse({ title: 'Morning routine' });
    expect(result.success).toBe(true);
  });

  it('rejects an empty title', () => {
    const result = routineSchema.safeParse({ title: '' });
    expect(result.success).toBe(false);
  });

  it('accepts a title exactly at the 80 char limit', () => {
    const result = routineSchema.safeParse({ title: 'a'.repeat(80) });
    expect(result.success).toBe(true);
  });

  it('rejects a title over the 80 char limit', () => {
    const result = routineSchema.safeParse({ title: 'a'.repeat(81) });
    expect(result.success).toBe(false);
  });

  it('accepts an empty-string notes value', () => {
    const result = routineSchema.safeParse({ title: 'Routine', notes: '' });
    expect(result.success).toBe(true);
  });

  it('accepts notes exactly at the 500 char limit', () => {
    const result = routineSchema.safeParse({ title: 'Routine', notes: 'n'.repeat(500) });
    expect(result.success).toBe(true);
  });

  it('rejects notes over the 500 char limit', () => {
    const result = routineSchema.safeParse({ title: 'Routine', notes: 'n'.repeat(501) });
    expect(result.success).toBe(false);
  });

  it('accepts a missing notes field', () => {
    const result = routineSchema.safeParse({ title: 'Routine' });
    expect(result.success).toBe(true);
  });
});

describe('taskSchema', () => {
  const base = { title: 'Task', is_recurring: false };

  it('accepts a title within bounds', () => {
    const result = taskSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it('rejects an empty title', () => {
    const result = taskSchema.safeParse({ ...base, title: '' });
    expect(result.success).toBe(false);
  });

  it('accepts a title exactly at the 120 char limit', () => {
    const result = taskSchema.safeParse({ ...base, title: 'a'.repeat(120) });
    expect(result.success).toBe(true);
  });

  it('rejects a title over the 120 char limit', () => {
    const result = taskSchema.safeParse({ ...base, title: 'a'.repeat(121) });
    expect(result.success).toBe(false);
  });

  it('accepts an empty-string description', () => {
    const result = taskSchema.safeParse({ ...base, description: '' });
    expect(result.success).toBe(true);
  });

  it('accepts description exactly at the 300 char limit', () => {
    const result = taskSchema.safeParse({ ...base, description: 'd'.repeat(300) });
    expect(result.success).toBe(true);
  });

  it('rejects description over the 300 char limit', () => {
    const result = taskSchema.safeParse({ ...base, description: 'd'.repeat(301) });
    expect(result.success).toBe(false);
  });

  it('accepts an empty-string due_date and due_time', () => {
    const result = taskSchema.safeParse({ ...base, due_date: '', due_time: '' });
    expect(result.success).toBe(true);
  });

  it('accepts a populated due_date and due_time', () => {
    const result = taskSchema.safeParse({ ...base, due_date: '2026-08-01', due_time: '09:30' });
    expect(result.success).toBe(true);
  });

  it('requires is_recurring to be a boolean', () => {
    const result = taskSchema.safeParse({ ...base, is_recurring: 'yes' });
    expect(result.success).toBe(false);
  });

  it('accepts a missing recurrence_days_of_week', () => {
    const result = taskSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it('accepts days of week within the 0-6 range', () => {
    const result = taskSchema.safeParse({ ...base, recurrence_days_of_week: [0, 3, 6] });
    expect(result.success).toBe(true);
  });

  it('rejects a day of week below 0', () => {
    const result = taskSchema.safeParse({ ...base, recurrence_days_of_week: [-1] });
    expect(result.success).toBe(false);
  });

  it('rejects a day of week above 6', () => {
    const result = taskSchema.safeParse({ ...base, recurrence_days_of_week: [7] });
    expect(result.success).toBe(false);
  });

  it('rejects a non-integer day of week', () => {
    const result = taskSchema.safeParse({ ...base, recurrence_days_of_week: [2.5] });
    expect(result.success).toBe(false);
  });
});
