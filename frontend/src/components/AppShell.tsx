import type { ReactNode } from 'react';
import { isEmbedded } from '../lib/embed';
import { Topbar } from './Topbar';

/** Topbar (60px fixed) + sidebar (220px fixed under topbar) + main content. */
export function AppShell({
  sidebar,
  children,
  flush = false,
}: {
  sidebar: ReactNode;
  children: ReactNode;
  /** When true, removes the main padding so the page can run edge-to-edge
   *  (used by the chat interview screen). */
  flush?: boolean;
}) {
  const embedded = isEmbedded();
  return (
    <>
      {!embedded && <Topbar />}
      {!embedded && <aside className="sidebar">{sidebar}</aside>}
      <main className={`main${flush ? ' main--flush' : ''}`}>{children}</main>
    </>
  );
}

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div className="page-header__row">
        <div>
          <div className="page-title">{title}</div>
          {subtitle && <div className="page-subtitle">{subtitle}</div>}
        </div>
        {right && <div>{right}</div>}
      </div>
    </div>
  );
}
