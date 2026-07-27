import { z } from 'zod';

export const routineSchema = z.object({
  title: z.string().min(1, 'Title is required').max(80),
  notes: z.string().max(500).optional().or(z.literal('')),
});

export type RoutineValues = z.infer<typeof routineSchema>;

export const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(120),
  description: z.string().max(300).optional().or(z.literal('')),
  due_date: z.string().optional().or(z.literal('')),
  due_time: z.string().optional().or(z.literal('')),
  is_recurring: z.boolean(),
  // Omitted/empty means "every day", same as never having set it.
  recurrence_days_of_week: z.array(z.number().int().min(0).max(6)).optional(),
});

export type TaskValues = z.infer<typeof taskSchema>;
