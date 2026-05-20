import { useState, useEffect } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Compass, Bookmark, User, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './Settings.css';

export default function SettingsPage() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();

  // Account
  const [username,          setUsername]          = useState('');
  const [usernameStatus,    setUsernameStatus]    = useState(null);
  const [savingUsername,    setSavingUsername]    = useState(false);

  const [currentPassword,   setCurrentPassword]   = useState('');
  const [newPassword,       setNewPassword]       = useState('');
  const [confirmPassword,   setConfirmPassword]   = useState('');
  const [passwordStatus,    setPasswordStatus]    = useState(null);
  const [savingPassword,    setSavingPassword]    = useState(false);

  // Danger zone
  const [resetConfirmOpen,  setResetConfirmOpen]  = useState(false);
  const [resetting,         setResetting]         = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletePassword,    setDeletePassword]    = useState('');
  const [deleteError,       setDeleteError]       = useState('');
  const [deleting,          setDeleting]          = useState(false);

  useEffect(() => {
    if (!user) return;
    setUsername(user.username || '');
  }, [user]);

  if (!user) return <Navigate to="/login" replace />;

  const displayName = user.username || user.email.split('@')[0];

  async function handleSaveUsername() {
    if (!username.trim()) return;
    setSavingUsername(true);
    setUsernameStatus(null);
    try {
      await api.patch('/auth/me', { username: username.trim() });
      await refreshUser();
      setUsernameStatus({ type: 'success', message: 'Username updated' });
    } catch (err) {
      setUsernameStatus({ type: 'error', message: err.response?.data?.error || 'Failed to update username' });
    } finally {
      setSavingUsername(false);
    }
  }

  async function handleChangePassword() {
    setPasswordStatus(null);
    if (!currentPassword || !newPassword || !confirmPassword) {
      return setPasswordStatus({ type: 'error', message: 'All password fields are required' });
    }
    if (newPassword !== confirmPassword) {
      return setPasswordStatus({ type: 'error', message: 'New passwords do not match' });
    }
    if (newPassword.length < 6) {
      return setPasswordStatus({ type: 'error', message: 'New password must be at least 6 characters' });
    }
    setSavingPassword(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      setPasswordStatus({ type: 'success', message: 'Password updated successfully' });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) {
      setPasswordStatus({ type: 'error', message: err.response?.data?.error || 'Failed to change password' });
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleResetProfile() {
    setResetting(true);
    try {
      await api.delete('/interactions/my');
      setResetConfirmOpen(false);
    } catch {}
    finally { setResetting(false); }
  }

  async function handleDeleteAccount() {
    setDeleteError('');
    if (!deletePassword) {
      return setDeleteError('Please enter your password');
    }
    setDeleting(true);
    try {
      await api.delete('/auth/me', { data: { password: deletePassword } });
      await logout();
      navigate('/');
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Failed to delete account');
      setDeleting(false);
    }
  }

  return (
    <div className="st-layout">

      <aside className="st-sidebar">
        <div className="st-sidebar-logo">Urban <span>Explorer</span></div>
        <nav className="st-sidebar-nav">
          <Link to="/discover"  className="st-sidebar-item"><Compass  size={18} /><span>Discover</span></Link>
          <Link to="/saved"     className="st-sidebar-item"><Bookmark size={18} /><span>Saved</span></Link>
          <Link to="/profile"   className="st-sidebar-item"><User     size={18} /><span>Profile</span></Link>
          <Link to="/settings"  className="st-sidebar-item active"><Settings size={18} /><span>Settings</span></Link>
        </nav>
        <div className="st-sidebar-user">
          <div className="st-sidebar-avatar">{displayName[0].toUpperCase()}</div>
          <div className="st-sidebar-user-info">
            <div className="st-sidebar-user-name">{displayName}</div>
            <div className="st-sidebar-user-sub">{user.email}</div>
          </div>
        </div>
      </aside>

      <div className="st-page">
        <h1 className="st-page-title">Settings</h1>

        {/* ── ACCOUNT ── */}
        <section className="st-section">
          <h2 className="st-section-title">Account</h2>

          <div className="st-field">
            <label className="st-label">Username</label>
            <div className="st-input-row">
              <input
                className="st-input"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Your display name"
                maxLength={50}
              />
              <button className="st-btn" onClick={handleSaveUsername} disabled={savingUsername}>
                {savingUsername ? 'Saving…' : 'Save'}
              </button>
            </div>
            {usernameStatus && (
              <p className={`st-status st-status--${usernameStatus.type}`}>{usernameStatus.message}</p>
            )}
          </div>

          <div className="st-divider" />

          <div className="st-field">
            <label className="st-label">Change Password</label>
            <input
              className="st-input st-input--spaced"
              type="password"
              placeholder="Current password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
            />
            <input
              className="st-input st-input--spaced"
              type="password"
              placeholder="New password (min 6 characters)"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
            <input
              className="st-input st-input--spaced"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
            <button className="st-btn st-btn--mt" onClick={handleChangePassword} disabled={savingPassword}>
              {savingPassword ? 'Updating…' : 'Update Password'}
            </button>
            {passwordStatus && (
              <p className={`st-status st-status--${passwordStatus.type}`}>{passwordStatus.message}</p>
            )}
          </div>
        </section>

        {/* ── DANGER ZONE ── */}
        <section className="st-section st-section--danger">
          <h2 className="st-section-title st-section-title--danger">Danger Zone</h2>

          <div className="st-danger-item">
            <div className="st-danger-text">
              <p className="st-danger-name">Reset taste profile</p>
              <p className="st-danger-desc">Clears all your ratings, saved places, and visits. Your recommendations will start over from scratch.</p>
            </div>
            <button className="st-danger-btn" onClick={() => setResetConfirmOpen(true)}>Reset</button>
          </div>

          <div className="st-danger-item">
            <div className="st-danger-text">
              <p className="st-danger-name">Delete account</p>
              <p className="st-danger-desc">Permanently deletes your account and all data. This cannot be undone.</p>
            </div>
            <button className="st-danger-btn" onClick={() => setDeleteConfirmOpen(true)}>Delete account</button>
          </div>
        </section>
      </div>

      {/* ── RESET CONFIRM MODAL ── */}
      {resetConfirmOpen && (
        <div className="st-modal-backdrop" onClick={() => setResetConfirmOpen(false)}>
          <div className="st-modal" onClick={e => e.stopPropagation()}>
            <h3 className="st-modal-title">Reset taste profile?</h3>
            <p className="st-modal-text">
              This will delete all your ratings, saved places, and visited records.
              Your recommendations will start fresh. This cannot be undone.
            </p>
            <div className="st-modal-actions">
              <button className="st-modal-cancel" onClick={() => setResetConfirmOpen(false)}>Cancel</button>
              <button className="st-modal-confirm" onClick={handleResetProfile} disabled={resetting}>
                {resetting ? 'Resetting…' : 'Reset profile'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM MODAL ── */}
      {deleteConfirmOpen && (
        <div className="st-modal-backdrop" onClick={() => { setDeleteConfirmOpen(false); setDeletePassword(''); setDeleteError(''); }}>
          <div className="st-modal" onClick={e => e.stopPropagation()}>
            <h3 className="st-modal-title">Delete your account?</h3>
            <p className="st-modal-text">
              This will permanently delete your account and everything associated with it.
              Enter your password to confirm.
            </p>
            <input
              className="st-input st-input--spaced"
              type="password"
              placeholder="Your password"
              value={deletePassword}
              onChange={e => setDeletePassword(e.target.value)}
            />
            {deleteError && <p className="st-modal-error">{deleteError}</p>}
            <div className="st-modal-actions">
              <button
                className="st-modal-cancel"
                onClick={() => { setDeleteConfirmOpen(false); setDeletePassword(''); setDeleteError(''); }}
              >
                Cancel
              </button>
              <button className="st-modal-confirm" onClick={handleDeleteAccount} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete my account'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
