import React from 'react';
import { 
  Brain, 
  LayoutDashboard, 
  Database, 
  BarChart3, 
  Settings, 
  User 
} from 'lucide-react';

const NAVIGATION = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'ingestion', label: 'Data Ingestion', icon: Database },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Configuration', icon: Settings },
];

const Sidebar = ({ activeNav, setActiveNav }) => {
  return (
    <aside className="w-20 lg:w-72 glass border-r border-border/50 flex flex-col z-20 transition-all duration-300">
      <div className="p-6 flex items-center gap-4">
        <div className="relative group">
          <div className="absolute inset-0 bg-primary/40 blur-xl rounded-full group-hover:bg-primary/60 transition-all"></div>
          <div className="relative h-12 w-12 bg-gradient-to-br from-primary to-emerald-400 rounded-xl flex items-center justify-center shadow-2xl border border-white/10">
            <Brain className="text-primary-foreground" size={28} />
          </div>
        </div>
        <div className="hidden lg:block">
          <h1 className="font-bold text-xl tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">MedGemma</h1>
          <div className="flex items-center gap-2">
             <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">Edge Native</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-6">
        <div className="px-4 py-2 text-xs font-semibold text-muted-foreground tracking-widest uppercase hidden lg:block">Platform</div>
        {NAVIGATION.map((item) => {
          const Icon = item.icon;
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${
                isActive 
                  ? 'bg-primary/10 text-primary shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-primary/20' 
                  : 'text-muted-foreground hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={22} className={`transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'group-hover:scale-110'}`} />
              <span className="hidden lg:block font-medium">{item.label}</span>
              {isActive && <div className="absolute right-0 w-1 h-8 bg-primary rounded-l-full blur-[2px]"></div>}
            </button>
          );
        })}
      </nav>

      {/* User Profile Card */}
      <div className="p-4 m-4 rounded-2xl bg-gradient-to-br from-white/5 to-white/0 border border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-3">
           <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-accent to-primary p-0.5">
                 <div className="w-full h-full rounded-full bg-card flex items-center justify-center">
                    <User size={20} className="text-white" />
                 </div>
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-card"></div>
           </div>
           <div className="hidden lg:block overflow-hidden">
              <p className="text-sm font-semibold truncate text-white">Dr. Sridhar G.</p>
              <p className="text-xs text-muted-foreground">Chief Medical Officer</p>
           </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
