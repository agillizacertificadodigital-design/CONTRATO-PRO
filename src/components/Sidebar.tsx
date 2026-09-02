import React from 'react';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  LayoutTemplate,
  FilePlus,
  FileText,
  Layers,
  Bell,
  Settings,
  X,
  Sparkles
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: any;
  highlight?: boolean;
  badge?: number;
}

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  alertCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
  alertCount = 0
}) => {
  const mainNav: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'gerar-contrato', label: 'Gerar Contrato', icon: FilePlus, highlight: true },
    { id: 'contratos', label: 'Contratos', icon: FileText },
    { id: 'aditivos', label: 'Aditivos', icon: Layers },
    { id: 'modelos', label: 'Modelos de Contrato', icon: LayoutTemplate },
  ];

  const cadastroNav: NavItem[] = [
    { id: 'contratantes', label: 'Contratantes', icon: Users },
    { id: 'contratados', label: 'Contratados', icon: UserCheck },
  ];

  const systemNav: NavItem[] = [
    { id: 'alertas', label: 'Alertas & Vencimentos', icon: Bell, badge: alertCount },
    { id: 'configuracoes', label: 'Configurações', icon: Settings },
  ];

  const handleSelect = (id: string) => {
    onNavigate(id);
    onCloseMobile();
  };

  const renderNavGroup = (title: string, items: NavItem[]) => (
    <div className="space-y-1">
      <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        {title}
      </div>
      {items.map(item => {
        const Icon = item.icon;
        const isActive = currentPage === item.id;

        return (
          <button
            key={item.id}
            onClick={() => handleSelect(item.id)}
            className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between text-xs font-medium transition-all group ${
              isActive
                ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-900/20'
                : item.highlight
                ? 'bg-blue-50 dark:bg-gradient-to-r dark:from-blue-600/15 dark:to-indigo-600/15 border border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100/70 dark:hover:bg-blue-600/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon className={`w-4 h-4 transition-colors ${
                isActive
                  ? 'text-white'
                  : item.highlight
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200'
              }`} />
              <span>{item.label}</span>
            </div>

            {item.badge && item.badge > 0 ? (
              <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                isActive ? 'bg-white text-blue-700' : 'bg-red-500 text-white'
              }`}>
                {item.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 left-0 bottom-0 z-40 w-64 bg-white/95 dark:bg-slate-900/95 lg:bg-white/80 dark:lg:bg-slate-900/50 border-r border-slate-200 dark:border-slate-800/80 flex flex-col transition-transform duration-200 backdrop-blur-md ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Mobile Header */}
        <div className="p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 lg:hidden">
          <span className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            DOCFY PRO
          </span>
          <button onClick={onCloseMobile} className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
          {renderNavGroup('Gestão Contratual', mainNav)}
          {renderNavGroup('Cadastros & Partes', cadastroNav)}
          {renderNavGroup('Sistema', systemNav)}
        </nav>

        {/* Footer Info */}
        <div className="p-3.5 border-t border-slate-200 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-700 dark:text-slate-300">Docfy v1.2 PRO</span>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span>
              Online
            </span>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Gestão Inteligente de Contratos</p>
        </div>
      </aside>
    </>
  );
};

