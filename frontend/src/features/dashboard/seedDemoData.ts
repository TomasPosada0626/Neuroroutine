import { supabase } from '@/shared/api'

type CreatedRoutine = { id: string; title: string }

type CreatedTask = { id: string; routine_id: string; title: string }

function isoDaysAgo(daysAgo: number, minutesOffset = 12 * 60) {
  const d = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
  d.setMinutes(d.getMinutes() + minutesOffset)
  return d.toISOString()
}

export async function clearDashboardDemoData(userId: string) {
  const { data: routines, error: listError } = await supabase
    .from('routines')
    .select('id')
    .eq('user_id', userId)
    .like('title', 'Demo:%')

  if (listError) throw listError
  const ids = (routines ?? []).map((r) => r.id)
  if (ids.length === 0) return

  const { error: deleteError } = await supabase.from('routines').delete().in('id', ids)
  if (deleteError) throw deleteError
}

export async function seedDashboardDemoData(userId: string) {
  // Make it idempotent-ish for the current user.
  await clearDashboardDemoData(userId)

  const demoRoutines = [
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
  ]

  const { data: createdRoutines, error: routineError } = await supabase
    .from('routines')
    .insert(demoRoutines)
    .select('id,title')

  if (routineError) throw routineError

  const routines = (createdRoutines ?? []) as CreatedRoutine[]
  if (routines.length === 0) return

  const routineIdByTitle = new Map(routines.map((r) => [r.title, r.id]))

  const tasks = [
    // Mañana
    {
      user_id: userId,
      routine_id: routineIdByTitle.get('Demo: Mañana enfocada')!,
      title: 'Tomar agua (500ml)',
      is_done: true,
    },
    {
      user_id: userId,
      routine_id: routineIdByTitle.get('Demo: Mañana enfocada')!,
      title: '10 min journaling',
      is_done: false,
    },
    {
      user_id: userId,
      routine_id: routineIdByTitle.get('Demo: Mañana enfocada')!,
      title: 'Plan del día (3 prioridades)',
      is_done: true,
    },

    // Gym
    {
      user_id: userId,
      routine_id: routineIdByTitle.get('Demo: Gym / Fuerza')!,
      title: 'Sentadillas 3×5',
      is_done: false,
    },
    {
      user_id: userId,
      routine_id: routineIdByTitle.get('Demo: Gym / Fuerza')!,
      title: 'Press banca 3×5',
      is_done: true,
    },
    {
      user_id: userId,
      routine_id: routineIdByTitle.get('Demo: Gym / Fuerza')!,
      title: 'Movilidad 10 min',
      is_done: false,
    },

    // Estudio
    {
      user_id: userId,
      routine_id: routineIdByTitle.get('Demo: Estudio (deep work)')!,
      title: 'Pomodoro 25/5 × 2',
      is_done: true,
    },
    {
      user_id: userId,
      routine_id: routineIdByTitle.get('Demo: Estudio (deep work)')!,
      title: 'Repasar apuntes 15 min',
      is_done: false,
    },
    {
      user_id: userId,
      routine_id: routineIdByTitle.get('Demo: Estudio (deep work)')!,
      title: 'Resolver 3 ejercicios',
      is_done: true,
    },
  ]

  const { data: createdTasks, error: taskError } = await supabase
    .from('routine_tasks')
    .insert(tasks)
    .select('id,routine_id,title')

  if (taskError) throw taskError

  const taskRows = (createdTasks ?? []) as CreatedTask[]
  if (taskRows.length === 0) return

  // Create completion events across the last ~28 days so the dashboard heatmap/streaks look alive.
  // We only insert 'completed' events because the dashboard counts completed days.
  const taskIds = taskRows.map((t) => t.id)

  const events: Array<{
    user_id: string
    routine_id: string
    routine_task_id: string
    event_type: 'completed'
    created_at: string
  }> = []

  // Deterministic-ish distribution: a few events per week, spread out.
  const dayOffsets = [0, 1, 2, 4, 6, 8, 9, 11, 13, 15, 16, 18, 20, 22, 23, 25, 27]

  for (let i = 0; i < dayOffsets.length; i++) {
    const daysAgo = dayOffsets[i]!
    const taskId = taskIds[i % taskIds.length]!
    const task = taskRows.find((t) => t.id === taskId)
    if (!task) continue

    events.push({
      user_id: userId,
      routine_id: task.routine_id,
      routine_task_id: task.id,
      event_type: 'completed',
      created_at: isoDaysAgo(daysAgo, 8 * 60 + (i % 5) * 17),
    })
  }

  const { error: eventError } = await supabase.from('routine_task_events').insert(events)
  if (eventError) throw eventError
}
