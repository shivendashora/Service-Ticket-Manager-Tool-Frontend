import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleExclamation } from '@fortawesome/free-solid-svg-icons';
import { ticketsApi } from '../api/client';
import { STATUSES } from '../utils/format';
import { Modal, Spinner } from './ui';

// Edits an existing ticket by PATCHing only the changed fields (new tickets use NewTicketPage)
const TicketFormModal = ({ ticket, onClose, onSaved }) => {
  const [values, setValues] = useState({
    title: ticket.title,
    description: ticket.description,
    estimated_time: ticket.estimated_time ?? '',
    status: ticket.status,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }));

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

    const changes = {};
    if (title !== ticket.title) changes.title = title;
    if (description !== ticket.description) changes.description = description;
    if (estimate !== ticket.estimated_time) changes.estimated_time = estimate;
    if (values.status !== ticket.status) changes.status = values.status;
    if (!Object.keys(changes).length) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      onSaved(await ticketsApi.update(ticket.id, changes));
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Edit ticket"
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
      </form>
    </Modal>
  );
};

export default TicketFormModal;
