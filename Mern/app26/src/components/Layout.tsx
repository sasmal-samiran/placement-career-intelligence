import { ReactNode } from 'react';
import Sidebar from '../inc/Sidebar';
import Top from '../inc/Top';
import Footer from '../inc/Footer';

export default function Layout({ children, title, subtitle }: { children: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <Top />
        <main className="page-content">
          <div className="container-fluid px-3 px-lg-4">
            <div className="page-heading">
              <div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
            </div>
            {children}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}