import { useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { ticketsApi } from '../api/client';
import { Avatar, EmptyState, Modal, RoleBadge, Spinner } from './ui';

const AssignModal = ({ ticketIds, users, alreadyAssigned = [], onClose, onAssigned }) => {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter(
      (u) => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [users, query]);

  const handleAssign = async () => {
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      const result = await ticketsApi.assign(ticketIds, selected.id);
      onAssigned(result, selected);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const count = ticketIds.length;

  return (
    <Modal
      title="Assign to a teammate"
      subtitle={count === 1 ? 'Choose who should work on this ticket.' : `Assign ${count} selected tickets.`}
      onClose={saving ? () => {} : onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleAssign} disabled={!selected || saving}>
            {saving && <Spinner size="sm" />}
            Assign{selected ? ` to ${selected.name.split(' ')[0]}` : ''}
          </button>
        </>
      }
    >
      {error && <div className="alert alert-error">{error}</div>}
      <div className="input-icon">
        <FontAwesomeIcon icon={faMagnifyingGlass} />
        <input
          className="input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email"
          autoFocus
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No matching people" />
      ) : (
        <ul className="pick-list">
          {filtered.map((u) => {
            const isAssigned = alreadyAssigned.includes(u.id);
            const isSelected = selected?.id === u.id;
            return (
              <li key={u.id}>
                <button
                  type="button"
                  className={`pick-item ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => setSelected(u)}
                  disabled={isAssigned}
                >
                  <Avatar id={u.id} name={u.name} />
                  <span className="pick-text">
                    <strong>{u.name}</strong>
                    <span className="muted small">{u.email}</span>
                  </span>
                  {isAssigned ? (
                    <span className="muted small">Already assigned</span>
                  ) : (
                    <RoleBadge role={u.role} />
                  )}
                  {isSelected && <FontAwesomeIcon icon={faCheck} className="pick-check" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
};

export default AssignModal;
