
import React from 'react';
import { ViewState } from '../types';
import { 
  LayoutDashboard, 
  Settings, 
  Code2,
  LayoutGrid,
  PieChart,
  ScrollText,
  CalendarClock,
  TrendingUp
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
}

const NavItem = ({ 
  view, 
  current, 
  icon: Icon, 
  label, 
  onClick 
}: { 
  view: ViewState; 
  current: ViewState; 
  icon: any; 
  label: string; 
  onClick: (v: ViewState) => void 
}) => {
  const isActive = view === current;
  return (
    <button
      onClick={() => onClick(view)}
      className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-200 ${
        isActive 
          ? 'bg-primary/20 text-primary border border-primary/30 shadow-[0_0_15px_rgba(139,92,246,0.15)]' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100 border border-transparent'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium tracking-wide">{label}</span>
    </button>
  );
};

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onChangeView }) => {
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col md:flex-row font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 p-6 border-r border-slate-800 h-screen sticky top-0 bg-[#0f172a]">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="font-bold text-white text-lg">FT</span>
          </div>
          <div>
            <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              FinTrack AI
            </h1>
            <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">V5.0</span>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {/* Desktop uses text labels, so we can keep descriptive icons or match mobile. Matching mobile for consistency but keeping labels. */}
          <NavItem view="DASHBOARD" current={currentView} icon={LayoutGrid} label="總覽儀表板" onClick={onChangeView} />
          <NavItem view="ASSETS" current={currentView} icon={PieChart} label="資產管理" onClick={onChangeView} />
          <NavItem view="TRANSACTIONS" current={currentView} icon={ScrollText} label="收支記帳" onClick={onChangeView} />
          <NavItem view="RECURRING" current={currentView} icon={CalendarClock} label="固定收支" onClick={onChangeView} />
          <NavItem view="INVESTMENTS" current={currentView} icon={TrendingUp} label="股票投資" onClick={onChangeView} />
          <div className="pt-4 mt-4 border-t border-slate-800">
            <NavItem view="HISTORY" current={currentView} icon={Code2} label="系統日誌" onClick={onChangeView} />
          </div>
        </nav>

        <div className="p-4 mt-auto">
           <button onClick={() => onChangeView('SETTINGS')} className="flex items-center justify-center w-full text-slate-400 hover:text-white transition-colors py-2 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600">
             <Settings size={16} className="mr-2"/> <span className="text-sm">系統設定</span>
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header - Optimized: Hidden on Desktop to remove gap */}
        <header className="md:hidden h-16 bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-6 z-20 shrink-0">
          <div className="font-bold text-lg flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center shadow-lg shadow-primary/20">
               <span className="font-bold text-white text-xs">FT</span>
            </div>
            FinTrack AI
          </div>
          
          <div className="ml-auto">
             <button onClick={() => onChangeView('SETTINGS')} className="p-2 text-slate-400 hover:text-white transition-colors">
                <Settings size={24} />
             </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
           {children}
        </div>
      </main>

      {/* Mobile Bottom Nav - Optimized 5-column Grid (Added Investment) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 pb-safe z-50">
        <div className="grid grid-cols-5 h-16">
          <NavItemMobile view="DASHBOARD" current={currentView} icon={LayoutGrid} onClick={onChangeView} />
          <NavItemMobile view="ASSETS" current={currentView} icon={PieChart} onClick={onChangeView} />
          <NavItemMobile view="TRANSACTIONS" current={currentView} icon={ScrollText} onClick={onChangeView} />
          <NavItemMobile view="RECURRING" current={currentView} icon={CalendarClock} onClick={onChangeView} />
          <NavItemMobile view="INVESTMENTS" current={currentView} icon={TrendingUp} onClick={onChangeView} />
        </div>
      </div>
    </div>
  );
};

const NavItemMobile = ({ 
  view, 
  current, 
  icon: Icon, 
  onClick 
}: { 
  view: ViewState; 
  current: ViewState; 
  icon: any; 
  onClick: (v: ViewState) => void 
}) => {
  const isActive = view === current;
  return (
    <button
      onClick={() => onClick(view)}
      className={`flex flex-col items-center justify-center w-full h-full transition-all active:scale-95 ${
        isActive 
          ? 'text-primary' 
          : 'text-slate-500 hover:text-slate-300'
      }`}
    >
      <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-primary/10 shadow-[0_0_10px_rgba(139,92,246,0.2)]' : ''}`}>
         <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
      </div>
    </button>
  );
};
