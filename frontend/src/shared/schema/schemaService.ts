import { supabase } from '@/shared/api';

export type NrSchemaStatus = {
  version: number;
  task_metadata: {
    description: boolean;
    due_date: boolean;
    due_time: boolean;
    is_recurring: boolean;
  };
  has_app_events: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export async function fetchNrSchemaStatus(): Promise<NrSchemaStatus | null> {
  try {
    const { data, error } = await supabase.rpc('get_nr_schema_status');
    if (error) return null;

    if (!isRecord(data)) return null;

    const taskMeta = isRecord(data.task_metadata) ? data.task_metadata : {};

    return {
      version: typeof data.version === 'number' ? data.version : 0,
      task_metadata: {
        description: taskMeta.description === true,
        due_date: taskMeta.due_date === true,
        due_time: taskMeta.due_time === true,
        is_recurring: taskMeta.is_recurring === true,
      },
      has_app_events: data.has_app_events === true,
    };
  } catch {
    return null;
  }
}
