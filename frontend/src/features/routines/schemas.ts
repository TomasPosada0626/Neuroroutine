import { z } from 'zod';

export const routineSchema = z.object({
  title: z.string().min(1, 'Title is required').max(80),
  notes: z.string().max(500).optional().or(z.literal('')),
});

export type RoutineValues = z.infer<typeof routineSchema>;
