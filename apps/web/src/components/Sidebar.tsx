import React from 'react';
import { Code2, Columns, Wrench, FlaskConical, History, Cpu } from 'lucide-react';

export type ActiveTab = 'workbench' | 'results' | 'repair' | 'benchmarks' | 'history' | 'registry';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  hasActiveJob: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, hasActiveJob }) => {
  const navItems = [
    { id: 'workbench', label: 'Workbench', icon: Code2, desc: 'Submit & Compare' },
    { id: 'results', label: 'Results & Diff', icon: Columns, desc: 'Side-by-side candidates', highlight: hasActiveJob },
    { id: 'repair', label: 'Repair Lab', icon: Wrench, desc: 'Feedback loops' },
    { id: 'benchmarks', label: 'Benchmark Lab', icon: FlaskConical, desc: 'Held-out suites' },
    { id: 'history', label: 'History', icon: History, desc: 'Run archive' },
    { id: 'registry', label: 'Models & Health', icon: Cpu, desc: 'Registry inspect' },
  ];

  return (
    <aside className="w-56 border-r border-border-subtle bg-surface-base flex flex-col justify-between py-2 select-none">
      <div className="space-y-1 px-2">
        <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-text-tertiary">
          Research Modules
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id as ActiveTab)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs text-left transition-colors relative ${
                isActive
                  ? 'bg-surface-elevated text-text-primary font-medium border border-border-strong'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated/50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-accent-primary' : 'text-text-tertiary'}`} />
              <div className="flex-1 truncate">
                <div>{item.label}</div>
                <div className="text-[10px] text-text-tertiary truncate">{item.desc}</div>
              </div>
              {item.highlight && !isActive && (
                <span className="w-2 h-2 rounded-full bg-accent-primary animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      <div className="px-4 py-2 border-t border-border-subtle text-[11px] font-mono text-text-tertiary">
        Python 3.11 ↔ Java 17
        <div className="text-[10px] text-slate-500">Dual-Direction Verified</div>
      </div>
    </aside>
  );
};

