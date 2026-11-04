export default function EmptyState({ 
   icon = 'bi-inbox', 
   title = 'Nothing here yet', 
   text = 'Add your information to see it here.' 
  }: { icon?: string; title?: string; text?: string }) {
  return 
  <div className="empty-state">
    <i className={`bi ${icon}`} />
    <h5>{title}</h5>
    <p>{text}</p>
    </div>;
}