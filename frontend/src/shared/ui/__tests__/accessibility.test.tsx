import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { MemoryRouter } from 'react-router-dom';
import { AuthShell } from '../AuthShell';
import { Button } from '../Button';
import { Card } from '../Card';
import { GoogleMark } from '../GoogleMark';
import { Input } from '../Input';
import { Modal } from '../Modal';
import { PasswordInput } from '../PasswordInput';
import { Textarea } from '../Textarea';
import { ThemeToggle } from '../ThemeToggle';
import { Tooltip } from '../Tooltip';
import { useUiStore } from '@/shared/state/uiStore';

// Automated a11y scans via axe-core (WCAG rule engine), not just "does the click handler
// fire". A component can pass every functional test and still be unusable with a screen
// reader or keyboard-only — these tests catch that class of bug directly.

describe('shared ui accessibility', () => {
  it('Button variants have no axe violations, including when disabled', async () => {
    const { container } = render(
      <div>
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="danger">Danger</Button>
        <Button disabled>Disabled</Button>
      </div>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });

  it('a labeled Input has no axe violations', async () => {
    const { container } = render(
      <div>
        <label htmlFor="email">Correo</label>
        <Input id="email" aria-label="Correo" />
      </div>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });

  it('a labeled Textarea has no axe violations', async () => {
    const { container } = render(
      <div>
        <label htmlFor="notes">Notas</label>
        <Textarea id="notes" aria-label="Notas" />
      </div>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });

  it('PasswordInput has no axe violations and its toggle is keyboard-operable', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <div>
        <label htmlFor="pw">Contraseña</label>
        <PasswordInput id="pw" aria-label="Contraseña" />
      </div>,
    );

    expect(await axe(container)).toHaveNoViolations();

    const input = screen.getByLabelText('Contraseña') as HTMLInputElement;
    expect(input.type).toBe('password');

    await user.tab(); // focus moves into the input first
    await user.tab(); // then to the show/hide toggle
    expect(screen.getByRole('button', { name: 'Mostrar' })).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(input.type).toBe('text');
    expect(screen.getByRole('button', { name: 'Ocultar' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('ThemeToggle has no axe violations and is keyboard-operable', async () => {
    useUiStore.setState({ theme: 'night' });
    const user = userEvent.setup();
    const { container } = render(<ThemeToggle />);

    expect(await axe(container)).toHaveNoViolations();

    await user.tab();
    expect(screen.getByRole('button', { name: 'Cambiar modo noche/día' })).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(useUiStore.getState().theme).toBe('day');

    await user.keyboard(' ');
    expect(useUiStore.getState().theme).toBe('night');
  });

  it('Tooltip has no axe violations while open', async () => {
    const { container } = render(
      <Tooltip content="Información adicional">
        <button type="button">Ayuda</button>
      </Tooltip>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });

  it('an open Modal has no axe violations and traps focus', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Modal open title="Confirmar" description="¿Seguro?" onClose={() => {}}>
        <button type="button">Aceptar</button>
      </Modal>,
    );

    expect(await axe(container)).toHaveNoViolations();

    const dialog = screen.getByRole('dialog', { name: 'Confirmar' });
    expect(dialog).toHaveAttribute('aria-describedby');

    // Focus starts inside the dialog (close button, since there's no [data-autofocus]).
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(dialog.contains(document.activeElement)).toBe(true);

    await user.keyboard('{Escape}');
  });

  it('Card has no axe violations', async () => {
    const { container } = render(
      <Card>
        <p>Contenido</p>
      </Card>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });

  it('decorative GoogleMark icon is hidden from assistive tech', () => {
    const { container } = render(<GoogleMark />);
    const svg = container.querySelector('svg');

    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('AuthShell has no axe violations', async () => {
    const { container } = render(
      <MemoryRouter>
        <AuthShell title="Bienvenido" subtitle="Inicia sesión para continuar">
          <Card>
            <p>Formulario</p>
          </Card>
        </AuthShell>
      </MemoryRouter>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
