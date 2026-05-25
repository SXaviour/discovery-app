import { NavLink } from 'react-router-dom';
import { Compass, Bookmark, User, Settings } from 'lucide-react';
import './BottomNav.css';

const LINKS = [
  { to: '/discover', Icon: Compass,  label: 'Discover'  },
  { to: '/saved',    Icon: Bookmark, label: 'Saved'     },
  { to: '/profile',  Icon: User,     label: 'Profile'   },
  { to: '/settings', Icon: Settings, label: 'Settings'  },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {LINKS.map(({ to, Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
        >
          <Icon size={22} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
