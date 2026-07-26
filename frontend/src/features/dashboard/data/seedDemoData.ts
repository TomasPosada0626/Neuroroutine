import { supabase } from '@/shared/api';
import { assertDemoFeature } from '@/shared/config/appVariant';
import { fetchNrSchemaStatus } from '@/shared/schema/schemaService';

type CreatedRoutine = { id: string; title: string };

type CreatedTask = { id: string; routine_id: string; title: string };

function isoDaysAgo(daysAgo: number, minutesOffset = 12 * 60) {
  const d = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  d.setMinutes(d.getMinutes() + minutesOffset);
  return d.toISOString();
}

function isoDaysFromNow(daysFromNow: number, minutesOffset = 12 * 60) {
  const d = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  d.setMinutes(d.getMinutes() + minutesOffset);
  return d.toISOString();
}

function yyyyMmDdFromIso(iso: string) {
  return iso.slice(0, 10);
}

function hhMmSs(hh: number, mm: number) {
  const h = String(hh).padStart(2, '0');
  const m = String(mm).padStart(2, '0');
  return `${h}:${m}:00`;
}

async function bestEffortDeleteAppEvents(params: {
  userId: string;
  routineIds: string[];
  taskIds: string[];
}) {
  if (params.routineIds.length === 0 && params.taskIds.length === 0) return;

  try {
    // If schema status isn't available, just try and ignore any errors (missing table / RLS / etc.).
    const status = await fetchNrSchemaStatus();
    if (status && status.has_app_events !== true) return;

    const routineIds = params.routineIds;
    const taskIds = params.taskIds;

    // Supabase `.or()` needs a single string expression.
    const clauses: string[] = [];
    if (routineIds.length) clauses.push(`routine_id.in.(${routineIds.join(',')})`);
    if (taskIds.length) clauses.push(`routine_task_id.in.(${taskIds.join(',')})`);

    const { error } = await supabase
      .from('app_events')
      .delete()
      .eq('user_id', params.userId)
      .or(clauses.join(','));

    if (error) return;
  } catch {
    // ignore
  }
}

export async function clearDashboardDemoData(userId: string) {
  assertDemoFeature('demo seeding');
  const { data: routines, error: listError } = await supabase
    .from('routines')
    .select('id')
    .eq('user_id', userId)
    .like('title', 'Demo:%');

  if (listError) throw listError;
  const ids = (routines ?? []).map((r) => r.id);
  if (ids.length === 0) return;

  const { data: tasks } = await supabase.from('routine_tasks').select('id').in('routine_id', ids);
  const taskIds = (tasks ?? []).map((t) => t.id);

  await bestEffortDeleteAppEvents({ userId, routineIds: ids, taskIds });

  const { error: deleteError } = await supabase.from('routines').delete().in('id', ids);
  if (deleteError) throw deleteError;
}

type SeedScope = 'dashboard' | 'full';

type FullSeedTask = {
  routineTitle: string;
  title: string;
  is_done: boolean;
  completed_at?: string | null;
  description?: string | null;
  due_date?: string | null;
  due_time?: string | null;
  is_recurring?: boolean;
};

