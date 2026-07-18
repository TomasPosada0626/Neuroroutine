import { fireEvent, render, screen } from '@testing-library/react'
import { Tooltip } from '../Tooltip'

describe('Tooltip', () => {
  it('renders children only when disabled or empty content', () => {
    const { rerender } = render(
      <Tooltip content="" disabled>
        <button type="button">Target</button>
      </Tooltip>,
    )

    expect(screen.getByRole('button', { name: 'Target' })).not.toBeNull()
    expect(screen.queryByRole('tooltip')).toBeNull()

    rerender(
      <Tooltip content={null}>
        <button type="button">Target</button>
      </Tooltip>,
    )

    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('opens on hover/focus and closes on leave/blur', () => {
    render(
      <Tooltip content="More info">
        <button type="button">Target</button>
      </Tooltip>,
    )

    const target = screen.getByRole('button', { name: 'Target' })

    fireEvent.mouseEnter(target)
    expect(screen.getByRole('tooltip')).not.toBeNull()

    fireEvent.mouseLeave(target)
    expect(screen.queryByRole('tooltip')).toBeNull()

    fireEvent.focus(target)
    expect(screen.getByRole('tooltip')).not.toBeNull()

    fireEvent.blur(target)
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('toggles on touch pointer and closes on outside pointerdown', () => {
    render(
      <div>
        <Tooltip content="Touch info" isDay={false}>
          <button type="button">Target</button>
        </Tooltip>
        <button type="button">Outside</button>
      </div>,
    )

    const target = screen.getByRole('button', { name: 'Target' })
    const outside = screen.getByRole('button', { name: 'Outside' })

    fireEvent.pointerDown(target, { pointerType: 'touch' })
    expect(screen.getByRole('tooltip')).not.toBeNull()

    fireEvent.pointerDown(outside)
    expect(screen.queryByRole('tooltip')).toBeNull()

    fireEvent.pointerDown(target, { pointerType: 'pen' })
    expect(screen.getByRole('tooltip')).not.toBeNull()

    fireEvent.pointerDown(target, { pointerType: 'pen' })
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('keeps tooltip open when pointerdown happens inside root', () => {
    render(
      <Tooltip content={<span>Node content</span>}>
        <button type="button">Target</button>
      </Tooltip>,
    )

    const target = screen.getByRole('button', { name: 'Target' })
    fireEvent.mouseEnter(target)

    const tooltip = screen.getByRole('tooltip')
    fireEvent.pointerDown(tooltip)

    expect(screen.getByRole('tooltip')).not.toBeNull()
  })
})
