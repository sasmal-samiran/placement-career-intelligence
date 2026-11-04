export default function StatCard({ icon, label, value, change, tone = '' }: { icon: string; label: string; value: string; change?: string; tone?: string }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}><i className={`bi ${icon}`} /></div>
      <div className="flex-grow-1"><small>{label}</small><h3>{value}</h3>{change && <span className="positive"><i className="bi bi-arrow-up-right" /> {change}</span>}</div>
    </div>
  );
}