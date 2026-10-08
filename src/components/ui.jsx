import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleInfo, faXmark } from '@fortawesome/free-solid-svg-icons';
import { initials, statusLabel } from '../utils/format';

export const Spinner = ({ size = 'md' }) => <span className={`spinner spinner-${size}`} aria-label="Loading" />;

export const FullPageSpinner = () => (
  <div className="full-page-center">
    <Spinner size="lg" />
  </div>
);

export const StatusBadge = ({ status }) => (
  <span className={`badge status-${status}`}>
    <span className="badge-dot" />
    {statusLabel(status)}
  </span>
);

export const RoleBadge = ({ role }) => (
  <span className={`badge role-${role}`}>{role === 'admin' ? 'Admin' : 'Agent'}</span>
);

// Stable colour per user so avatars are recognisable across pages
const AVATAR_HUES = [210, 262, 330, 24, 160, 190, 290, 45];

export const Avatar = ({ name, id, size = 'md' }) => (
  <span
    className={`avatar avatar-${size}`}
    style={{ '--avatar-hue': AVATAR_HUES[(id ?? name?.length ?? 0) % AVATAR_HUES.length] }}
    title={name}
  >
    {initials(name)}
  </span>
);

export const AvatarStack = ({ users, max = 3 }) => {
  if (!users?.length) return <span className="muted">Unassigned</span>;
  const shown = users.slice(0, max);
  return (
    <span className="avatar-stack" title={users.map((u) => u.name).join(', ')}>
      {shown.map((u) => (
        <Avatar key={u.id} id={u.id} name={u.name} size="sm" />
      ))}
      {users.length > max && <span className="avatar avatar-sm avatar-more">+{users.length - max}</span>}
    </span>
  );
};

// Agents can't create or assign tickets (backend is admin-only), so say why the buttons are missing
export const AgentNotice = () => (
  <div className="notice">
    <FontAwesomeIcon icon={faCircleInfo} />
    <div>
      <strong>You&rsquo;re signed in as an agent.</strong>
      <span>
        You can view the tickets assigned to you and update their status. Creating and assigning tickets
        requires an admin; ask an admin to change your role on the Team page.
      </span>
    </div>
  </div>
);

export const EmptyState = ({ icon, title, children, action }) => (
  <div className="empty-state">
    {icon && (
      <div className="empty-icon">
        <FontAwesomeIcon icon={icon} />
      </div>
    )}
    <h3>{title}</h3>
    {children && <p>{children}</p>}
    {action}
  </div>
);

export const Modal = ({ title, subtitle, onClose, children, footer, size = 'md' }) => {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal modal-${size}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-header">
          <div>
            <h2>{title}</h2>
            {subtitle && <p className="muted">{subtitle}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-footer">{footer}</footer>}
      </div>
    </div>
  );
};

export const ConfirmDialog = ({ title, message, confirmLabel = 'Confirm', danger, onConfirm, onClose }) => {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={title}
      onClose={busy ? () => {} : onClose}
      size="sm"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={handleConfirm} disabled={busy}>
            {busy && <Spinner size="sm" />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="confirm-message">{message}</p>
    </Modal>
  );
};
