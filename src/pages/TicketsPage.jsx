import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowsRotate,
  faInbox,
  faMagnifyingGlass,
  faPaperclip,
  faPlus,
  faUserPlus,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { ticketsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useUsers } from '../hooks/useUsers';
import AssignModal from '../components/AssignModal';
import { AgentNotice, AvatarStack, EmptyState, Spinner, StatusBadge } from '../components/ui';
import { STATUSES, formatDate, formatHours, ticketCode, timeAgo } from '../utils/format';

const TicketsPage = () => {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { users } = useUsers();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(new Set());
  // Ticket ids being assigned: one row's button, or the bulk selection
  const [assigning, setAssigning] = useState(null);

  const status = searchParams.get('status') || 'all';

  // Fetch everything once and filter locally so tab counts stay accurate
  const load = useCallback(async () => {
    try {
      setTickets(await ticketsApi.list());
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const c = { all: tickets.length };
    STATUSES.forEach((s) => (c[s.value] = 0));
    tickets.forEach((t) => (c[t.status] = (c[t.status] ?? 0) + 1));
    return c;
  }, [tickets]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^#0*/, '');
    return tickets.filter((t) => {
      if (status !== 'all' && t.status !== status) return false;
      if (!q) return true;
      return (
        String(t.id) === q ||
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.assignees.some((a) => a.name.toLowerCase().includes(q))
      );
    });
  }, [tickets, status, query]);

  const setStatus = (value) => {
    setSelected(new Set());
    setSearchParams(value === 'all' ? {} : { status: value });
  };

  const toggle = (id) =>
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const allVisibleSelected = visible.length > 0 && visible.every((t) => selected.has(t.id));
  const toggleAll = () =>
    setSelected(allVisibleSelected ? new Set() : new Set(visible.map((t) => t.id)));

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>{isAdmin ? 'All tickets' : 'My tickets'}</h1>
          <p className="muted">
            {isAdmin ? 'Create, assign and track every support request.' : 'Tickets that have been assigned to you.'}
          </p>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-secondary"
            onClick={() => {
              setRefreshing(true);
              load();
            }}
            disabled={refreshing}
          >
            <FontAwesomeIcon icon={faArrowsRotate} spin={refreshing} />
            Refresh
          </button>
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => navigate('/tickets/new')}>
              <FontAwesomeIcon icon={faPlus} />
              New ticket
            </button>
          )}
        </div>
      </header>

      {!isAdmin && <AgentNotice />}

      <div className="list-section">
        <div className="toolbar">
          <div className="tabs" role="tablist">
            {[{ value: 'all', label: 'All' }, ...STATUSES].map((s) => (
              <button
                key={s.value}
                role="tab"
                aria-selected={status === s.value}
                className={`tab ${status === s.value ? 'is-active' : ''}`}
                onClick={() => setStatus(s.value)}
              >
                {s.label}
                <span className="tab-count">{counts[s.value] ?? 0}</span>
              </button>
            ))}
          </div>
          <div className="input-icon toolbar-search">
            <FontAwesomeIcon icon={faMagnifyingGlass} />
            <input
              className="input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, description, #id or assignee"
            />
          </div>
        </div>

        {isAdmin && selected.size > 0 && (
          <div className="bulk-bar">
            <span>
              <strong>{selected.size}</strong> selected
            </span>
            <button className="btn btn-primary btn-sm" onClick={() => setAssigning([...selected])}>
              <FontAwesomeIcon icon={faUserPlus} />
              Assign
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set())}>
              <FontAwesomeIcon icon={faXmark} />
              Clear
            </button>
          </div>
        )}

        {loading ? (
          <div className="panel-center">
            <Spinner size="lg" />
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={faInbox}
            title={tickets.length ? 'No tickets match your filters' : 'No tickets yet'}
            action={
              isAdmin && !tickets.length ? (
                <button className="btn btn-primary" onClick={() => navigate('/tickets/new')}>
                  <FontAwesomeIcon icon={faPlus} />
                  Create a ticket
                </button>
              ) : null
            }
          >
            {tickets.length
              ? 'Try a different status or search term.'
              : isAdmin
                ? 'Tickets you create will show up here.'
                : 'When an admin assigns you a ticket it will appear here.'}
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table table-cards">
              <thead>
                <tr>
                  {isAdmin && (
                    <th className="col-check">
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleAll}
                        aria-label="Select all"
                      />
                    </th>
                  )}
                  <th>Ticket</th>
                  <th>Status</th>
                  <th>Assignees</th>
                  <th className="hide-md">Estimate</th>
                  <th className="hide-md">Created</th>
                  <th className="hide-sm">Updated</th>
                  {isAdmin && <th className="col-row-action" aria-label="Actions" />}
                </tr>
              </thead>
              <tbody>
                {visible.map((t) => (
                  <tr
                    key={t.id}
                    className={selected.has(t.id) ? 'is-selected' : ''}
                    onClick={() => navigate(`/tickets/${t.id}`)}
                  >
                    {isAdmin && (
                      <td className="col-check" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="checkbox"
                          checked={selected.has(t.id)}
                          onChange={() => toggle(t.id)}
                          aria-label={`Select ticket ${t.id}`}
                        />
                      </td>
                    )}
                    <td className="cell-main">
                      <div className="cell-ticket">
                        <span className="ticket-code">{ticketCode(t.id)}</span>
                        <div className="cell-ticket-text">
                          <Link
                            to={`/tickets/${t.id}`}
                            className="row-link truncate"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {t.title}
                          </Link>
                          <span className="muted small truncate">{t.description}</span>
                        </div>
                        {t.attachments.length > 0 && (
                          <span className="attach-count" title={`${t.attachments.length} attachment(s)`}>
                            <FontAwesomeIcon icon={faPaperclip} />
                            {t.attachments.length}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="cell-status">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="cell-assignees">
                      <AvatarStack users={t.assignees} />
                    </td>
                    <td className="hide-md">{formatHours(t.estimated_time)}</td>
                    <td className="hide-md nowrap">{formatDate(t.created_at)}</td>
                    <td className="hide-sm nowrap muted">{timeAgo(t.updated_at)}</td>
                    {isAdmin && (
                      <td className="col-row-action" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setAssigning([t.id])}
                          title="Assign this ticket"
                        >
                          <FontAwesomeIcon icon={faUserPlus} />
                          <span className="hide-sm">Assign</span>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {assigning && (
        <AssignModal
          ticketIds={assigning}
          users={users}
          alreadyAssigned={
            assigning.length === 1
              ? (tickets.find((t) => t.id === assigning[0])?.assignees ?? []).map((a) => a.id)
              : []
          }
          onClose={() => setAssigning(null)}
          onAssigned={(result, user) => {
            setAssigning(null);
            setSelected(new Set());
            const n = result.assigned.length;
            toast.success(
              n
                ? `Assigned ${n} ticket${n === 1 ? '' : 's'} to ${user.name}`
                : `${user.name} was already assigned to the selected tickets`
            );
            load();
          }}
        />
      )}
    </div>
  );
};

export default TicketsPage;
