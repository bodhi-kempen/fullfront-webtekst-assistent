type Status = 'interview' | 'strategy' | 'generating' | 'review' | 'completed';

const LABELS: Record<Status, string> = {
  interview: 'Interview loopt',
  strategy: 'Klaar voor strategie',
  generating: 'Teksten genereren',
  review: 'Review & bewerken',
  completed: 'Voltooid',
};

const CLASSES: Record<Status, string> = {
  interview: 'badge-status-blue',
  strategy: 'badge-status-orange',
  generating: 'badge-status-yellow badge--pulse',
  review: 'badge-status-green',
  completed: 'badge-status-gray',
};

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`badge ${CLASSES[status]}`}>{LABELS[status]}</span>;
}
