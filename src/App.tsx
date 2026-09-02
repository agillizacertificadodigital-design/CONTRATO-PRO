import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { AIAssistantModal } from './components/AIAssistantModal';

import { DashboardPage } from './pages/DashboardPage';
import { ContratantesPage } from './pages/ContratantesPage';
import { ContratadosPage } from './pages/ContratadosPage';
import { ModelosPage } from './pages/ModelosPage';
import { GerarContratoWizardPage } from './pages/GerarContratoWizardPage';
import { ContratosPage } from './pages/ContratosPage';
import { AditivosPage } from './pages/AditivosPage';
import { AlertasPage } from './pages/AlertasPage';
import { ConfiguracoesPage } from './pages/ConfiguracoesPage';
import { LoginPage } from './pages/LoginPage';

import { getAlertas } from './services/alertasService';
import { AlertaVencimento } from './types';
import { Sparkles, Loader2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const { currentUser, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState<boolean>(false);
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [alertCount, setAlertCount] = useState<number>(0);

  // Global AI Modal State
  const [aiModalOpen, setAiModalOpen] = useState<boolean>(false);
  const [aiModalMode, setAiModalMode] = useState<'improve' | 'suggest' | 'review'>('suggest');

  useEffect(() => {
    if (currentUser) {
      getAlertas().then(alts => {
        setAlertCount(alts.length);
      });
    }
  }, [currentUser, currentPage]);

  // Keyboard shortcut Ctrl+K / Cmd+K for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavigate = (page: string, id?: string) => {
    setCurrentPage(page);
    setSelectedId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="h-screen w-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-700 dark:text-slate-300 font-mono transition-colors duration-200">
        <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-500 animate-spin mb-3" />
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          Carregando DOCFY PRO...
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  return (
    <div className="h-screen w-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans flex flex-col overflow-hidden transition-colors duration-200">
      {/* Top Header Bar */}
      <Header
        onOpenSearch={() => setSearchOpen(true)}
        onToggleSidebarMobile={() => setSidebarMobileOpen(!sidebarMobileOpen)}
        alertCount={alertCount}
        onNavigateAlerts={() => handleNavigate('alertas')}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          currentPage={currentPage}
          onNavigate={handleNavigate}
          isOpenMobile={sidebarMobileOpen}
          onCloseMobile={() => setSidebarMobileOpen(false)}
          alertCount={alertCount}
        />

        {/* Page Container */}
        <main className="flex-1 overflow-y-auto bg-slate-100/70 dark:bg-slate-950 p-4 lg:p-6 transition-colors duration-200">
          <div className="max-w-7xl mx-auto space-y-6">
            {currentPage === 'dashboard' && <DashboardPage onNavigate={handleNavigate} />}
            {currentPage === 'contratantes' && <ContratantesPage onNavigate={handleNavigate} />}
            {currentPage === 'contratados' && <ContratadosPage onNavigate={handleNavigate} />}
            {currentPage === 'modelos' && <ModelosPage onNavigate={handleNavigate} />}
            {currentPage === 'gerar-contrato' && <GerarContratoWizardPage onNavigate={handleNavigate} />}
            {currentPage === 'contratos' && <ContratosPage onNavigate={handleNavigate} selectedContratoId={selectedId} />}
            {currentPage === 'aditivos' && <AditivosPage onNavigate={handleNavigate} />}
            {currentPage === 'alertas' && <AlertasPage onNavigate={handleNavigate} />}
            {currentPage === 'configuracoes' && <ConfiguracoesPage />}
          </div>
        </main>
      </div>

      {/* Floating AI Assistant Trigger */}
      <button
        onClick={() => {
          setAiModalMode('suggest');
          setAiModalOpen(true);
        }}
        className="fixed bottom-6 right-6 z-40 px-4 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-bold rounded-2xl shadow-2xl shadow-indigo-900/40 border border-white/20 flex items-center gap-2.5 transition-all hover:scale-105 group backdrop-blur-md"
        title="Assistente de Inteligência Artificial Gemini"
      >
        <div className="p-1 rounded-lg bg-white/20 group-hover:rotate-12 transition-transform">
          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
        </div>
        <span className="tracking-wide font-semibold">Assistente IA</span>
      </button>

      {/* Global Modals */}
      <GlobalSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={handleNavigate}
      />

      <AIAssistantModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        mode={aiModalMode}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
}

