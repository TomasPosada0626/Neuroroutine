import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DeleteAccountSection } from '../components/DeleteAccountSection';
import { useAuth } from '@/features/auth/authStore';
import { deleteOwnAccount } from '@/features/auth/accountDeletionService';

vi.mock('@/features/auth/authStore', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/features/auth/accountDeletionService', () => ({
  deleteOwnAccount: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedDeleteOwnAccount = vi.mocked(deleteOwnAccount);

function renderSection() {
  return render(
    <MemoryRouter initialEntries={['/app']}>
      <Routes>
        <Route path="/app" element={<DeleteAccountSection isDay subtleText="text-slate-500" />} />
        <Route path="/" element={<div>Landing</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('DeleteAccountSection', () => {
  beforeEach(() => {
    mockedUseAuth.mockReturnValue({ signOut: vi.fn().mockResolvedValue(undefined) } as never);
    mockedDeleteOwnAccount.mockReset();
  });

  it('keeps the confirm button disabled until the exact confirmation word is typed', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole('button', { name: 'Eliminar mi cuenta' }));
    const confirmButton = screen.getByRole('button', { name: 'Eliminar definitivamente' });
    expect(confirmButton).toBeDisabled();

    await user.type(screen.getByRole('textbox'), 'nope');
    expect(confirmButton).toBeDisabled();

    await user.clear(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), 'eliminar');
    expect(confirmButton).toBeEnabled();
  });

  it('deletes the account, signs out, and navigates to / on confirm', async () => {
    const user = userEvent.setup();
    mockedDeleteOwnAccount.mockResolvedValue(undefined);
    renderSection();

    await user.click(screen.getByRole('button', { name: 'Eliminar mi cuenta' }));
    await user.type(screen.getByRole('textbox'), 'ELIMINAR');
    await user.click(screen.getByRole('button', { name: 'Eliminar definitivamente' }));

    await waitFor(() => {
      expect(screen.getByText('Landing')).toBeInTheDocument();
    });
    expect(mockedDeleteOwnAccount).toHaveBeenCalled();
  });

  it('shows an error and stays put when deletion fails', async () => {
    const user = userEvent.setup();
    mockedDeleteOwnAccount.mockRejectedValue(new Error('nope'));
    renderSection();

    await user.click(screen.getByRole('button', { name: 'Eliminar mi cuenta' }));
    await user.type(screen.getByRole('textbox'), 'ELIMINAR');
    await user.click(screen.getByRole('button', { name: 'Eliminar definitivamente' }));

    await waitFor(() => {
      expect(screen.getByText(/No se pudo eliminar la cuenta/)).toBeInTheDocument();
    });
    expect(screen.queryByText('Landing')).not.toBeInTheDocument();
  });

  it('closes and resets the confirmation text on cancel', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole('button', { name: 'Eliminar mi cuenta' }));
    await user.type(screen.getByRole('textbox'), 'ELIMINAR');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
