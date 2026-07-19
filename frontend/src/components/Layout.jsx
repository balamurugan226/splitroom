import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="page-content" style={{ flex: 1 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
