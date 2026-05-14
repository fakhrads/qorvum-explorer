import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout';
import { DashboardPage } from '../pages/Dashboard';
import { ExplorerPage } from '../pages/Explorer';
import { ContractsPage } from '../pages/Contracts';
import { PkiPage } from '../pages/Pki';
import { NodesPage } from '../pages/Nodes';
import { EventsPage, ApiPage } from '../pages/EventsApi';
import { LoginPage } from '../pages/Login';
import { isAuthenticated, clearAuth } from '../lib/config';
import { useTokenRefresh } from '../lib/hooks';
import { WsProvider } from '../lib/ws-context';

type Page = 'dashboard' | 'explorer' | 'contracts' | 'pki' | 'nodes' | 'events' | 'api';

export default function Home() {
  useTokenRefresh();
  const [page, setPage] = useState<Page>('dashboard');
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    setIsAuth(isAuthenticated());
    setAuthChecked(true);
  }, []);

  const handleLoginSuccess = () => {
    setIsAuth(true);
  };

  const handleLogout = () => {
    clearAuth();
    setIsAuth(false);
  };

  if (!authChecked) {
    return <div className="min-h-screen bg-black" />;
  }

  if (!isAuth) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <DashboardPage setPage={(p: string) => setPage(p as Page)} />;
      case 'explorer': return <ExplorerPage />;
      case 'contracts': return <ContractsPage />;
      case 'pki': return <PkiPage />;
      case 'nodes': return <NodesPage />;
      case 'events': return <EventsPage />;
      case 'api': return <ApiPage />;
      default: return <DashboardPage setPage={(p: string) => setPage(p as Page)} />;
    }
  };

  return (
    <WsProvider>
      <Layout page={page} setPage={(p) => setPage(p as Page)} onLogout={handleLogout}>
        {renderPage()}
      </Layout>
    </WsProvider>
  );
}
