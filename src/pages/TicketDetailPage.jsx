import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faCloudArrowUp,
  faImage,
  faLink,
  faPaperclip,
  faPen,
  faPlus,
  faTrash,
  faUserPlus,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { ticketsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useUsers } from '../hooks/useUsers';
import AssignModal from '../components/AssignModal';
import AttachmentGallery from '../components/AttachmentGallery';
import AttachmentPicker, { validateAttachments } from '../components/AttachmentPicker';
import TicketFormModal from '../components/TicketFormModal';
import { Avatar, ConfirmDialog, EmptyState, Modal, Spinner, StatusBadge } from '../components/ui';
import {
  STATUSES,
  formatDateTime,
  formatHours,
  ticketCode,
  timeAgo,
} from '../utils/format';

const AddAttachmentsModal = ({ ticketId, onClose, onSaved }) => {
  const [value, setValue] = useState({ links: [], images: [] });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const problem =
      !value.links.length && !value.images.length ? 'Add at least one image or link.' : validateAttachments(value);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    try {
      onSaved(await ticketsApi.addAttachments(ticketId, value));
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Add attachments"
      onClose={saving ? () => {} : onClose}
      size="lg"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving && <Spinner size="sm" />}
            Upload
          </button>
        </>
      }
    >
      {error && <div className="alert alert-error">{error}</div>}
      <AttachmentPicker links={value.links} images={value.images} onChange={setValue} onError={setError} />
    </Modal>
  );
};

const TicketDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const { users, nameOf } = useUsers();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [statusSaving, setStatusSaving] = useState(null);
  const [dialog, setDialog] = useState(null);

  const load = useCallback(async () => {
    try {
      setTicket(await ticketsApi.get(id));
      setNotFound(false);
    } catch (err) {
      if (err.status === 404 || err.status === 422) setNotFound(true);
      else toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="page">
        <div className="panel panel-center">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (notFound || !ticket) {
    return (
      <div className="page">
        <div className="panel">
          <EmptyState
            icon={faPaperclip}
            title="Ticket not found"
            action={
              <Link to="/tickets" className="btn btn-secondary">
                <FontAwesomeIcon icon={faArrowLeft} /> Back to tickets
              </Link>
            }
          >
            It may have been deleted, or it isn’t assigned to you.
          </EmptyState>
        </div>
      </div>
    );
  }

  const changeStatus = async (status) => {
    if (status === ticket.status) return;
    setStatusSaving(status);
    try {
      setTicket(await ticketsApi.update(ticket.id, { status }));
      toast.success(`Status changed to ${STATUSES.find((s) => s.value === status).label}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setStatusSaving(null);
    }
  };

  const withToast = (fn, success) => async () => {
    try {
      await fn();
      toast.success(success);
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  const images = ticket.attachments.filter((a) => a.type === 'image');
  const links = ticket.attachments.filter((a) => a.type === 'link');

  return (
    <div className="page">
      <Link to="/tickets" className="back-link">
        <FontAwesomeIcon icon={faArrowLeft} />
        Back to tickets
      </Link>

      <header className="page-header detail-header">
        <div>
          <div className="detail-meta">
            <span className="ticket-code">{ticketCode(ticket.id)}</span>
            <StatusBadge status={ticket.status} />
            <span className="muted small">Updated {timeAgo(ticket.updated_at)}</span>
          </div>
          <h1>{ticket.title}</h1>
        </div>
        {isAdmin && (
          <div className="header-actions">
            <button className="btn btn-secondary" onClick={() => setDialog({ type: 'edit' })}>
              <FontAwesomeIcon icon={faPen} />
              Edit
            </button>
            <button className="btn btn-danger-ghost" onClick={() => setDialog({ type: 'delete' })}>
              <FontAwesomeIcon icon={faTrash} />
              Delete
            </button>
          </div>
        )}
      </header>

      <section className="detail-section detail-section-wide">
        <header className="panel-header">
          <h2>
            Attachments <span className="count-pill">{ticket.attachments.length}</span>
          </h2>
          {isAdmin && (
            <button className="btn btn-secondary btn-sm" onClick={() => setDialog({ type: 'attach' })}>
              <FontAwesomeIcon icon={faPlus} />
              Add
            </button>
          )}
        </header>
        {ticket.attachments.length === 0 ? (
          isAdmin ? (
            <button className="attach-empty" onClick={() => setDialog({ type: 'attach' })}>
              <FontAwesomeIcon icon={faCloudArrowUp} className="dropzone-icon" />
              <strong>Add images or links</strong>
              <span className="muted small">Screenshots and related pages help whoever works on this ticket.</span>
            </button>
          ) : (
            <p className="muted small panel-note">No images or links attached.</p>
          )
        ) : (
          <AttachmentGallery
            attachments={ticket.attachments}
            canRemove={isAdmin}
            onRemove={(attachment) => setDialog({ type: 'remove-attachment', attachment })}
          />
        )}
      </section>

      <div className="detail-grid">
        <div className="detail-main">
          <section className="detail-section">
            <header className="panel-header">
              <h2>Status</h2>
            </header>
            <div className="status-stepper" role="radiogroup" aria-label="Ticket status">
              {STATUSES.map((s) => (
                <button
                  key={s.value}
                  role="radio"
                  aria-checked={ticket.status === s.value}
                  className={`step status-${s.value} ${ticket.status === s.value ? 'is-active' : ''}`}
                  onClick={() => changeStatus(s.value)}
                  disabled={statusSaving !== null}
                >
                  {statusSaving === s.value ? <Spinner size="sm" /> : <span className="badge-dot" />}
                  {s.label}
                </button>
              ))}
            </div>
          </section>

          <section className="detail-section">
            <header className="panel-header">
              <h2>Description</h2>
            </header>
            <p className="description">{ticket.description}</p>
          </section>
        </div>

        <aside className="detail-sidebar">
          <section className="detail-section">
            <header className="panel-header">
              <h2>Details</h2>
            </header>
            <dl className="details">
              <dt>Estimate</dt>
              <dd>{formatHours(ticket.estimated_time)}</dd>
              <dt>Created by</dt>
              <dd>{nameOf(ticket.created_by)}</dd>
              <dt>Created</dt>
              <dd>{formatDateTime(ticket.created_at)}</dd>
              <dt>Last updated</dt>
              <dd>{formatDateTime(ticket.updated_at)}</dd>
              <dt>Attachments</dt>
              <dd>
                <FontAwesomeIcon icon={faImage} className="muted" /> {images.length}
                <span className="muted"> · </span>
                <FontAwesomeIcon icon={faLink} className="muted" /> {links.length}
              </dd>
            </dl>
          </section>

          <section className="detail-section">
            <header className="panel-header">
              <h2>Assignees</h2>
              {isAdmin && (
                <button className="btn btn-secondary btn-sm" onClick={() => setDialog({ type: 'assign' })}>
                  <FontAwesomeIcon icon={faUserPlus} />
                  Assign
                </button>
              )}
            </header>
            {ticket.assignees.length === 0 ? (
              <p className="muted small panel-note">Nobody is working on this ticket yet.</p>
            ) : (
              <ul className="people-list">
                {ticket.assignees.map((a) => (
                  <li key={a.id}>
                    <Avatar id={a.id} name={a.name} />
                    <div className="people-text">
                      <strong className="truncate">{a.name}</strong>
                      <span className="muted small truncate">
                        Assigned {timeAgo(a.assigned_at)}
                        {isAdmin && a.assigned_by ? ` by ${nameOf(a.assigned_by)}` : ''}
                      </span>
                    </div>
                    {isAdmin && (
                      <button
                        className="icon-btn icon-btn-sm"
                        onClick={() => setDialog({ type: 'unassign', user: a })}
                        aria-label={`Unassign ${a.name}`}
                        title="Unassign"
                      >
                        <FontAwesomeIcon icon={faXmark} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      {dialog?.type === 'edit' && (
        <TicketFormModal
          ticket={ticket}
          onClose={() => setDialog(null)}
          onSaved={(updated) => {
            setTicket(updated);
            setDialog(null);
            toast.success('Ticket updated');
          }}
        />
      )}

      {dialog?.type === 'attach' && (
        <AddAttachmentsModal
          ticketId={ticket.id}
          onClose={() => setDialog(null)}
          onSaved={(updated) => {
            setTicket(updated);
            setDialog(null);
            toast.success('Attachments added');
          }}
        />
      )}

      {dialog?.type === 'assign' && (
        <AssignModal
          ticketIds={[ticket.id]}
          users={users}
          alreadyAssigned={ticket.assignees.map((a) => a.id)}
          onClose={() => setDialog(null)}
          onAssigned={(_, user) => {
            setDialog(null);
            toast.success(`Assigned to ${user.name}`);
            load();
          }}
        />
      )}

      {dialog?.type === 'delete' && (
        <ConfirmDialog
          title="Delete this ticket?"
          message={`“${ticket.title}” and its assignments will be removed. This cannot be undone from the app.`}
          confirmLabel="Delete ticket"
          danger
          onClose={() => setDialog(null)}
          onConfirm={withToast(async () => {
            await ticketsApi.remove(ticket.id);
            navigate('/tickets', { replace: true });
          }, 'Ticket deleted')}
        />
      )}

      {dialog?.type === 'unassign' && (
        <ConfirmDialog
          title="Remove assignee?"
          message={`${dialog.user.name} will no longer see this ticket.`}
          confirmLabel="Unassign"
          danger
          onClose={() => setDialog(null)}
          onConfirm={withToast(async () => {
            await ticketsApi.unassign(ticket.id, dialog.user.id);
            setTicket((t) => ({ ...t, assignees: t.assignees.filter((a) => a.id !== dialog.user.id) }));
          }, `${dialog.user.name} unassigned`)}
        />
      )}

      {dialog?.type === 'remove-attachment' && (
        <ConfirmDialog
          title="Remove attachment?"
          message={dialog.attachment.type === 'image' ? dialog.attachment.file_name : dialog.attachment.url}
          confirmLabel="Remove"
          danger
          onClose={() => setDialog(null)}
          onConfirm={withToast(async () => {
            await ticketsApi.removeAttachment(ticket.id, dialog.attachment.id);
            setTicket((t) => ({ ...t, attachments: t.attachments.filter((a) => a.id !== dialog.attachment.id) }));
          }, 'Attachment removed')}
        />
      )}

    </div>
  );
};

export default TicketDetailPage;
