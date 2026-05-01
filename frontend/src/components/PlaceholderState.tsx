import type { ReactNode } from 'react';

export function PlaceholderState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="placeholder-state">
      <div className="ph-icon">{icon}</div>
      <div className="ph-title">{title}</div>
      {description && <div className="ph-desc">{description}</div>}
      {action}
    </div>
  );
}
