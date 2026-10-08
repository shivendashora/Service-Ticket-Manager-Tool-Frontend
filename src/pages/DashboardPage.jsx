import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRight,
  faBolt,
  faChartPie,
  faCircleCheck,
  faInbox,
  faLayerGroup,
  faListUl,
  faPlus,
  faUserCheck,
  faUserSlash,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { ticketsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AgentNotice, Avatar, AvatarStack, EmptyState, Spinner, StatusBadge } from '../components/ui';
import { STATUSES, formatDate, parseDate, ticketCode, timeAgo } from '../utils/format';

const STATUS_TONE = { open: 'blue', in_progress: 'amber', resolved: 'green', closed: 'slate' };
const ACTIVE = ['open', 'in_progress'];
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

const KpiCard = ({ icon, tone, label, value, hint, to }) => (
  <Link to={to} className={`kpi-card tone-${tone}`}>
    <div className="kpi-top">
      <span className="kpi-label">{label}</span>
      <span className="kpi-icon">
        <FontAwesomeIcon icon={icon} />
      </span>
    </div>
    <span className="kpi-value">{value}</span>
    <span className="kpi-hint">{hint}</span>
  </Link>
);

const SectionTitle = ({ children, action }) => (
  <div className="section-title">
    <h2>{children}</h2>
    {action}
  </div>
);

