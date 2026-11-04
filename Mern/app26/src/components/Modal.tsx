import { ReactNode } from 'react';

export default function Modal({ show, title, onClose, children }: { show: boolean; title: string; onClose: () => void; children: ReactNode }) {
  if (!show) return null;
  return <div className="modal-backdrop-custom" onClick={onClose}>
    <div className="custom-modal" onClick={e => e.stopPropagation()}>
      <div className="modal-head"><h5>{title}</h5><button onClick={onClose}>×</button></div>
      <div className="modal-body">{children}</div>
    </div>
  </div>;
}