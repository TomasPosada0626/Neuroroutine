import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/authStore';
import { deleteOwnAccount } from '@/features/auth/accountDeletionService';
import { Button, Input, Modal } from '@/shared/ui';

const CONFIRM_WORD = 'ELIMINAR';

type Props = {
  isDay: boolean;
  subtleText: string;
};

// PRIVACY.md SS5-6 promises self-service account deletion; until this existed the only path was
// emailing the operator. Typed confirmation (not just a second click) matches the weight of an
// irreversible, cascading delete of every routine/task/history row the user has.
export function DeleteAccountSection({ isDay, subtleText }: Props) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(false);

  const canConfirm = confirmText.trim().toUpperCase() === CONFIRM_WORD;

  const handleClose = () => {
    if (deleting) return;
    setOpen(false);
    setConfirmText('');
    setError(false);
  };

  const handleDelete = async () => {
    if (!canConfirm || deleting) return;
    setDeleting(true);
    setError(false);
    try {
      await deleteOwnAccount();
      // Best-effort: the account (and its session) is already gone server-side at this point,
      // so a sign-out failure here shouldn't block navigating away.
      await signOut().catch(() => {});
      navigate('/', { replace: true });
    } catch {
      setError(true);
      setDeleting(false);
    }
  };

  return (
    <div
      className={
        'rounded-lg p-3 ring-1 ' +
        (isDay ? 'bg-rose-50 ring-rose-200' : 'bg-rose-500/10 ring-rose-500/20')
      }
    >
      <div className="text-sm font-semibold text-rose-600">Zona de peligro</div>
      <div className={'mt-1 text-xs ' + subtleText}>
        Elimina tu cuenta y todos tus datos (rutinas, tareas, historial y preferencias) de forma
        permanente. Esta acción no se puede deshacer.
      </div>
      <div className="mt-3">
        <Button variant="danger" onClick={() => setOpen(true)}>
          Eliminar mi cuenta
        </Button>
      </div>

      <Modal
        open={open}
        title="Eliminar tu cuenta"
        description="Esta acción es permanente e inmediata: se borran tu cuenta, tus rutinas, tareas, historial y preferencias. No se puede deshacer."
        onClose={handleClose}
        footer={
          <>
            <Button variant="secondary" onClick={handleClose} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={!canConfirm || deleting}>
              {deleting ? 'Eliminando…' : 'Eliminar definitivamente'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className={'text-sm ' + subtleText}>
            Escribe <strong className="text-rose-600">{CONFIRM_WORD}</strong> para confirmar.
          </div>
          <Input
            aria-label={`Escribe ${CONFIRM_WORD} para confirmar`}
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoComplete="off"
            data-autofocus
          />
          {error ? (
            <div className="text-xs text-rose-600">
              No se pudo eliminar la cuenta. Intenta de nuevo o escríbenos a
              agendatomas2025@gmail.com.
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
