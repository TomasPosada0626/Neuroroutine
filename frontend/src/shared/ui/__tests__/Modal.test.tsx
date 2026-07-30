import { fireEvent, render, screen } from '@testing-library/react';
import { Modal } from '../Modal';

vi.mock('@/shared/state/uiStore', () => {
  return {
    useUiStore: (selector: (s: { theme: 'day' | 'night' }) => unknown) =>
      selector({ theme: 'day' }),
  };
});

describe('Modal', () => {
  it('returns null when closed', () => {
    const { container } = render(
      <Modal open={false} onClose={() => {}}>
        <div>Body</div>
      </Modal>,
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders title/description/footer and closes on backdrop/cross click', () => {
    const onClose = vi.fn();

    render(
      <Modal
        open
        title="Edit routine"
        description="Update values"
        onClose={onClose}
        footer={<button type="button">Save</button>}
      >
        <div>Body</div>
      </Modal>,
    );

    expect(screen.getByRole('dialog')).not.toBeNull();
    expect(screen.getByText('Edit routine')).not.toBeNull();
    expect(screen.getByText('Update values')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Save' })).not.toBeNull();

    fireEvent.click(screen.getByLabelText('Cerrar'));
    fireEvent.click(document.querySelector('.bg-black\\/40') as Element);

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('closes on Escape and traps focus with Tab navigation', () => {
    const onClose = vi.fn();

    render(
      <Modal open onClose={onClose}>
        <button type="button">First</button>
        <button type="button">Last</button>
      </Modal>,
    );

    const first = screen.getByRole('button', { name: 'First' });
    const last = screen.getByRole('button', { name: 'Last' });

    last.focus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(document.activeElement).toBe(first);

    first.focus();
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('renders a description without a title', () => {
    render(
      <Modal open description="Just a description" onClose={() => {}}>
        <div>Body</div>
      </Modal>,
    );

    expect(screen.getByText('Just a description')).toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('does not wrap focus when Tab is pressed from a middle element', () => {
    render(
      <Modal open onClose={() => {}}>
        <button type="button">First</button>
        <button type="button">Middle</button>
        <button type="button">Last</button>
      </Modal>,
    );

    screen.getByRole('button', { name: 'Middle' }).focus();
    fireEvent.keyDown(window, { key: 'Tab' });

    // Not first or last, so trapFocus's wrap-around guard doesn't fire — the browser's own
    // default Tab behavior (untestable in jsdom) would move focus, but our handler shouldn't
    // have called preventDefault()/forced a specific element here.
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Middle' }));
  });

  it('ignores Tab when there is nothing focusable inside the dialog', () => {
    render(
      <Modal open onClose={() => {}}>
        <div>Just text, no focusable elements</div>
      </Modal>,
    );

    expect(() => fireEvent.keyDown(window, { key: 'Tab' })).not.toThrow();
  });

  it('focuses [data-autofocus] element when available', async () => {
    render(
      <Modal open onClose={() => {}}>
        <button type="button" data-autofocus>
          Auto Focus
        </button>
      </Modal>,
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Auto Focus' }));
  });

  it('falls back to focusing the dialog itself when there is nothing focusable inside', async () => {
    render(
      <Modal open onClose={() => {}}>
        <div>Just text, no focusable elements</div>
      </Modal>,
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.activeElement).toBe(screen.getByRole('dialog'));
  });

  it('compensates the scrollbar width when the page has a visible scrollbar', () => {
    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
    const clientWidthSpy = vi
      .spyOn(document.documentElement, 'clientWidth', 'get')
      .mockReturnValue(1000);

    render(
      <Modal open onClose={() => {}}>
        <div>Body</div>
      </Modal>,
    );

    expect(document.body.style.paddingRight).toBe('24px');

    clientWidthSpy.mockRestore();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth });
  });

  it('locks and restores document scrolling while open', () => {
    const { rerender } = render(
      <Modal open onClose={() => {}}>
        <div>Body</div>
      </Modal>,
    );

    expect(document.body.style.overflow).toBe('hidden');
    expect(document.documentElement.style.overflow).toBe('hidden');

    rerender(
      <Modal open={false} onClose={() => {}}>
        <div>Body</div>
      </Modal>,
    );

    expect(document.body.style.overflow).toBe('');
    expect(document.documentElement.style.overflow).toBe('');
  });
});
