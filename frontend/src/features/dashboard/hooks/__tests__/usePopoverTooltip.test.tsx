import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import { usePopoverTooltip } from '../usePopoverTooltip';

function TestHarness() {
  const { containerRef, tip, show, hide } = usePopoverTooltip();

  return (
    <div>
      <div ref={containerRef} data-testid="container">
        <button
          type="button"
          onClick={(e) => show(e, { title: 'Info', lines: ['line 1', 'line 2'] })}
        >
          show
        </button>
        <button type="button" onClick={hide}>
          hide
        </button>
      </div>
      <button type="button">outside</button>
      {tip ? (
        <div data-testid="tip">
          {tip.title}:{tip.x}:{tip.y}
        </div>
      ) : null}
    </div>
  );
}

function mockContainerRect() {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 200,
    height: 100,
    left: 10,
    top: 20,
    right: 210,
    bottom: 120,
    x: 10,
    y: 20,
    toJSON: () => {},
  });
}

describe('usePopoverTooltip', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does nothing when the container ref is not attached to a DOM node', () => {
    const { result } = renderHook(() => usePopoverTooltip());

    result.current.show({ clientX: 10, clientY: 10 }, { title: 'x', lines: [] });

    expect(result.current.tip).toBeNull();
  });

  it('clamps the tip position to the container bounds when the click is near an edge', () => {
    mockContainerRect();
    render(<TestHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'show' }), { clientX: 5, clientY: 5 });

    // rawX = 5 - left(10) = -5 -> clamped to min 64; rawY = 5 - top(20) = -15 -> clamped to min 36.
    expect(screen.getByTestId('tip').textContent).toBe('Info:64:36');
  });

  it('keeps the raw position when the click is well within bounds, and hide() clears it', () => {
    mockContainerRect();
    render(<TestHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'show' }), { clientX: 110, clientY: 70 });

    // rawX = 110 - 10 = 100 (within [64, 136]); rawY = 70 - 20 = 50 (within [36, 88]).
    expect(screen.getByTestId('tip').textContent).toBe('Info:100:50');

    fireEvent.click(screen.getByRole('button', { name: 'hide' }));
    expect(screen.queryByTestId('tip')).not.toBeInTheDocument();
  });

  it('closes the tip on an outside pointerdown but not on one inside the container', () => {
    mockContainerRect();
    render(<TestHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'show' }), { clientX: 110, clientY: 70 });
    expect(screen.getByTestId('tip')).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByRole('button', { name: 'show' }));
    expect(screen.getByTestId('tip')).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByRole('button', { name: 'outside' }));
    expect(screen.queryByTestId('tip')).not.toBeInTheDocument();
  });
});
