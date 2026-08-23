'use client';

import { useState, type FormEvent } from 'react';
import type { Profile, Role } from '@/lib/supabase/profile';

const ROLE_NOUN: Record<'teacher' | 'student', string> = {
  teacher: 'teacher',
  student: 'student',
};

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

export default function AccountsTable({
  role,
  initialAccounts,
}: {
  role: Extract<Role, 'teacher' | 'student'>;
  initialAccounts: Profile[];
}) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [showCreate, setShowCreate] = useState(false);
  const [passwordRowId, setPasswordRowId] = useState<string | null>(null);
  const [rowLoading, setRowLoading] = useState<string | null>(null);
  const [error, setError] = useState<string>();

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground capitalize">{role}s</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {accounts.length} {ROLE_NOUN[role]} account{accounts.length === 1 ? '' : 's'}
          </p>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
        >
          New {ROLE_NOUN[role]}
        </button>
      </div>

      {showCreate && (
        <CreateForm
          role={role}
          onCreated={(account) => {
            setAccounts((prev) => [account, ...prev]);
            setShowCreate(false);
          }}
        />
      )}

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      <div className="mt-6 space-y-2">
        {accounts.map((account) => (
          <div key={account.id} className="rounded-xl border border-border bg-card shadow-sm p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-foreground">{account.full_name || account.email}</p>
                <p className="mt-1 text-sm text-muted-foreground">{account.email}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {account.restricted && (
                  <span className="rounded-full bg-danger/10 px-2 py-1 text-xs font-semibold text-danger">
                    Restricted
                  </span>
                )}
                <button
                  disabled={rowLoading === account.id}
                  onClick={async () => {
                    setError(undefined);
                    setRowLoading(account.id);
                    try {
                      await postJson('/api/admin/set-restricted', {
                        userId: account.id,
                        restricted: !account.restricted,
                      });
                      setAccounts((prev) =>
                        prev.map((a) => (a.id === account.id ? { ...a, restricted: !a.restricted } : a))
                      );
                    } catch (cause) {
                      setError(cause instanceof Error ? cause.message : 'Something went wrong.');
                    } finally {
                      setRowLoading(null);
                    }
                  }}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-50"
                >
                  {account.restricted ? 'Unrestrict' : 'Restrict'}
                </button>
                <button
                  onClick={() => setPasswordRowId(passwordRowId === account.id ? null : account.id)}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-secondary"
                >
                  Set password
                </button>
              </div>
            </div>

            {passwordRowId === account.id && (
              <SetPasswordForm
                userId={account.id}
                onDone={() => setPasswordRowId(null)}
                onError={setError}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function CreateForm({
  role,
  onCreated,
}: {
  role: Extract<Role, 'teacher' | 'student'>;
  onCreated: (account: Profile) => void;
}) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(undefined);
    try {
      const { id } = await postJson('/api/admin/create-user', {
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        role,
      });
      onCreated({ id, email: email.trim(), full_name: fullName.trim(), role, restricted: false });
      setEmail('');
      setFullName('');
      setPassword('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 rounded-xl border border-border bg-card shadow-sm p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <input
          type="text"
          placeholder="Full name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
        <input
          type="text"
          placeholder="Temporary password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={loading || !email.trim() || !fullName.trim() || !password}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
      >
        {loading ? 'Creating…' : 'Create account'}
      </button>
    </form>
  );
}

function SetPasswordForm({
  userId,
  onDone,
  onError,
}: {
  userId: string;
  onDone: () => void;
  onError: (message?: string) => void;
}) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    onError(undefined);
    try {
      await postJson('/api/admin/set-password', { userId, password });
      onDone();
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex items-center gap-2 border-t border-border pt-3">
      <input
        type="text"
        placeholder="New password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
      />
      <button
        type="submit"
        disabled={loading || !password}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
      >
        {loading ? 'Saving…' : 'Save'}
      </button>
    </form>
  );
}
