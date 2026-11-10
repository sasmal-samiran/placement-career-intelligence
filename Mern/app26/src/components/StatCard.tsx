export default function StatCard({
  icon,
  label,
  value,
  change,
  tone = '',
  empty = false,
}: {
  icon: string;
  label: string;
  value: string;
  change?: string;
  tone?: string;
  empty?: boolean;
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>
        <i className={`bi ${icon}`} />
      </div>
      <div className="flex-grow-1">
        <small className="d-block text-truncate" title={label}>
          {label}
        </small>
        <h3 className={empty ? 'text-muted fs-5 fw-semibold my-1' : 'my-1'}>
          {value}
        </h3>
        {change && (
          <span className={empty ? 'text-muted small d-inline-block' : 'positive d-inline-block'}>
            {!empty && <i className="bi bi-tag-fill me-1 opacity-75" />}
            {change}
          </span>
        )}
      </div>
    </div>
  );
}
