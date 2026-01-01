import React, { useEffect, useState } from 'react';
import {
  apiLogin,
  apiWhoAmI,
  apiOwnerSystemInfo,
  apiOwnerUsers,
  apiOwnerUpdateUserRole,
  apiOwnerDeleteUser,
} from './api';
import type { OwnerUser } from './api';

interface Session {
  token: string;
  email: string;
  role: string;
}

const STORAGE_KEY = 'pakafi_console_session';

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveSession(session: Session | null) {
  if (!session) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }
}

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [email, setEmail] = useState('founder@quietora.com');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  const [whoami, setWhoami] = useState<any | null>(null);
  const [systemInfo, setSystemInfo] = useState<any | null>(null);
  const [users, setUsers] = useState<OwnerUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshFlag, setRefreshFlag] = useState(0);

  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const [userActionLoadingId, setUserActionLoadingId] = useState<number | null>(null);
  const [userActionError, setUserActionError] = useState<string | null>(null);
  const [userActionSuccess, setUserActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    saveSession(session);
  }, [session]);

  useEffect(() => {
    if (!session) {
      setWhoami(null);
      setSystemInfo(null);
      setUsers([]);
      setCurrentUserId(null);
      return;
    }

    const run = async () => {
      try {
        setLoading(true);
        setUserActionError(null);
        setUserActionSuccess(null);

        const [who, sys, usrs] = await Promise.all([
          apiWhoAmI(session.token),
          apiOwnerSystemInfo(session.token),
          apiOwnerUsers(session.token),
        ]);

        setWhoami(who);
        setSystemInfo(sys);
        setUsers(usrs);
        const sub = who?.user?.sub;
        if (typeof sub === 'number') {
          setCurrentUserId(sub);
        }
      } catch (e) {
        console.error(e);
        setLoginError('Session invalide ou expirée, reconnecte-toi.');
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [session, refreshFlag]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setUserActionError(null);
    setUserActionSuccess(null);
    setLoading(true);

    try {
      const res = await apiLogin(email, password);
      setSession({
        token: res.token,
        email: res.user.email,
        role: res.user.role,
      });
      setPassword('');
    } catch (err: any) {
      console.error(err);
      setLoginError(err.message || 'Échec de la connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setSession(null);
    setWhoami(null);
    setSystemInfo(null);
    setUsers([]);
    setCurrentUserId(null);
    setUserActionError(null);
    setUserActionSuccess(null);
  };

  const refreshData = () => {
    setRefreshFlag((x) => x + 1);
  };

  const isOwner = session?.role === 'OWNER';

  const handleChangeRole = async (user: OwnerUser, newRole: 'USER' | 'ADMIN') => {
    if (!session) return;
    setUserActionError(null);
    setUserActionSuccess(null);

    // sécurité côté UI : ne pas toucher les OWNER
    if (user.role === 'OWNER') {
      setUserActionError('Impossible de changer le rôle d’un OWNER.');
      return;
    }

    setUserActionLoadingId(user.id);
    try {
      const updated = await apiOwnerUpdateUserRole(session.token, user.id, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: updated.role } : u)),
      );
      setUserActionSuccess(
        `Rôle de ${user.email} mis à jour : ${updated.role}`,
      );
    } catch (e: any) {
      console.error(e);
      setUserActionError(
        e.message || 'Erreur lors de la mise à jour du rôle.',
      );
    } finally {
      setUserActionLoadingId(null);
    }
  };

  const handleDeleteUser = async (user: OwnerUser) => {
    if (!session) return;

    setUserActionError(null);
    setUserActionSuccess(null);

    if (user.role === 'OWNER') {
      setUserActionError('Impossible de supprimer un OWNER.');
      return;
    }
    if (currentUserId && user.id === currentUserId) {
      setUserActionError('Tu ne peux pas te supprimer toi-même.');
      return;
    }

    const ok = window.confirm(
      `Supprimer définitivement l’utilisateur ${user.email} ?`,
    );
    if (!ok) return;

    setUserActionLoadingId(user.id);
    try {
      await apiOwnerDeleteUser(session.token, user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setUserActionSuccess(`Utilisateur ${user.email} supprimé avec succès.`);
    } catch (e: any) {
      console.error(e);
      setUserActionError(
        e.message || 'Erreur lors de la suppression de l’utilisateur.',
      );
    } finally {
      setUserActionLoadingId(null);
    }
  };

  return (
    <div
      style={{
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        padding: '2rem',
        background:
          'radial-gradient(circle at top, #0f172a 0, #020617 38%, #000 100%)',
        minHeight: '100vh',
        color: '#f9fafb',
      }}
    >
      {/* Header empire */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.9rem', marginBottom: '0.2rem' }}>
            Quietora ▸ <span style={{ opacity: 0.9 }}>Pakafi Core Console</span>
          </h1>
          <p style={{ opacity: 0.75, fontSize: '0.95rem' }}>
            God Mode fondateur • contrôle du noyau de l’empire.
          </p>
        </div>
        {systemInfo && (
          <div
            style={{
              padding: '0.7rem 1rem',
              borderRadius: '999px',
              border: '1px solid #1e293b',
              background: '#020617aa',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <span
              style={{
                width: '0.7rem',
                height: '0.7rem',
                borderRadius: '999px',
                background:
                  systemInfo.database?.status === 'ok'
                    ? '#22c55e'
                    : '#ef4444',
                boxShadow:
                  systemInfo.database?.status === 'ok'
                    ? '0 0 12px #22c55e80'
                    : '0 0 12px #ef444480',
              }}
            />
            <span>{systemInfo.app || 'Pakafi Core'}</span>
            <span style={{ opacity: 0.6 }}>
              v{systemInfo.version || '0.1.0'}
            </span>
            <span style={{ opacity: 0.6 }}>
              • {systemInfo.database?.users ?? 0} utilisateur(s)
            </span>
          </div>
        )}
      </header>

      {/* Ligne principale */}
      <div
        style={{
          display: 'flex',
          gap: '1.5rem',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
        }}
      >
        {/* Bloc login / session */}
        <div
          style={{
            background: '#020617dd',
            padding: '1rem 1.2rem',
            borderRadius: '0.9rem',
            border: '1px solid #1e293b',
            minWidth: '260px',
            maxWidth: '360px',
          }}
        >
          <h2 style={{ fontSize: '1.05rem', marginBottom: '0.8rem' }}>
            {session ? 'Session fondateur' : 'Connexion fondateur'}
          </h2>

          {!session && (
            <form
              onSubmit={handleLogin}
              style={{ display: 'grid', gap: '0.6rem' }}
            >
              <label style={{ fontSize: '0.9rem' }}>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    marginTop: '0.25rem',
                    padding: '0.4rem 0.5rem',
                    borderRadius: '0.4rem',
                    border: '1px solid #1f2937',
                    background: '#020617',
                    color: '#f9fafb',
                  }}
                />
              </label>
              <label style={{ fontSize: '0.9rem' }}>
                Mot de passe
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    marginTop: '0.25rem',
                    padding: '0.4rem 0.5rem',
                    borderRadius: '0.4rem',
                    border: '1px solid #1f2937',
                    background: '#020617',
                    color: '#f9fafb',
                  }}
                />
              </label>
              {loginError && (
                <div
                  style={{
                    color: '#fecaca',
                    background: '#7f1d1d',
                    borderRadius: '0.5rem',
                    padding: '0.45rem 0.6rem',
                    fontSize: '0.8rem',
                    border: '1px solid #b91c1c',
                  }}
                >
                  {loginError}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: '0.4rem',
                  padding: '0.5rem 0.9rem',
                  borderRadius: '999px',
                  border: 'none',
                  background: loading ? '#4b5563' : '#22c55e',
                  color: '#020617',
                  fontWeight: 600,
                  cursor: loading ? 'default' : 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
              <p
                style={{
                  marginTop: '0.3rem',
                  fontSize: '0.8rem',
                  opacity: 0.7,
                }}
              >
                Utilise l’email fondateur{' '}
                <code>founder@quietora.com</code>.
              </p>
            </form>
          )}

          {session && (
            <div style={{ display: 'grid', gap: '0.4rem', fontSize: '0.9rem' }}>
              <div>
                <div style={{ opacity: 0.7, marginBottom: '0.2rem' }}>
                  Connecté en tant que :
                </div>
                <div style={{ fontWeight: 600 }}>{session.email}</div>
                <div style={{ opacity: 0.7 }}>Rôle : {session.role}</div>
                {currentUserId && (
                  <div style={{ opacity: 0.6, fontSize: '0.8rem' }}>
                    ID interne : {currentUserId}
                  </div>
                )}
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  marginTop: '0.6rem',
                  flexWrap: 'wrap',
                }}
              >
                <button
                  type="button"
                  onClick={refreshData}
                  disabled={loading}
                  style={{
                    padding: '0.35rem 0.8rem',
                    borderRadius: '999px',
                    border: '1px solid #22c55e',
                    background: 'transparent',
                    color: '#bbf7d0',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Rafraîchir
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    padding: '0.35rem 0.8rem',
                    borderRadius: '999px',
                    border: '1px solid #f97373',
                    background: 'transparent',
                    color: '#fecaca',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Se déconnecter
                </button>
              </div>

              {(userActionError || userActionSuccess) && (
                <div style={{ marginTop: '0.6rem' }}>
                  {userActionError && (
                    <div
                      style={{
                        background: '#7f1d1d',
                        borderRadius: '0.5rem',
                        padding: '0.4rem 0.6rem',
                        border: '1px solid #b91c1c',
                        fontSize: '0.8rem',
                        marginBottom: '0.3rem',
                      }}
                    >
                      {userActionError}
                    </div>
                  )}
                  {userActionSuccess && (
                    <div
                      style={{
                        background: '#064e3b',
                        borderRadius: '0.5rem',
                        padding: '0.4rem 0.6rem',
                        border: '1px solid #15803d',
                        fontSize: '0.8rem',
                      }}
                    >
                      {userActionSuccess}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bloc infos système et whoami */}
        {session && (
          <div
            style={{
              flex: 1,
              minWidth: '260px',
              display: 'grid',
              gap: '1rem',
            }}
          >
            <div
              style={{
                background: '#020617dd',
                padding: '1rem 1.2rem',
                borderRadius: '0.9rem',
                border: '1px solid #1e293b',
              }}
            >
              <h2 style={{ fontSize: '1.05rem', marginBottom: '0.6rem' }}>
                whoami (backend)
              </h2>
              <pre
                style={{
                  margin: 0,
                  padding: '0.6rem 0.7rem',
                  borderRadius: '0.5rem',
                  background: '#020617',
                  border: '1px solid #111827',
                  fontSize: '0.8rem',
                  maxHeight: '220px',
                  overflow: 'auto',
                }}
              >
                {whoami ? JSON.stringify(whoami, null, 2) : 'Chargement...'}
              </pre>
            </div>

            <div
              style={{
                background: '#020617dd',
                padding: '1rem 1.2rem',
                borderRadius: '0.9rem',
                border: '1px solid #1e293b',
              }}
            >
              <h2 style={{ fontSize: '1.05rem', marginBottom: '0.6rem' }}>
                System info
              </h2>
              <pre
                style={{
                  margin: 0,
                  padding: '0.6rem 0.7rem',
                  borderRadius: '0.5rem',
                  background: '#020617',
                  border: '1px solid #111827',
                  fontSize: '0.8rem',
                  maxHeight: '220px',
                  overflow: 'auto',
                }}
              >
                {systemInfo
                  ? JSON.stringify(systemInfo, null, 2)
                  : 'Chargement...'}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Bloc users OWNER */}
      {session && isOwner && (
        <div style={{ marginTop: '2rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '1rem',
              alignItems: 'center',
              marginBottom: '0.6rem',
            }}
          >
            <h2 style={{ fontSize: '1.2rem' }}>
              Utilisateurs ▸ vue OWNER (god mode)
            </h2>
            <span style={{ fontSize: '0.85rem', opacity: 0.75 }}>
              Total : {users.length}
            </span>
          </div>

          {users.length === 0 ? (
            <div
              style={{
                opacity: 0.7,
                fontSize: '0.9rem',
                background: '#020617dd',
                borderRadius: '0.75rem',
                padding: '0.7rem 0.9rem',
                border: '1px solid #1e293b',
              }}
            >
              Aucun utilisateur pour le moment.
            </div>
          ) : (
            <div
              style={{
                overflowX: 'auto',
                borderRadius: '0.9rem',
                border: '1px solid #1e293b',
                background: '#020617dd',
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.9rem',
                }}
              >
                <thead>
                  <tr style={{ background: '#020617' }}>
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '0.55rem 0.8rem',
                        borderBottom: '1px solid #1f2937',
                      }}
                    >
                      ID
                    </th>
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '0.55rem 0.8rem',
                        borderBottom: '1px solid #1f2937',
                      }}
                    >
                      Email
                    </th>
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '0.55rem 0.8rem',
                        borderBottom: '1px solid #1f2937',
                      }}
                    >
                      Nom
                    </th>
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '0.55rem 0.8rem',
                        borderBottom: '1px solid #1f2937',
                      }}
                    >
                      Rôle
                    </th>
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '0.55rem 0.8rem',
                        borderBottom: '1px solid #1f2937',
                      }}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isSelf = currentUserId === u.id;
                    const isOwnerRow = u.role === 'OWNER';

                    return (
                      <tr key={u.id}>
                        <td
                          style={{
                            padding: '0.5rem 0.8rem',
                            borderBottom: '1px solid #0f172a',
                            opacity: isOwnerRow ? 1 : 0.9,
                          }}
                        >
                          {u.id}
                        </td>
                        <td
                          style={{
                            padding: '0.5rem 0.8rem',
                            borderBottom: '1px solid #0f172a',
                            opacity: isOwnerRow ? 1 : 0.9,
                          }}
                        >
                          {u.email}
                          {isSelf && (
                            <span
                              style={{
                                marginLeft: '0.4rem',
                                fontSize: '0.75rem',
                                padding: '0.1rem 0.4rem',
                                borderRadius: '999px',
                                border: '1px solid #22c55e66',
                                color: '#bbf7d0',
                              }}
                            >
                              toi
                            </span>
                          )}
                        </td>
                        <td
                          style={{
                            padding: '0.5rem 0.8rem',
                            borderBottom: '1px solid #0f172a',
                            opacity: isOwnerRow ? 1 : 0.9,
                          }}
                        >
                          {u.name || '-'}
                        </td>
                        <td
                          style={{
                            padding: '0.5rem 0.8rem',
                            borderBottom: '1px solid #0f172a',
                          }}
                        >
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.1rem 0.5rem',
                              borderRadius: '999px',
                              fontSize: '0.8rem',
                              border: isOwnerRow
                                ? '1px solid #facc15'
                                : u.role === 'ADMIN'
                                ? '1px solid #38bdf8'
                                : '1px solid #4b5563',
                              color: isOwnerRow
                                ? '#facc15'
                                : u.role === 'ADMIN'
                                ? '#7dd3fc'
                                : '#e5e7eb',
                            }}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: '0.5rem 0.8rem',
                            borderBottom: '1px solid #0f172a',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              gap: '0.4rem',
                              flexWrap: 'wrap',
                            }}
                          >
                            {/* Change role */}
                            {!isOwnerRow && (
                              <>
                                {u.role !== 'ADMIN' && (
                                  <button
                                    type="button"
                                    disabled={userActionLoadingId === u.id}
                                    onClick={() =>
                                      handleChangeRole(u, 'ADMIN')
                                    }
                                    style={{
                                      padding: '0.25rem 0.6rem',
                                      borderRadius: '999px',
                                      border: '1px solid #38bdf8',
                                      background: 'transparent',
                                      color: '#7dd3fc',
                                      fontSize: '0.8rem',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {userActionLoadingId === u.id
                                      ? '...'
                                      : 'Promouvoir ADMIN'}
                                  </button>
                                )}
                                {u.role !== 'USER' && (
                                  <button
                                    type="button"
                                    disabled={userActionLoadingId === u.id}
                                    onClick={() =>
                                      handleChangeRole(u, 'USER')
                                    }
                                    style={{
                                      padding: '0.25rem 0.6rem',
                                      borderRadius: '999px',
                                      border: '1px solid #9ca3af',
                                      background: 'transparent',
                                      color: '#e5e7eb',
                                      fontSize: '0.8rem',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {userActionLoadingId === u.id
                                      ? '...'
                                      : 'Rendre USER'}
                                  </button>
                                )}
                              </>
                            )}

                            {/* Delete */}
                            {!isOwnerRow && (
                              <button
                                type="button"
                                disabled={userActionLoadingId === u.id}
                                onClick={() => handleDeleteUser(u)}
                                style={{
                                  padding: '0.25rem 0.6rem',
                                  borderRadius: '999px',
                                  border: '1px solid #f97373',
                                  background: 'transparent',
                                  color: '#fecaca',
                                  fontSize: '0.8rem',
                                  cursor: 'pointer',
                                }}
                              >
                                {userActionLoadingId === u.id
                                  ? '...'
                                  : 'Supprimer'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!session && (
        <div
          style={{
            marginTop: '1.4rem',
            fontSize: '0.85rem',
            opacity: 0.7,
          }}
        >
          Connecte-toi avec le compte fondateur pour accéder aux
          contrôles OWNER.
        </div>
      )}
    </div>
  );
};

export default App;
