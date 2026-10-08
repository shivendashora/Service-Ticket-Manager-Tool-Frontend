import { useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass, faUsers } from '@fortawesome/free-solid-svg-icons';
import { usersApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useUsers } from '../hooks/useUsers';
import { Avatar, ConfirmDialog, EmptyState, RoleBadge, Spinner } from '../components/ui';

const ROLE_TABS = [
  { value: 'all', label: 'Everyone' },
  { value: 'admin', label: 'Admins' },
  { value: 'user', label: 'Agents' },
];

const UsersPage = () => {
  const { user: me } = useAuth();
  const toast = useToast();
  const { users, setUsers, loading } = useUsers();
  const [role, setRole] = useState('all');
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState(null);

  const counts = useMemo(
    () => ({
      all: users.length,
      admin: users.filter((u) => u.role === 'admin').length,
      user: users.filter((u) => u.role === 'user').length,
    }),
    [users]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter(
      (u) =>
        (role === 'all' || u.role === role) &&
        (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    );
  }, [users, role, query]);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Team</h1>
          <p className="muted">Manage who can administer the support queue.</p>
        </div>
      </header>

      <div className="panel panel-flush">
        <div className="toolbar">
          <div className="tabs" role="tablist">
            {ROLE_TABS.map((t) => (
              <button
                key={t.value}
                role="tab"
                aria-selected={role === t.value}
                className={`tab ${role === t.value ? 'is-active' : ''}`}
                onClick={() => setRole(t.value)}
              >
                {t.label}
                <span className="tab-count">{counts[t.value]}</span>
              </button>
            ))}
          </div>
          <div className="input-icon toolbar-search">
            <FontAwesomeIcon icon={faMagnifyingGlass} />
            <input
              className="input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email"
            />
          </div>
        </div>

        {loading ? (
          <div className="panel-center">
            <Spinner size="lg" />
          </div>
        ) : visible.length === 0 ? (
          <EmptyState icon={faUsers} title="No people found">
            Try a different filter or search term.
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table table-static table-cards">
              <thead>
                <tr>
                  <th>Name</th>
                  <th className="hide-sm">Email</th>
                  <th>Role</th>
                  <th className="col-actions">Access</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((u) => {
                  const isMe = u.id === me.id;
                  return (
                    <tr key={u.id}>
                      <td className="cell-main">
                        <div className="cell-user">
                          <Avatar id={u.id} name={u.name} />
                          <div className="cell-user-text">
                            <strong>
                              {u.name} {isMe && <span className="muted">(you)</span>}
                            </strong>
                            <span className="muted small show-sm">{u.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="hide-sm muted">{u.email}</td>
                      <td className="cell-status">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="col-actions cell-assignees">
                        <select
                          className="input input-sm"
                          value={u.role}
                          disabled={isMe}
                          title={isMe ? 'You cannot change your own role' : undefined}
                          onChange={(e) => setPending({ user: u, role: e.target.value })}
                          aria-label={`Role for ${u.name}`}
                        >
                          <option value="user">Agent</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pending && (
        <ConfirmDialog
          title={pending.role === 'admin' ? 'Make admin?' : 'Remove admin access?'}
          message={
            pending.role === 'admin'
              ? `${pending.user.name} will be able to create, assign and delete tickets and manage roles.`
              : `${pending.user.name} will only see tickets assigned to them.`
          }
          confirmLabel={pending.role === 'admin' ? 'Make admin' : 'Make agent'}
          danger={pending.role === 'user'}
          onClose={() => setPending(null)}
          onConfirm={async () => {
            try {
              const updated = await usersApi.updateRole(pending.user.id, pending.role);
              setUsers((list) => list.map((u) => (u.id === updated.id ? updated : u)));
              toast.success(`${updated.name} is now ${updated.role === 'admin' ? 'an admin' : 'an agent'}`);
            } catch (err) {
              toast.error(err.message);
              throw err;
            }
          }}
        />
      )}
    </div>
  );
};

export default UsersPage;
