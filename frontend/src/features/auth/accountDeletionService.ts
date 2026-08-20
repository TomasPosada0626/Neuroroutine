import { supabase } from '@/shared/api';

// Wraps the delete_own_account RPC (backend/supabase/migrations/0017_account_deletion.sql): a
// security-definer function scoped to auth.uid() that deletes the caller's auth.users row, which
// cascades through every user-data table (routines, tasks, history, preferences, events).
export async function deleteOwnAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_own_account');
  if (error) throw error;
}
