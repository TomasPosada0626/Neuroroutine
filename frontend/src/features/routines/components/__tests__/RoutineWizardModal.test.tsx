import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RoutineWizardModal } from '../RoutineWizardModal'

vi.mock('@/shared/state/uiStore', () => {
  return {
    useUiStore: (selector: (s: { theme: 'day' | 'night' }) => unknown) => selector({ theme: 'day' }),
  }
})

const addRoutine = vi.fn()
const addTasksBulk = vi.fn()
let offline = false
let authUser: { id: string } | null = { id: 'u1' }

vi.mock('@/features/routines/routinesStore', () => {
  return {
    useRoutines: () => ({
      offline,
      addRoutine,
      addTasksBulk,
    }),
  }
})

vi.mock('@/features/auth/authStore', () => {
  return {
    useAuth: () => ({
      user: authUser,
    }),
  }
})

describe('RoutineWizardModal', () => {
  it('requires a routine title before enabling submit', async () => {
    const user = userEvent.setup()

    addRoutine.mockResolvedValueOnce({ id: 'r1' })
    addTasksBulk.mockResolvedValueOnce(undefined)

    render(<RoutineWizardModal open onClose={() => {}} />)

    const submit = screen.getByRole('button', { name: 'Crear rutina' })
    expect(submit).toBeDisabled()

    await user.type(screen.getByPlaceholderText('Ej: Mañana enfocada'), 'Mi rutina')
    expect(submit).toBeEnabled()
  })

  it('creates a routine and bulk-creates normalized tasks', async () => {
    const user = userEvent.setup()

    addRoutine.mockResolvedValueOnce({ id: 'r1' })
    addTasksBulk.mockResolvedValueOnce(undefined)

    const onClose = vi.fn()
    const onCreated = vi.fn()

    render(<RoutineWizardModal open onClose={onClose} onCreated={onCreated} />)

    // Routine title
    const routineTitle = screen.getByPlaceholderText('Ej: Mañana enfocada')
    await user.type(routineTitle, '  Mi rutina  ')

    // First task
    const taskTitles = screen.getAllByPlaceholderText('Ej: Tomar agua')
    await user.type(taskTitles[0]!, '  Tarea 1  ')

    // Add second task row
    await user.click(screen.getByRole('button', { name: '+ Tarea' }))

    const taskTitles2 = screen.getAllByPlaceholderText('Ej: Tomar agua')
    await user.type(taskTitles2[1]!, 'Tarea 2')

    const taskDescs = screen.getAllByPlaceholderText('Ej: 2 litros')
    await user.type(taskDescs[1]!, '  desc  ')

    const dateInputs = Array.from(document.querySelectorAll('input[type="date"]')) as HTMLInputElement[]
    const timeInputs = Array.from(document.querySelectorAll('input[type="time"]')) as HTMLInputElement[]

    // Fill the second row date/time.
    await user.type(dateInputs[1]!, '2025-01-05')
    await user.type(timeInputs[1]!, '8:00:00')

    await user.click(screen.getByRole('button', { name: 'Crear rutina' }))

    expect(addRoutine).toHaveBeenCalledWith({
      user_id: 'u1',
      title: 'Mi rutina',
      notes: null,
    })

    expect(addTasksBulk).toHaveBeenCalledWith({
      user_id: 'u1',
      routine_id: 'r1',
      tasks: [
        { title: 'Tarea 1', description: null, due_date: null, due_time: null },
        { title: 'Tarea 2', description: 'desc', due_date: '2025-01-05', due_time: '08:00' },
      ],
    })

    expect(onCreated).toHaveBeenCalledWith('r1')
    expect(onClose).toHaveBeenCalled()
  })

  it('disables submit when offline', async () => {
    const user = userEvent.setup()

    offline = true
    addRoutine.mockReset()
    addTasksBulk.mockReset()

    render(<RoutineWizardModal open onClose={() => {}} />)

    const routineTitle = screen.getByPlaceholderText('Ej: Mañana enfocada')
    await user.type(routineTitle, 'Mi rutina')

    expect(screen.getByRole('button', { name: 'Crear rutina' })).toBeDisabled()
    expect(screen.getByText('Modo offline: puedes ver, pero no crear.')).toBeInTheDocument()

    // Single task row cannot be removed.
    expect(screen.getByRole('button', { name: 'Debe existir al menos una fila' })).toBeDisabled()

    offline = false
  })

  it('disables submit when user is missing', async () => {
    const user = userEvent.setup()
    authUser = null

    render(<RoutineWizardModal open onClose={() => {}} />)
    await user.type(screen.getByPlaceholderText('Ej: Mañana enfocada'), 'Mi rutina')

    expect(screen.getByRole('button', { name: 'Crear rutina' })).toBeDisabled()

    authUser = { id: 'u1' }
  })

  it('shows generic error message when create fails with non-Error value', async () => {
    const user = userEvent.setup()

    addRoutine.mockRejectedValueOnce('boom')

    render(<RoutineWizardModal open onClose={() => {}} />)

    await user.type(screen.getByPlaceholderText('Ej: Mañana enfocada'), 'Mi rutina')
    await user.click(screen.getByRole('button', { name: 'Crear rutina' }))

    expect(screen.getByText('No se pudo crear la rutina')).toBeInTheDocument()
  })
})
