import type { ReactNode } from 'react';

const THEME_BOOTSTRAP = `(function(){try{var s=localStorage.getItem('ticketin-admin-theme');var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <div className="admin-theme min-h-screen bg-surface">
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      {children}
    </div>
  );
}
