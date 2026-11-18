import React from 'react';
import { Cpu, FileCode2, Sparkles, FolderOpen, Plus } from 'lucide-react';

interface NavbarProps {
  onNewFile: () => void;
  onOpenSaved: () => void;
  onOpenAI: () => void;
  savedCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onNewFile,
  onOpenSaved,
  onOpenAI,
  savedCount
}) => {
  return (
    <header className="h-12 bg-slate-950 border-b border-slate-800 px-4 flex items-center justify-between select-none">
      {/* Brand Title & Tagline */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400">
            <Cpu className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm tracking-tight text-slate-100 flex items-center gap-1.5">
            <span>C Visual Lab</span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
              IDE
            </span>
          </span>
        </div>
        <div className="hidden md:flex items-center text-[11px] text-slate-500 font-medium border-l border-slate-800 pl-3">
          Write. Execute. Visualize. Understand.
        </div>
      </div>

      {/* Center Quick Actions: New File & My Saved Programs */}
      <div className="flex items-center gap-2">
        <button
          onClick={onNewFile}
          className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
          title="Create a new clean C program"
        >
          <Plus className="w-3.5 h-3.5 text-sky-400" />
          <span>New Program</span>
        </button>

        <button
          onClick={onOpenSaved}
          className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
          title="Open your saved C programs"
        >
          <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
          <span>My Saved Programs</span>
          {savedCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
              {savedCount}
            </span>
          )}
        </button>
      </div>

      {/* Right System Indicator */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800/80">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-[11px]">Clang C11 Ready</span>
        </div>
      </div>
    </header>
  );
};
