import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faCircleExclamation, faUserSlash } from '@fortawesome/free-solid-svg-icons';
import { ticketsApi } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useUsers } from '../hooks/useUsers';
import AttachmentPicker, { validateAttachments } from '../components/AttachmentPicker';
import { Avatar, Spinner } from '../components/ui';
import { ticketCode } from '../utils/format';

const NewTicketPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { users, loading: usersLoading } = useUsers();

  const [values, setValues] = useState({ title: '', description: '', estimated_time: '' });
  const [assigneeId, setAssigneeId] = useState('');
  const [attachments, setAttachments] = useState({ links: [], images: [] });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }));
  const assignee = users.find((u) => String(u.id) === assigneeId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const title = values.title.trim();
    const description = values.description.trim();
    if (!title || !description) {
      setError('Title and description are required.');
      return;
    }
    const estimate = values.estimated_time === '' ? null : Number(values.estimated_time);
    if (estimate !== null && (!Number.isInteger(estimate) || estimate < 0)) {
      setError('Estimated time must be a whole number of hours.');
      return;
    }
    const attachmentError = validateAttachments(attachments);
    if (attachmentError) {
      setError(attachmentError);
      return;
    }

    setSaving(true);
    let ticket;
    try {
      ticket = await ticketsApi.create({ title, description, estimated_time: estimate, ...attachments });
    } catch (err) {
      setError(err.message);
      setSaving(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // The ticket exists now, so an assignment failure shouldn't keep the user on this page
    if (assignee) {
      try {
        await ticketsApi.assign([ticket.id], assignee.id);
      } catch (err) {
        toast.error(`Ticket created, but assigning failed: ${err.message}`);
      }
    }

    toast.success(
      `Ticket ${ticketCode(ticket.id)} created${assignee ? ` and assigned to ${assignee.name}` : ''}`
    );
    navigate(`/tickets/${ticket.id}`, { replace: true });
  };

  return (
    <div className="page">
      <Link to="/tickets" className="back-link">
        <FontAwesomeIcon icon={faArrowLeft} />
        Back to tickets
      </Link>

      <header className="page-header">
        <div>
          <h1>New ticket</h1>
          <p className="muted">Describe the issue, add any screenshots or links, and choose who should handle it.</p>
        </div>
      </header>

      {error && (
        <div className="alert alert-error" role="alert">
          <FontAwesomeIcon icon={faCircleExclamation} />
          {error}
        </div>
      )}

      <form className="form-layout" onSubmit={handleSubmit} noValidate>
        <div className="stack">
          <section className="panel">
            <header className="panel-header">
              <div>
                <h2>Details</h2>
                <p className="muted small">What is the problem?</p>
              </div>
            </header>
            <div className="form-stack">
              <div className="field">
                <label htmlFor="t-title">
                  Title <span className="req">*</span>
                </label>
                <input
                  id="t-title"
                  className="input"
                  value={values.title}
                  onChange={set('title')}
                  placeholder="e.g. Customer cannot reset password"
                  maxLength={200}
                  autoFocus
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="t-desc">
                  Description <span className="req">*</span>
                </label>
                <textarea
                  id="t-desc"
                  className="input"
                  rows={8}
                  value={values.description}
                  onChange={set('description')}
                  placeholder="Steps to reproduce, what the customer expected, and what happened instead."
                  required
                />
              </div>
            </div>
          </section>

          <section className="panel">
            <header className="panel-header">
              <div>
                <h2>Attachments</h2>
                <p className="muted small">Optional screenshots and related links.</p>
              </div>
            </header>
            <AttachmentPicker
              links={attachments.links}
              images={attachments.images}
              onChange={setAttachments}
              onError={setError}
            />
          </section>
        </div>

        <aside className="stack form-aside">
          <section className="panel">
            <header className="panel-header">
              <h2>Assignment</h2>
            </header>
            <div className="form-stack">
              <div className="field">
                <label htmlFor="t-assignee">Assign to</label>
                <select
                  id="t-assignee"
                  className="input"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  disabled={usersLoading}
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="assignee-preview">
                {assignee ? (
                  <>
                    <Avatar id={assignee.id} name={assignee.name} />
                    <div className="people-text">
                      <strong className="truncate">{assignee.name}</strong>
                      <span className="muted small truncate">{assignee.email}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="avatar avatar-empty">
                      <FontAwesomeIcon icon={faUserSlash} />
                    </span>
                    <span className="muted small">No one yet. You can assign it later too.</span>
                  </>
                )}
              </div>

              <div className="field">
                <label htmlFor="t-est">Estimated time (hours)</label>
                <input
                  id="t-est"
                  className="input"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  value={values.estimated_time}
                  onChange={set('estimated_time')}
                  placeholder="e.g. 4"
                />
              </div>
            </div>
          </section>

          <div className="form-actions">
            <Link to="/tickets" className="btn btn-ghost">
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving && <Spinner size="sm" />}
              Create ticket
            </button>
          </div>
        </aside>
      </form>
    </div>
  );
};

export default NewTicketPage;
