import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRotateLeft, faCircleExclamation, faLink, faTrash } from '@fortawesome/free-solid-svg-icons';
import { attachmentUrl, ticketsApi } from '../api/client';
import { STATUSES, formatBytes } from '../utils/format';
import AttachmentPicker, { validateAttachments } from './AttachmentPicker';
import { Modal, Spinner } from './ui';

// Edits an existing ticket: PATCHes changed fields, removes attachments marked for
// removal and uploads new ones, then returns the fresh ticket (new tickets use NewTicketPage)
const TicketFormModal = ({ ticket, onClose, onSaved }) => {
  const [values, setValues] = useState({
    title: ticket.title,
    description: ticket.description,
    estimated_time: ticket.estimated_time ?? '',
    status: ticket.status,
  });
  const [removed, setRemoved] = useState(new Set());
  const [added, setAdded] = useState({ links: [], images: [] });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }));

  const toggleRemoved = (id) =>
    setRemoved((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

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
    const attachmentError = validateAttachments(added);
    if (attachmentError) {
      setError(attachmentError);
      return;
    }

    const changes = {};
    if (title !== ticket.title) changes.title = title;
    if (description !== ticket.description) changes.description = description;
    if (estimate !== ticket.estimated_time) changes.estimated_time = estimate;
    if (values.status !== ticket.status) changes.status = values.status;

    const hasNew = added.links.length > 0 || added.images.length > 0;
    if (!Object.keys(changes).length && !removed.size && !hasNew) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      if (Object.keys(changes).length) await ticketsApi.update(ticket.id, changes);
      for (const id of removed) {
        // 404 means it was already removed by an earlier, partly failed save
        await ticketsApi.removeAttachment(ticket.id, id).catch((err) => {
          if (err.status !== 404) throw err;
        });
      }
      if (hasNew) await ticketsApi.addAttachments(ticket.id, added);
      onSaved(await ticketsApi.get(ticket.id));
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const existing = ticket.attachments;

  return (
    <Modal
      title="Edit ticket"
      subtitle="Update the details, status and attachments."
      onClose={saving ? () => {} : onClose}
      size="lg"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="ticket-form" className="btn btn-primary" disabled={saving}>
            {saving && <Spinner size="sm" />}
            Save changes
          </button>
        </>
      }
    >
      <form id="ticket-form" className="form-stack" onSubmit={handleSubmit}>
        {error && (
          <div className="alert alert-error">
            <FontAwesomeIcon icon={faCircleExclamation} />
            {error}
          </div>
        )}

        <div className="field">
          <label htmlFor="t-title">Title</label>
          <input id="t-title" className="input" value={values.title} onChange={set('title')} required />
        </div>

        <div className="field">
          <label htmlFor="t-desc">Description</label>
          <textarea
            id="t-desc"
            className="input"
            rows={6}
            value={values.description}
            onChange={set('description')}
            required
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="t-est">
              Estimated time <span className="muted">(hours)</span>
            </label>
            <input
              id="t-est"
              className="input"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={values.estimated_time}
              onChange={set('estimated_time')}
            />
          </div>
          <div className="field">
            <label htmlFor="t-status">Status</label>
            <select id="t-status" className="input" value={values.status} onChange={set('status')}>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label>Current attachments</label>
          {existing.length === 0 ? (
            <p className="muted small">This ticket has no images or links yet.</p>
          ) : (
            <ul className="edit-attachments">
              {existing.map((a) => {
                const isRemoved = removed.has(a.id);
                return (
                  <li key={a.id} className={isRemoved ? 'is-removed' : ''}>
                    {a.type === 'image' ? (
                      <img src={attachmentUrl(a)} alt="" className="edit-attachment-thumb" />
                    ) : (
                      <span className="edit-attachment-thumb is-link">
                        <FontAwesomeIcon icon={faLink} />
                      </span>
                    )}
                    <span className="edit-attachment-text">
                      <span className="truncate">{a.type === 'image' ? a.file_name : a.url}</span>
                      <span className="muted small">
                        {isRemoved ? 'Will be removed when you save' : a.type === 'image' ? formatBytes(a.size) : 'Link'}
                      </span>
                    </span>
                    <button
                      type="button"
                      className={`btn btn-sm ${isRemoved ? 'btn-secondary' : 'btn-danger-ghost'}`}
                      onClick={() => toggleRemoved(a.id)}
                    >
                      <FontAwesomeIcon icon={isRemoved ? faArrowRotateLeft : faTrash} />
                      <span className="hide-sm">{isRemoved ? 'Undo' : 'Remove'}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="field">
          <label>Add images or links</label>
          <AttachmentPicker links={added.links} images={added.images} onChange={setAdded} onError={setError} />
        </div>
      </form>
    </Modal>
  );
};

export default TicketFormModal;
