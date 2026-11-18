import React, { useState } from 'react';
import { Program } from '../types';
import { X, Search, Trash2, Edit2, Plus, FolderOpen } from 'lucide-react';

interface ProgramManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  programs: Program[];
  currentProgramId?: number;
  onSelectProgram: (prog: Program) => void;
  onCreateProgram: (title: string, category: string, description: string) => void;
  onUpdateProgram: (id: number, title: string, category: string) => void;
  onDeleteProgram: (id: number) => void;
}

export const ProgramManagerModal: React.FC<ProgramManagerModalProps> = ({
  isOpen,
  onClose,
  programs,
  currentProgramId,
  onSelectProgram,
  onCreateProgram,
  onUpdateProgram,
  onDeleteProgram
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  if (!isOpen) return null;

  const filtered = programs.filter(p => {
    return p.title.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onCreateProgram(newTitle.trim(), 'custom', newDescription.trim());
    setIsCreating(false);
    setNewTitle('');
    setNewDescription('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-slate-100">My Saved Programs</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & New Button */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/60">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search your saved programs..."
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-450 text-slate-950 font-bold rounded-lg text-xs transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>New Program</span>
          </button>
        </div>

        {/* Create Form Drawer */}
        {isCreating && (
          <form onSubmit={handleCreateSubmit} className="p-4 bg-slate-950 border-b border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
              <span>Save As New Program</span>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="text-slate-500 hover:text-slate-300"
              >
                Cancel
              </button>
            </div>
            <div>
              <input
                type="text"
                placeholder="Program title (e.g. Lab1_LinkedList.c)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-1.5 bg-sky-500 hover:bg-sky-450 text-slate-950 font-bold rounded text-xs"
            >
              Save & Open
            </button>
          </form>
        )}

        {/* Program Cards List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              {programs.length === 0 ? (
                <div>
                  <p className="mb-2">You don't have any saved programs yet.</p>
                  <p className="text-xs text-slate-600">Write your code in the editor and click "Save" to keep your work!</p>
                </div>
              ) : (
                `No programs found matching "${searchTerm}".`
              )}
            </div>
          ) : (
            filtered.map(p => {
              const isCurrent = currentProgramId === p.id;
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-slate-850 border-sky-500/50 shadow-md shadow-sky-500/10'
                      : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div
                    className="flex-1 cursor-pointer min-w-0 pr-4"
                    onClick={() => {
                      onSelectProgram(p);
                      onClose();
                    }}
                  >
                    <h4 className="font-semibold text-sm text-slate-100 truncate hover:text-sky-400">
                      {p.title}
                    </h4>
                    {p.updated_at && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        Saved: {new Date(p.updated_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        onSelectProgram(p);
                        onClose();
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => onDeleteProgram(p.id)}
                      className="p-1.5 hover:bg-rose-950/50 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                      title="Delete program"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