const DashboardPage = () => {
  const { user, isAdmin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setTickets(await ticketsApi.list());
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const counts = Object.fromEntries(STATUSES.map((s) => [s.value, 0]));
    const workload = new Map();
    const weekAgo = Date.now() - WEEK_MS;
    let thisWeek = 0;

    tickets.forEach((t) => {
      counts[t.status] = (counts[t.status] ?? 0) + 1;
      if ((parseDate(t.created_at)?.getTime() ?? 0) >= weekAgo) thisWeek += 1;
      if (ACTIVE.includes(t.status)) {
        t.assignees.forEach((a) => {
          const entry = workload.get(a.id) ?? { ...a, open: 0, in_progress: 0 };
          entry[t.status] += 1;
          workload.set(a.id, entry);
        });
      }
    });

    const total = tickets.length;
    const active = counts.open + counts.in_progress;
    const done = counts.resolved + counts.closed;

    return {
      counts,
      total,
      active,
      done,
      thisWeek,
      resolution: total ? Math.round((done / total) * 100) : 0,
      unassigned: tickets.filter((t) => !t.assignees.length && ACTIVE.includes(t.status)),
      workload: [...workload.values()].sort((a, b) => b.open + b.in_progress - (a.open + a.in_progress)),
      // Oldest active work first, so agents see what has waited longest
      queue: tickets
        .filter((t) => ACTIVE.includes(t.status))
        .sort((a, b) => (parseDate(a.created_at) ?? 0) - (parseDate(b.created_at) ?? 0)),
    };
  }, [tickets]);

  const maxLoad = Math.max(1, ...stats.workload.map((w) => w.open + w.in_progress));
  const recent = tickets.slice(0, 8);
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">{today}</p>
          <h1>
            {greeting()}, {user.name.split(' ')[0]}
          </h1>
          <p className="muted">
            {isAdmin ? 'Here is how the support queue looks right now.' : 'Here is the work assigned to you.'}
          </p>
        </div>
        <div className="header-actions">
          <Link to="/tickets" className="btn btn-secondary">
            <FontAwesomeIcon icon={faListUl} />
            View tickets
          </Link>
          {isAdmin && (
            <Link to="/tickets/new" className="btn btn-primary">
              <FontAwesomeIcon icon={faPlus} />
              New ticket
            </Link>
          )}
        </div>
      </header>

      {!isAdmin && <AgentNotice />}

      {loading ? (
        <div className="panel panel-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {/* ---------- KPIs ---------- */}
          <section aria-labelledby="overview-title">
            <SectionTitle>
              <span id="overview-title">Overview</span>
            </SectionTitle>
            <div className="kpi-grid">
              <KpiCard
                icon={faLayerGroup}
                tone="violet"
                label={isAdmin ? 'Total tickets' : 'Assigned to you'}
                value={stats.total}
                hint={`${stats.thisWeek} created in the last 7 days`}
                to="/tickets"
              />
              <KpiCard
                icon={faBolt}
                tone="amber"
                label="Active"
                value={stats.active}
                hint={`${stats.counts.open} open · ${stats.counts.in_progress} in progress`}
                to="/tickets?status=open"
              />
              {isAdmin ? (
                <KpiCard
                  icon={faUserSlash}
                  tone="red"
                  label="Unassigned"
                  value={stats.unassigned.length}
                  hint={stats.unassigned.length ? 'Active tickets with no owner' : 'Every active ticket has an owner'}
                  to="/tickets"
                />
              ) : (
                <KpiCard
                  icon={faUserCheck}
                  tone="blue"
                  label="In progress"
                  value={stats.counts.in_progress}
                  hint="Tickets you are working on"
                  to="/tickets?status=in_progress"
                />
              )}
              <KpiCard
                icon={faCircleCheck}
                tone="green"
                label="Resolution rate"
                value={`${stats.resolution}%`}
                hint={`${stats.counts.resolved} resolved · ${stats.counts.closed} closed`}
                to="/tickets?status=resolved"
              />
            </div>
          </section>

          {/* ---------- Analysis ---------- */}
          <section aria-labelledby="insights-title">
            <SectionTitle>
              <span id="insights-title">Insights</span>
            </SectionTitle>
            <div className={`insight-grid ${isAdmin ? 'cols-3' : 'cols-2'}`}>
              <div className="panel">
                <header className="panel-header">
                  <h3 className="panel-title">
                    <FontAwesomeIcon icon={faChartPie} className="muted" />
                    Status breakdown
                  </h3>
                </header>
                <ul className="bar-list">
                  {STATUSES.map((s) => {
                    const count = stats.counts[s.value];
                    const pct = stats.total ? Math.round((count / stats.total) * 100) : 0;
                    return (
                      <li key={s.value}>
                        <Link to={`/tickets?status=${s.value}`} className={`bar-row tone-${STATUS_TONE[s.value]}`}>
                          <span className="bar-label">
                            <span className="legend-dot" />
                            {s.label}
                          </span>
                          <span className="bar-value">
                            {count} <span className="muted">({pct}%)</span>
                          </span>
                          <span className="bar-track">
                            <span className="bar-fill" style={{ width: `${pct}%` }} />
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {isAdmin ? (
                <div className="panel">
                  <header className="panel-header">
                    <h3 className="panel-title">
                      <FontAwesomeIcon icon={faUsers} className="muted" />
                      Team workload
                    </h3>
                    <span className="muted small">Active tickets</span>
                  </header>
                  {stats.workload.length === 0 ? (
                    <p className="muted small panel-note">No one has active tickets assigned yet.</p>
                  ) : (
                    <ul className="workload-list">
                      {stats.workload.slice(0, 6).map((w) => {
                        const n = w.open + w.in_progress;
                        return (
                          <li key={w.id}>
                            <Avatar id={w.id} name={w.name} size="sm" />
                            <div className="workload-main">
                              <div className="workload-head">
                                <span className="truncate">{w.name}</span>
                                <strong>{n}</strong>
                              </div>
                              <span className="bar-track stacked" title={`${w.open} open, ${w.in_progress} in progress`}>
                                <span className="bar-fill tone-blue" style={{ width: `${(w.open / maxLoad) * 100}%` }} />
                                <span
                                  className="bar-fill tone-amber"
                                  style={{ width: `${(w.in_progress / maxLoad) * 100}%` }}
                                />
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ) : null}

              <div className="panel">
                <header className="panel-header">
                  <h3 className="panel-title">
                    <FontAwesomeIcon icon={isAdmin ? faUserSlash : faBolt} className="muted" />
                    {isAdmin ? 'Needs an owner' : 'Up next'}
                  </h3>
                  <span className="count-pill">{isAdmin ? stats.unassigned.length : stats.queue.length}</span>
                </header>
                {(isAdmin ? stats.unassigned : stats.queue).length === 0 ? (
                  <p className="muted small panel-note">
                    {isAdmin ? 'Every active ticket has someone on it. 🎉' : 'You have no active tickets right now.'}
                  </p>
                ) : (
                  <ul className="mini-list">
                    {(isAdmin ? stats.unassigned : stats.queue).slice(0, 5).map((t) => (
                      <li key={t.id}>
                        <Link to={`/tickets/${t.id}`}>
                          <span className="ticket-code">{ticketCode(t.id)}</span>
                          <span className="truncate">{t.title}</span>
                          <span className="muted small nowrap">{timeAgo(t.created_at)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          {/* ---------- Recent ---------- */}
          <section aria-labelledby="recent-title">
            <SectionTitle
              action={
                <Link to="/tickets" className="link-text">
                  View all <FontAwesomeIcon icon={faArrowRight} />
                </Link>
              }
            >
              <span id="recent-title">Recent tickets</span>
            </SectionTitle>
            <div className="panel panel-flush">
              {recent.length === 0 ? (
                <EmptyState
                  icon={faInbox}
                  title="No tickets yet"
                  action={
                    isAdmin ? (
                      <Link to="/tickets/new" className="btn btn-primary">
                        <FontAwesomeIcon icon={faPlus} />
                        Create the first ticket
                      </Link>
                    ) : null
                  }
                >
                  {isAdmin ? 'Tickets you create will show up here.' : 'Nothing has been assigned to you yet.'}
                </EmptyState>
              ) : (
                <div className="table-wrap">
                  <table className="table table-cards">
                    <thead>
                      <tr>
                        <th>Ticket</th>
                        <th>Status</th>
                        <th>Assignees</th>
                        <th className="hide-sm">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recent.map((t) => (
                        <tr key={t.id} onClick={() => navigate(`/tickets/${t.id}`)}>
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
                            </div>
                          </td>
                          <td className="cell-status">
                            <StatusBadge status={t.status} />
                          </td>
                          <td className="cell-assignees">
                            <AvatarStack users={t.assignees} />
                          </td>
                          <td className="hide-sm nowrap muted">{formatDate(t.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
