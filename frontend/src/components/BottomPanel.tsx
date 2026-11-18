import React, { useState } from 'react';
import { CompilerDiagnostic, TraceSummary } from '../types';
import { Terminal, AlertTriangle, ShieldCheck, Clock, Send, ChevronUp, ChevronDown } from 'lucide-react';

interface BottomPanelProps {
  stdout: string;
  stderr: string;
  diagnostics: CompilerDiagnostic[];
  summary?: TraceSummary;
  stdin: string;
  onStdinChange: (val: string) => void;
  onSendStdin?: () => void;
  isExecuting?: boolean;
  onSelectLine?: (line: number) => void;
}

export const BottomPanel: React.FC<BottomPanelProps> = ({
  stdout,
  stderr,
  diagnostics,
  summary,
  stdin,
  onStdinChange,
  onSendStdin,
  isExecuting,
  onSelectLine
}) => {
  const [activeTab, setActiveTab] = useState<'output' | 'compiler' | 'leaks'>('output');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const errorCount = diagnostics.filter(d => d.severity === 'error').length;
  const warningCount = diagnostics.filter(d => d.severity === 'warning').length;

  if (isCollapsed) {
    return (
      <div className="h-9 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-4 text-xs select-none">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-300">Terminal & Console</span>
          {errorCount > 0 && (
            <span className="text-rose-400 font-mono text-[11px] flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {errorCount} errors
            </span>
          )}
        </div>
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200"
          title="Expand console"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="h-56 bg-slate-950 border-t border-slate-800 flex flex-col overflow-hidden text-xs select-none">
      {/* Tab Navigation Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-b border-slate-800">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('output')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-all ${
              activeTab === 'output'
                ? 'bg-slate-800 text-sky-400 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Program Output</span>
          </button>

          <button
            onClick={() => setActiveTab('compiler')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-all ${
              activeTab === 'compiler'
                ? 'bg-slate-800 text-amber-400 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Clang Compiler</span>
            {(errorCount > 0 || warningCount > 0) && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                errorCount > 0 ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
              }`}>
                {errorCount + warningCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('leaks')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-all ${
              activeTab === 'leaks'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Memory Leaks</span>
            {summary?.leak_count ? (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300">
                {summary.leak_count} leaked!
              </span>
            ) : null}
          </button>
        </div>

        <div className="flex items-center gap-3">
          {summary?.total_steps !== undefined && (
            <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>{summary.total_steps} steps</span>
            </div>
          )}

          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200"
            title="Collapse panel"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tab Body Content */}
      <div className="flex-1 p-3 overflow-y-auto font-mono text-slate-300">
        {activeTab === 'output' && (
          <div className="h-full flex flex-col justify-between">
            <div className="space-y-1">
              {stdout ? (
                <pre className="whitespace-pre-wrap text-emerald-400 leading-relaxed">{stdout}</pre>
              ) : (
                <div className="text-slate-600 italic">No output yet. Run the program to see stdout results.</div>
              )}
              {stderr && (
                <pre className="whitespace-pre-wrap text-rose-400 mt-2">{stderr}</pre>
              )}
            </div>

            {/* Standard Input Bar (scanf support) */}
            <div className="mt-3 flex items-center gap-2 border-t border-slate-800 pt-2">
              <span className="text-slate-500 text-[11px] font-semibold whitespace-nowrap">stdin:</span>
              <input
                type="text"
                value={stdin}
                onChange={(e) => onStdinChange(e.target.value)}
                placeholder="Type input for scanf() then run..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500 text-xs"
              />
              <button
                onClick={onSendStdin}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded flex items-center gap-1 text-[11px] font-medium"
              >
                <Send className="w-3 h-3" />
                <span>Submit</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'compiler' && (
          <div>
            {diagnostics.length === 0 ? (
              <div className="flex items-center gap-2 text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>Clean compilation! Clang generated zero errors and zero warnings.</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                {diagnostics.map((d, i) => (
                  <div
                    key={i}
                    onClick={() => onSelectLine?.(d.line)}
                    className={`flex items-start gap-2 p-1.5 rounded cursor-pointer transition-colors ${
                      d.severity === 'error'
                        ? 'bg-rose-950/30 hover:bg-rose-950/50 text-rose-300 border border-rose-900/40'
                        : 'bg-amber-950/30 hover:bg-amber-950/50 text-amber-300 border border-amber-900/40'
                    }`}
                  >
                    <span className="font-bold shrink-0">Line {d.line}:{d.col}</span>
                    <span className="text-slate-400">[{d.severity}]:</span>
                    <span>{d.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'leaks' && (
          <div className="space-y-3">
            {summary?.leak_count ? (
              <div className="p-3 bg-rose-950/20 border border-rose-900/50 rounded-lg">
                <div className="flex items-center gap-2 text-rose-400 font-bold mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Memory Leak Detected!</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Your program finished with <strong>{summary.leak_count}</strong> un-freed heap block(s) totaling <strong>{summary.leaked_bytes} bytes</strong>.
                  Remember in C to call <code className="text-sky-400">free()</code> for every block allocated with <code className="text-sky-400">malloc()</code>.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-emerald-950/20 border border-emerald-900/50 rounded-lg flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold text-emerald-400 mb-0.5">No Memory Leaks Detected</div>
                  <div className="text-slate-400 text-[11px]">
                    All dynamically allocated heap blocks were properly released using free() before termination.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
