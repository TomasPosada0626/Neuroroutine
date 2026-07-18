import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ThemeToggle } from '../ThemeToggle'
import { PasswordInput } from '../PasswordInput'
import { Tooltip } from '../Tooltip'
import { Card } from '../Card'
import { AuthShell } from '../AuthShell'
import { Modal } from '../Modal'
import { GoogleMark } from '../GoogleMark'
import { Button } from '../Button'
import { Input } from '../Input'
import { Textarea } from '../Textarea'
import { useUiStore } from '@/shared/state/uiStore'

describe('shared ui components', () => {
  it('ThemeToggle switches theme state when clicked', async () => {
    const user = userEvent.setup()
    useUiStore.setState({ theme: 'night' })

    render(<ThemeToggle />)

    const button = screen.getByRole('button', { name: 'Cambiar modo noche/día' })
    expect(button.getAttribute('aria-pressed')).toBe('false')

    await user.click(button)

    expect(useUiStore.getState().theme).toBe('day')
    expect(button.getAttribute('aria-pressed')).toBe('true')
  })

  it('PasswordInput toggles between password and text', async () => {
    const user = userEvent.setup()

    render(<PasswordInput placeholder="Password" />)

    const input = screen.getByPlaceholderText('Password') as HTMLInputElement
    expect(input.type).toBe('password')

    await user.click(screen.getByRole('button', { name: 'Mostrar' }))
    expect(input.type).toBe('text')

    await user.click(screen.getByRole('button', { name: 'Ocultar' }))
    expect(input.type).toBe('password')
  })

  it('Tooltip opens on hover and closes on outside pointer down', () => {
    render(
      <Tooltip content="Info content">
        <button type="button">Target</button>
      </Tooltip>,
    )

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Target' }))
    expect(screen.getByRole('tooltip').textContent).toContain('Info content')

    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('Tooltip toggles on touch pointer down and supports non-string content', () => {
    render(
      <Tooltip content={<span>Rich tip</span>}>
        <button type="button">Touch target</button>
      </Tooltip>,
    )

    const target = screen.getByRole('button', { name: 'Touch target' })
    fireEvent.pointerDown(target, { pointerType: 'touch' })
    expect(screen.getByRole('tooltip').textContent).toContain('Rich tip')

    fireEvent.pointerDown(target, { pointerType: 'touch' })
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('Tooltip returns only children when disabled', () => {
    render(
      <Tooltip content="Info content" disabled>
        <button type="button">Disabled target</button>
      </Tooltip>,
    )

    expect(screen.getByRole('button', { name: 'Disabled target' })).not.toBeNull()
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('Card applies day theme classes and custom className', () => {
    useUiStore.setState({ theme: 'day' })

    render(<Card className="custom-card">body</Card>)

    const card = screen.getByText('body')
    expect(card.className).toContain('custom-card')
    expect(card.className).toContain('bg-white')
  })

  it('Card applies night theme variant classes', () => {
    useUiStore.setState({ theme: 'night' })

    render(<Card>night card</Card>)

    const card = screen.getByText('night card')
    expect(card.className).toContain('bg-white/5')
  })

  it('AuthShell renders title, subtitle, badge and footer content', () => {
    useUiStore.setState({ theme: 'night' })

    render(
      <MemoryRouter>
        <AuthShell
          title="Welcome"
          subtitle="Subtitle"
          badge="Secure"
          footer={<div>Footer block</div>}
        >
          <div>Auth form</div>
        </AuthShell>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Welcome' })).not.toBeNull()
    expect(screen.getByText('Subtitle')).not.toBeNull()
    expect(screen.getByText('Secure')).not.toBeNull()
    expect(screen.getByText('Auth form')).not.toBeNull()
    expect(screen.getByText('Footer block')).not.toBeNull()
    expect(screen.getByRole('link', { name: 'Volver a la landing' })).not.toBeNull()
  })

  it('AuthShell works without subtitle, badge and footer', () => {
    useUiStore.setState({ theme: 'day' })

    render(
      <MemoryRouter>
        <AuthShell title="Only title">
          <div>Simple child</div>
        </AuthShell>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Only title' })).not.toBeNull()
    expect(screen.queryByText('Footer block')).toBeNull()
    expect(screen.queryByText('Secure')).toBeNull()
    expect(screen.getByText('Simple child')).not.toBeNull()
  })

  it('Button supports variant branches and theme-specific secondary styles', () => {
    act(() => {
      useUiStore.setState({ theme: 'day' })
    })
    const { rerender } = render(<Button variant="secondary">Secondary</Button>)
    expect(screen.getByRole('button', { name: 'Secondary' }).className).toContain('bg-white')

    rerender(<Button variant="danger">Danger</Button>)
    expect(screen.getByRole('button', { name: 'Danger' }).className).toContain('bg-rose-600')

    act(() => {
      useUiStore.setState({ theme: 'night' })
    })
    rerender(<Button variant="secondary">Secondary</Button>)
    expect(screen.getByRole('button', { name: 'Secondary' }).className).toContain('bg-white/10')
  })

  it('Input and Textarea cover day and night theme branches', () => {
    act(() => {
      useUiStore.setState({ theme: 'day' })
    })
    const { rerender } = render(
      <>
        <Input placeholder="Input day" />
        <Textarea placeholder="Textarea day" />
      </>,
    )
    expect(screen.getByPlaceholderText('Input day').className).toContain('bg-white')
    expect(screen.getByPlaceholderText('Textarea day').className).toContain('bg-white')

    act(() => {
      useUiStore.setState({ theme: 'night' })
    })
    rerender(
      <>
        <Input placeholder="Input day" />
        <Textarea placeholder="Textarea day" />
      </>,
    )
    expect(screen.getByPlaceholderText('Input day').className).toContain('bg-slate-950/40')
    expect(screen.getByPlaceholderText('Textarea day').className).toContain('bg-slate-950/40')
  })

  it('Modal renders when open and closes with escape and backdrop click', () => {
    const onClose = vi.fn()
    useUiStore.setState({ theme: 'night' })

    const { rerender } = render(
      <Modal open title="Dialog" description="Description" onClose={onClose} footer={<button type="button">Done</button>}>
        <button type="button" data-autofocus>
          Focus me
        </button>
      </Modal>,
    )

    expect(screen.getByRole('dialog')).not.toBeNull()
    expect(screen.getByText('Description')).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Done' })).not.toBeNull()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)

    const backdrop = document.querySelector('.absolute.inset-0.bg-black\\/40') as HTMLElement | null
    expect(backdrop).toBeTruthy()
    if (!backdrop) throw new Error('Backdrop not found')
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(2)

    rerender(<Modal open={false} onClose={onClose}>Hidden</Modal>)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('Modal traps focus with tab and closes with close button', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <Modal open title="Dialog" onClose={onClose}>
        <button type="button">First</button>
        <button type="button">Second</button>
      </Modal>,
    )

    const first = screen.getByRole('button', { name: 'First' })
    const second = screen.getByRole('button', { name: 'Second' })
    const dialog = screen.getByRole('dialog')

    second.focus()
    fireEvent.keyDown(window, { key: 'Tab' })
    expect(dialog.contains(document.activeElement)).toBe(true)

    first.focus()
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true })
    expect(dialog.contains(document.activeElement)).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('Modal without title and description renders body only', () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose}>
        <div>Only body</div>
      </Modal>,
    )

    expect(screen.getByRole('dialog')).not.toBeNull()
    expect(screen.getByText('Only body')).not.toBeNull()
    expect(screen.queryByRole('button', { name: 'Cerrar' })).toBeNull()
  })

  it('GoogleMark renders the svg with custom className', () => {
    const { container } = render(<GoogleMark className="brand-icon" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
    expect(svg?.className.baseVal).toContain('brand-icon')
  })
})
