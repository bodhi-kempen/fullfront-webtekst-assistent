import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function Modal({
  open,
  title,
  icon,
  children,
  footer,
  large = false,
  onClose,
}: {
  open: boolean;
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  large?: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="modal-overlay open"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`modal${large ? ' modal-lg' : ''}`} role="dialog" aria-modal="true">
        <div className="modal-header">
          <div className="modal-title">
            {icon}
            {title}
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Sluiten">
            <X />
          </button>
        </div>
        {children}
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