export async function seedFullDemoData(userId: string, scope: SeedScope = 'full') {
  assertDemoFeature('demo seeding');
  // Make it idempotent-ish for the current user.
  await clearDashboardDemoData(userId);

  const status = await fetchNrSchemaStatus();
  const canDescription = status?.task_metadata.description === true;
  const canDueDate = status?.task_metadata.due_date === true;
  const canDueTime = status?.task_metadata.due_time === true;
  const canRecurring = status?.task_metadata.is_recurring === true;
  const hasAppEvents = status?.has_app_events === true;

  const baseRoutines = [
    {
      user_id: userId,
      title: 'Demo: Mañana enfocada',
      notes: 'Rutina corta para arrancar el día con claridad.',
    },
    {
      user_id: userId,
      title: 'Demo: Gym / Fuerza',
      notes: 'Progreso simple (fuerza + movilidad).',
    },
    {
      user_id: userId,
      title: 'Demo: Estudio (deep work)',
      notes: 'Bloques de concentración con descansos.',
    },
  ];

  const extraRoutines = [
    {
      user_id: userId,
      title: 'Demo: Noche / Reset',
      notes: 'Cierre del día: orden, lectura y descanso.',
    },
    {
      user_id: userId,
      title: 'Demo: Salud mental',
      notes: 'Respiración, mindfulness y autocuidado.',
    },
    {
      user_id: userId,
      title: 'Demo: Alimentación',
      notes: 'Pequeños hábitos sostenibles para energía estable.',
    },
    {
      user_id: userId,
      title: 'Demo: Weekly review',
      notes: 'Revisión semanal para iterar y mejorar.',
    },
  ];

  const demoRoutines = scope === 'dashboard' ? baseRoutines : [...baseRoutines, ...extraRoutines];

  const { data: createdRoutines, error: routineError } = await supabase
    .from('routines')
    .insert(demoRoutines)
    .select('id,title');

  if (routineError) throw routineError;

  const routines = (createdRoutines ?? []) as CreatedRoutine[];
  if (routines.length === 0) return;

  const routineIdByTitle = new Map(routines.map((r) => [r.title, r.id]));

  const todayIso = isoDaysAgo(0, 9 * 60 + 0);
  const tomorrow = yyyyMmDdFromIso(isoDaysFromNow(1, 9 * 60));
  const inThreeDays = yyyyMmDdFromIso(isoDaysFromNow(3, 9 * 60));
  const nextWeek = yyyyMmDdFromIso(isoDaysFromNow(7, 9 * 60));

  const tasks: FullSeedTask[] = [
    // Mañana
    {
      routineTitle: 'Demo: Mañana enfocada',
      title: 'Tomar agua (500ml)',
      is_done: true,
      completed_at: todayIso,
      description: 'Antes de café.',
      due_time: hhMmSs(7, 30),
      is_recurring: true,
    },
    {
      routineTitle: 'Demo: Mañana enfocada',
      title: '10 min journaling',
      is_done: false,
      description: '3 líneas: gratitud / intención / cierre.',
      due_date: inThreeDays,
      due_time: hhMmSs(8, 0),
    },
    {
      routineTitle: 'Demo: Mañana enfocada',
      title: 'Plan del día (3 prioridades)',
      is_done: true,
      completed_at: isoDaysAgo(0, 8 * 60 + 44),
      due_date: tomorrow,
      due_time: hhMmSs(8, 45),
    },

    // Gym
    {
      routineTitle: 'Demo: Gym / Fuerza',
      title: 'Sentadillas 3×5',
      is_done: false,
      description: 'RPE 7–8. Calentar bien.',
      due_date: nextWeek,
      due_time: hhMmSs(18, 30),
    },
    {
      routineTitle: 'Demo: Gym / Fuerza',
      title: 'Press banca 3×5',
      is_done: true,
      completed_at: isoDaysAgo(2, 18 * 60 + 52),
      description: 'Progresión: +1.25kg si sale sólido.',
    },
    {
      routineTitle: 'Demo: Gym / Fuerza',
      title: 'Movilidad 10 min',
      is_done: false,
      description: 'Cadera + tobillo.',
      is_recurring: true,
    },

    // Estudio
    {
      routineTitle: 'Demo: Estudio (deep work)',
      title: 'Pomodoro 25/5 × 2',
      is_done: true,
      completed_at: isoDaysAgo(1, 10 * 60 + 35),
      description: 'Modo avión. Una sola pestaña.',
    },
    {
      routineTitle: 'Demo: Estudio (deep work)',
      title: 'Repasar apuntes 15 min',
      is_done: false,
    },
    {
      routineTitle: 'Demo: Estudio (deep work)',
      title: 'Resolver 3 ejercicios',
      is_done: true,
      completed_at: isoDaysAgo(4, 11 * 60 + 48),
      due_date: inThreeDays,
      due_time: hhMmSs(11, 30),
    },
  ];

  if (scope === 'full') {
    tasks.push(
      // Noche
      {
        routineTitle: 'Demo: Noche / Reset',
        title: 'Preparar ropa para mañana',
        is_done: true,
        completed_at: isoDaysAgo(1, 22 * 60 + 25),
        due_time: hhMmSs(22, 0),
      },
      {
        routineTitle: 'Demo: Noche / Reset',
        title: 'Lectura 15 min',
        is_done: false,
        description: 'Algo liviano, sin pantalla.',
      },
      {
        routineTitle: 'Demo: Noche / Reset',
        title: 'Pantallas off 30 min',
        is_done: true,
        completed_at: isoDaysAgo(3, 23 * 60 + 2),
      },

      // Salud mental
      {
        routineTitle: 'Demo: Salud mental',
        title: 'Respiración 4-7-8 (3 rondas)',
        is_done: true,
        completed_at: isoDaysAgo(0, 7 * 60 + 41),
        is_recurring: true,
      },
      {
        routineTitle: 'Demo: Salud mental',
        title: 'Caminata 20 min',
        is_done: false,
        due_date: nextWeek,
        due_time: hhMmSs(17, 0),
      },

      // Alimentación
      {
        routineTitle: 'Demo: Alimentación',
        title: 'Proteína en desayuno',
        is_done: true,
        completed_at: isoDaysAgo(2, 8 * 60 + 5),
        description: 'Ej: huevos / yogurt griego / batido.',
      },
      {
        routineTitle: 'Demo: Alimentación',
        title: '2 frutas al día',
        is_done: false,
      },

      // Weekly review
      {
        routineTitle: 'Demo: Weekly review',
        title: 'Revisar objetivos (15 min)',
        is_done: true,
        completed_at: isoDaysAgo(8, 20 * 60 + 4),
        due_date: nextWeek,
      },
      {
        routineTitle: 'Demo: Weekly review',
        title: 'Planificar próxima semana',
        is_done: false,
        description: 'Bloques + 1 cosa que vas a simplificar.',
      },
    );
  }

  const taskRowsToInsert = tasks
    .filter((t) => routineIdByTitle.has(t.routineTitle))
    .map((t) => {
      const row: Record<string, unknown> = {
        user_id: userId,
        routine_id: routineIdByTitle.get(t.routineTitle)!,
        title: t.title,
        is_done: t.is_done,
      };

      return row;
    });

  const { data: createdTasks, error: taskError } = await supabase
    .from('routine_tasks')
    .insert(taskRowsToInsert)
    .select('id,routine_id,title');

  if (taskError) throw taskError;

  const taskRows = (createdTasks ?? []) as CreatedTask[];
  if (taskRows.length === 0) return;

  // Best-effort patch: optional metadata columns (and completed_at) may not exist if migrations are pending.
  if (
    canDescription ||
    canDueDate ||
    canDueTime ||
    canRecurring ||
    tasks.some((t) => t.completed_at)
  ) {
    const metaByKey = new Map(
      tasks
        .filter((t) => routineIdByTitle.has(t.routineTitle))
        .map((t) => [`${routineIdByTitle.get(t.routineTitle)!}::${t.title}`, t] as const),
    );

    await Promise.all(
      taskRows.map(async (row) => {
        const desired = metaByKey.get(`${row.routine_id}::${row.title}`);
        if (!desired) return;

        const patch: Record<string, unknown> = {};
        if (canDescription && desired.description != null) patch.description = desired.description;
        if (canDueDate && desired.due_date != null) patch.due_date = desired.due_date;
        if (canDueTime && desired.due_time != null) patch.due_time = desired.due_time;
        if (canRecurring && desired.is_recurring === true) patch.is_recurring = true;
        if (desired.completed_at != null) patch.completed_at = desired.completed_at;

        if (Object.keys(patch).length === 0) return;

        try {
          await supabase.from('routine_tasks').update(patch).eq('id', row.id);
        } catch {
          // ignore
        }
      }),
    );
  }

  // Create completion history across ~9 months so the dashboard/stats feel lived-in.
  const events: Array<{
    user_id: string;
    routine_id: string;
    routine_task_id: string;
    event_type: 'completed' | 'uncompleted';
    created_at: string;
  }> = [];

  const days = scope === 'dashboard' ? 60 : 270;
  const maxEvents = scope === 'dashboard' ? 250 : 1400;
  for (let day = 0; day < days; day++) {
    // Deterministic “random”: most days 0-3 completions.
    const completions = day % 7 === 0 ? 0 : (day * 13) % 4;
    for (let j = 0; j < completions; j++) {
      if (events.length >= maxEvents) break;
      const idx = (day * 7 + j * 3) % taskRows.length;
      const task = taskRows[idx]!;
      events.push({
        user_id: userId,
        routine_id: task.routine_id,
        routine_task_id: task.id,
        event_type: 'completed',
        created_at: isoDaysAgo(day, 8 * 60 + ((idx + j) % 6) * 23),
      });
    }

    // Occasional uncomplete events to exercise the event feed logic.
    if (day % 23 === 0 && events.length < maxEvents) {
      const idx = (day * 11) % taskRows.length;
      const task = taskRows[idx]!;
      events.push({
        user_id: userId,
        routine_id: task.routine_id,
        routine_task_id: task.id,
        event_type: 'uncompleted',
        created_at: isoDaysAgo(day, 19 * 60 + (idx % 5) * 11),
      });
    }
  }

  const { error: eventError } = await supabase.from('routine_task_events').insert(events);
  if (eventError) throw eventError;

  if (hasAppEvents) {
    const names = [
      'routine_created',
      'task_created',
      'tasks_created_bulk',
      'task_completed',
      'task_uncompleted',
      'task_deleted',
    ] as const;

    const appEvents: Array<{
      user_id: string;
      event_name: (typeof names)[number];
      routine_id: string | null;
      routine_task_id: string | null;
      meta: Record<string, unknown>;
      created_at: string;
    }> = [];

    const appEventCount = scope === 'dashboard' ? 15 : 60;
    for (let i = 0; i < appEventCount; i++) {
      const task = taskRows[(i * 5) % taskRows.length]!;
      const name = names[i % names.length]!;
      appEvents.push({
        user_id: userId,
        event_name: name,
        routine_id: task.routine_id,
        routine_task_id: task.id,
        meta: { source: 'demo_seed', i },
        created_at: isoDaysAgo(i % 30, 13 * 60 + (i % 6) * 9),
      });
    }

    // Best-effort only.
    try {
      await supabase.from('app_events').insert(appEvents);
    } catch {
      // ignore
    }
  }
}

export async function seedDashboardDemoData(userId: string) {
  assertDemoFeature('demo seeding');
  await seedFullDemoData(userId, 'dashboard');
}
