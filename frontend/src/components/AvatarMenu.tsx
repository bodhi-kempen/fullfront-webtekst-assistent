import { useEffect, useRef, useState } from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

function deriveInitials(input: string | null | undefined): string {
  if (!input) return '?';
  const parts = input.split(/[\s@.]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]![0]?.toUpperCase() ?? '?';
  const second = parts.length > 1 ? parts[1]![0]?.toUpperCase() ?? '' : '';
  return (first + second) || '?';
}

export function AvatarMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const initials = deriveInitials(user?.email);
  const shortEmail = user?.email
    ? user.email.length > 28
      ? user.email.slice(0, 26) + '…'
      : user.email
    : '';

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="avatar-menu-wrap" ref={wrapRef}>
      <button
        type="button"
        className="avatar-trigger"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {shortEmail && <span className="topbar-user">{shortEmail}</span>}
        <span className="avatar-circle">{initials}</span>
      </button>
      <div className={`avatar-menu${open ? ' open' : ''}`} role="menu">
        <button
          type="button"
          className="avatar-menu-item"
          role="menuitem"
          onClick={() => {
            setOpen(false);
            void signOut();
          }}
        >
          <LogOut />
          Uitloggen
        </button>
      </div>
    </div>
  );
}
