import React from 'react';
import { Search, Zap, Clock } from 'lucide-react';

const Header = ({ time, onSearch }) => {
  return (
    <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 backdrop-blur-sm z-10 transition-colors duration-300">
      <div className="flex items-center gap-6">
        <h2 className="text-2xl font-bold text-white tracking-tight">Workspace</h2>
         <div className="h-6 w-px bg-white/10"></div>
         <div className="flex items-center gap-2 text-sm text-muted-foreground bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
            <Clock size={14} className="text-primary" />
            <span className="font-mono">{time}</span>
         </div>
      </div>
      
      <div className="flex items-center gap-4">
         <div className="relative hidden md:block group">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
             <input 
               type="text" 
               placeholder="Search Patient ID..." 
               onChange={(e) => onSearch && onSearch(e.target.value)}
               className="pl-10 pr-4 py-2 bg-black/20 border border-white/10 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent w-64 transition-all"
             />
         </div>
         <button className="p-2 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 transition-colors relative" title="Notifications">
           <Zap size={20} className="text-accent fill-accent/20" />
         </button>
      </div>
    </header>
  );
};

export default Header;
