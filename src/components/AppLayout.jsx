import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBars,
  faGauge,
  faHeadset,
  faRightFromBracket,
  faTicket,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import { Avatar, RoleBadge } from './ui';

const AppLayout = () => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => setNavOpen(false), [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const links = [
    { to: '/', label: 'Dashboard', icon: faGauge, end: true },
    { to: '/tickets', label: isAdmin ? 'All tickets' : 'My tickets', icon: faTicket },
    ...(isAdmin ? [{ to: '/users', label: 'Team', icon: faUsers }] : []),
  ];

  return (
    <div className={`app-shell ${navOpen ? 'nav-open' : ''}`}>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <FontAwesomeIcon icon={faHeadset} />
          </span>
          <span className="brand-name">SupportDesk</span>
        </div>

        <nav className="nav">
          <span className="nav-section">Workspace</span>
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className="nav-link">
              <FontAwesomeIcon icon={link.icon} fixedWidth />
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <Avatar id={user.id} name={user.name} />
            <div className="user-chip-text">
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </div>
          </div>
          <div className="sidebar-footer-row">
            <RoleBadge role={user.role} />
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
              <FontAwesomeIcon icon={faRightFromBracket} />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className="nav-scrim" onClick={() => setNavOpen(false)} />

      <div className="main">
        <header className="topbar-mobile">
          <button className="icon-btn" onClick={() => setNavOpen(true)} aria-label="Open menu">
            <FontAwesomeIcon icon={faBars} />
          </button>
          <span className="brand-name">SupportDesk</span>
          <Avatar id={user.id} name={user.name} size="sm" />
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
