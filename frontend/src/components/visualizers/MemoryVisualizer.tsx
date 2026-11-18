import React from 'react';
import { Variable, HeapBlock } from '../../types';
import { Layers, Database, ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface MemoryVisualizerProps {
  variables: Variable[];
  heapBlocks: HeapBlock[];
  callStack: string[];
  selectedAddress?: string | null;
  onSelectAddress?: (addr: string) => void;
}

export const MemoryVisualizer: React.FC<MemoryVisualizerProps> = ({
  variables,
  heapBlocks,
  callStack,
  selectedAddress,
  onSelectAddress
}) => {
  const heapMap = new Map<string, HeapBlock>();
  heapBlocks.forEach(b => heapMap.set(b.address, b));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full p-4 overflow-y-auto bg-slate-950 text-slate-200">
      {/* --- STACK MEMORY PANEL --- */}
      <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-800/80 border-b border-slate-700/80">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-400" />
            <h3 className="font-semibold text-sm tracking-wide text-slate-100">Stack Memory (Frames & Locals)</h3>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
            Frame: {callStack[callStack.length - 1] || 'main'}()
          </span>
        </div>

        <div className="p-4 flex-1 space-y-3">
          {variables.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm italic">
              No local variables currently allocated on the stack.
            </div>
          ) : (
            <div className="space-y-2.5">
              {variables.map(v => {
                const isSelected = selectedAddress === v.address || selectedAddress === v.value_hex;
                const pointsToHeap = v.is_pointer && !v.is_null && heapMap.has(v.value_hex);
                const targetBlock = pointsToHeap ? heapMap.get(v.value_hex) : null;

                return (
                  <div
                    key={v.name}
                    onClick={() => onSelectAddress?.(v.value_hex)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800 border-sky-400 shadow-md shadow-sky-500/10'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="font-bold text-sky-400 text-sm">{v.name}</span>
                        <span className="text-slate-500">({v.type})</span>
                      </div>
                      <span className="text-slate-400 font-mono text-[11px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                        &{v.name} = {v.address}
                      </span>
                    </div>

                    {/* Stored Value Details */}
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="text-slate-400">Value:</span>
                      {v.is_pointer ? (
                        <div className="flex items-center gap-2">
                          {v.is_null ? (
                            <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded font-semibold text-[11px]">
                              NULL (0x0)
                            </span>
                          ) : v.is_dangling ? (
                            <span className="px-2 py-0.5 bg-rose-500/30 text-rose-300 border border-rose-500/60 rounded font-semibold flex items-center gap-1 text-[11px]">
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              Dangling! {v.value_hex} (FREED)
                            </span>
                          ) : (
                            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                              <span>{v.value_hex}</span>
                              <ArrowRight className="w-3 h-3 text-slate-500" />
                              <span className="text-slate-300">
                                {pointsToHeap ? `Heap [${targetBlock?.size}B]` : 'Stack Object'}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-amber-400 font-bold text-sm">
                          {v.value_int !== undefined ? v.value_int : v.value_hex}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* --- HEAP MEMORY PANEL --- */}
      <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-800/80 border-b border-slate-700/80">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            <h3 className="font-semibold text-sm tracking-wide text-slate-100">Heap Memory (Dynamic Allocation)</h3>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {heapBlocks.length} Block(s) Total
          </span>
        </div>

        <div className="p-4 flex-1 space-y-3">
          {heapBlocks.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm italic">
              No memory allocated on the heap yet.<br />
              Call <code className="text-emerald-400">malloc()</code> or <code className="text-emerald-400">calloc()</code> to allocate heap blocks.
            </div>
          ) : (
            <div className="space-y-2.5">
              {heapBlocks.map(block => {
                const isSelected = selectedAddress === block.address;
                const pointingVars = variables.filter(v => v.value_hex === block.address).map(v => v.name);

                return (
                  <div
                    key={block.address}
                    onClick={() => onSelectAddress?.(block.address)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      block.is_freed
                        ? 'bg-rose-950/20 border-rose-900/50 opacity-80'
                        : isSelected
                        ? 'bg-slate-800 border-emerald-400 shadow-md shadow-emerald-500/10'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2 font-mono">
                        <span className="font-bold text-slate-200 text-sm">{block.address}</span>
                        <span className="text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">
                          {block.size} bytes
                        </span>
                      </div>
                      {block.is_freed ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                          <AlertTriangle className="w-3 h-3" /> Freed at Line {block.freed_line}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> Active (Allocated L{block.alloc_line})
                        </span>
                      )}
                    </div>

                    {/* Pointed by local variables */}
                    {pointingVars.length > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
                        <span>Referenced by:</span>
                        {pointingVars.map(p => (
                          <span
                            key={p}
                            className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
