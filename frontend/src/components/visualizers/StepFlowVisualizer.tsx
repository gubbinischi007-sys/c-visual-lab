import React, { useRef, useEffect, useState } from 'react';
import { TraceStep } from '../../types';
import { extractMilestones, MilestoneStage } from '../../utils/milestones';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  CheckCircle2,
  Code,
  ArrowRight,
  Database,
  Link as LinkIcon,
  Layers,
  Sparkles,
  GitCommit,
  ListOrdered
} from 'lucide-react';

interface StepFlowVisualizerProps {
  steps: TraceStep[];
  currentStepIndex: number;
  onSelectStep: (index: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onJumpToFinal: () => void;
  onJumpToStart: () => void;
}

export const StepFlowVisualizer: React.FC<StepFlowVisualizerProps> = ({
  steps,
  currentStepIndex,
  onSelectStep,
  isPlaying,
  onTogglePlay,
  onJumpToFinal,
  onJumpToStart
}) => {
  const [viewMode, setViewMode] = useState<'stages' | 'all'>('stages');
  const activeCardRef = useRef<HTMLDivElement>(null);

  const totalSteps = steps.length;
  const milestones = extractMilestones(steps);

  // Auto-scroll active step card into view during playback
  useEffect(() => {
    if (activeCardRef.current) {
      activeCardRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [currentStepIndex, viewMode]);

  if (totalSteps === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-500">
        <p>No execution steps recorded yet. Run a C program to see step-by-step progress.</p>
      </div>
    );
  }

  const finalStep = steps[totalSteps - 1];
  const finalNodes = finalStep?.linked_list?.main_chain || [];

  return (
    <div className="flex flex-col h-full bg-slate-950 overflow-hidden text-slate-200 select-none">
      {/* Top Controls Header */}
      <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-sky-400">Step Progression Journey</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-sky-500/20 text-sky-300 font-mono font-semibold border border-sky-500/30">
              {totalSteps} Steps Total
            </span>
          </div>

          {/* Mode Segmented Switcher: Major Stages vs All Micro-Steps */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('stages')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${viewMode === 'stages'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
                }`}
              title="View Major Logical Stages (e.g. 10 -> 20 to 10 -> 30 to 20 to 10 -> Final Output)"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Major Stages ({milestones.length})</span>
            </button>

            <button
              onClick={() => setViewMode('all')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${viewMode === 'all'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
                }`}
              title="View All Detailed Line-by-Line Micro-Steps"
            >
              <ListOrdered className="w-3.5 h-3.5 text-sky-400" />
              <span>All Micro-Steps ({totalSteps})</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Start Over */}
          <button
            onClick={onJumpToStart}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg border border-slate-700 transition-all cursor-pointer"
            title="Go to Step 1"
          >
            <SkipBack className="w-3.5 h-3.5" />
            <span>Step 1</span>
          </button>

          {/* Play/Pause */}
          <button
            onClick={onTogglePlay}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${isPlaying
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-emerald-400'
              }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlaying ? 'Pause' : 'Play All Steps'}</span>
          </button>

          {/* Jump to Final Output Visual */}
          <button
            onClick={onJumpToFinal}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${currentStepIndex === totalSteps - 1
              ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-md shadow-sky-500/20'
              : 'bg-slate-800 hover:bg-sky-500/20 text-sky-300 border-sky-500/40'
              }`}
            title="Jump directly to Final Output Visual"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Final Output Visual</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: Major Logical Stages View (10 -> 20 to 10 -> 30 to 20 to 10 -> Final) */}
      {viewMode === 'stages' ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>
              Logical Operation Progression: Visualizing how the data structure grows from step to step.
            </span>
            <span className="font-mono text-sky-400 font-semibold">
              Current: Step {currentStepIndex + 1}/{totalSteps}
            </span>
          </div>

          {milestones.map((m, mIdx) => {
            const isCurrentMilestone =
              currentStepIndex >= m.stepIndex &&
              (mIdx === milestones.length - 1 || currentStepIndex < milestones[mIdx + 1].stepIndex);

            return (
              <div
                key={m.id}
                ref={isCurrentMilestone ? activeCardRef : null}
                onClick={() => onSelectStep(m.stepIndex)}
                className={`p-4 rounded-xl border transition-all cursor-pointer relative ${isCurrentMilestone
                  ? 'bg-slate-900 border-sky-500 shadow-2xl shadow-sky-500/10 ring-1 ring-sky-500/50'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
                  }`}
              >
                {/* Active Indicator Pillar */}
                {isCurrentMilestone && (
                  <div className="absolute left-0 top-3 bottom-3 w-1.5 bg-sky-400 rounded-r-full shadow-md" />
                )}

                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono font-bold text-xs px-2.5 py-1 rounded-md ${m.isFinal
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                        : isCurrentMilestone
                          ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                          : 'bg-slate-800 text-slate-300'
                        }`}
                    >
                      {m.isFinal ? '✨ Final Output' : `Stage ${m.stageNumber}`}
                    </span>

                    <span className="text-xs font-mono text-slate-400">
                      Step {m.stepIndex + 1} of {totalSteps}
                    </span>

                    {m.code && (
                      <span className="text-xs font-mono bg-slate-950 px-2 py-0.5 rounded text-sky-300 border border-slate-800">
                        {m.code}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectStep(m.stepIndex);
                    }}
                    className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all ${isCurrentMilestone
                      ? 'bg-sky-500 text-slate-950'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                  >
                    <span>{isCurrentMilestone ? '● Viewing on Canvas' : 'View Visual State ➔'}</span>
                  </button>
                </div>

                {/* Visual Representation Diagram Strip */}
                <div className="bg-slate-950/90 rounded-lg p-3 border border-slate-800/80 mb-3 flex items-center flex-wrap gap-2 font-mono text-sm">
                  <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 text-xs font-bold">
                    HEAD
                  </span>
                  <span className="text-sky-400 font-bold">──▶</span>

                  {m.chain.map((val, cIdx) => (
                    <React.Fragment key={cIdx}>
                      <div className="flex items-center border border-sky-500/60 rounded-md overflow-hidden bg-slate-900 shadow-md">
                        <div className="px-2.5 py-1 bg-slate-800 text-emerald-300 font-bold border-r border-slate-700">
                          {val}
                        </div>
                        <div className="px-2 py-1 text-[10px] text-sky-300 font-semibold bg-slate-950">
                          LINK
                        </div>
                      </div>
                      <span className="text-sky-400 font-bold">──▶</span>
                    </React.Fragment>
                  ))}

                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold">
                    NULL
                  </span>
                </div>

                {/* Summary Info */}
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-semibold">List State:</span>
                    <span className="text-sky-300 font-mono font-bold">{m.label}</span>
                  </div>

                  {m.stdoutSnippet && (
                    <div className="flex items-center gap-1.5 font-mono text-[11px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-emerald-400">
                      <span className="text-slate-500">Output:</span>
                      <span>&quot;{m.stdoutSnippet}&quot;</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VIEW 2: All 64 Detailed Micro-Steps View */
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {steps.map((step, idx) => {
            const isActive = idx === currentStepIndex;
            const isPassed = idx < currentStepIndex;
            const isLast = idx === totalSteps - 1;
            const mainChain = step.linked_list?.main_chain || [];
            const stagedNodes = step.linked_list?.staged_nodes || [];
            const freedNodes = step.linked_list?.freed_nodes || [];

            return (
              <div
                key={idx}
                ref={isActive ? activeCardRef : null}
                onClick={() => onSelectStep(idx)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer relative ${isActive
                  ? 'bg-slate-900 border-sky-500 shadow-xl shadow-sky-500/10 ring-1 ring-sky-500/50'
                  : isPassed
                    ? 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/80'
                    : 'bg-slate-950/40 border-slate-800/40 hover:border-slate-700 opacity-60 hover:opacity-100'
                  }`}
              >
                {/* Active Indicator Pillar */}
                {isActive && (
                  <div className="absolute left-0 top-3 bottom-3 w-1.5 bg-sky-400 rounded-r-full shadow-md" />
                )}

                {/* Step Card Top Bar */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono font-bold text-xs px-2 py-0.5 rounded-md ${isActive
                        ? 'bg-sky-500 text-slate-950'
                        : isLast
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400'
                        }`}
                    >
                      Step {idx + 1}
                    </span>

                    <span className="text-xs font-mono text-slate-400">
                      Line {step.line}
                    </span>

                    <span className="text-[11px] font-mono px-2 py-0.2 bg-slate-800/70 text-slate-300 rounded border border-slate-700/60">
                      {step.func}()
                    </span>

                    {isLast && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Final Output
                      </span>
                    )}
                  </div>

                  {isActive && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-sky-400 uppercase tracking-wider bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/30 animate-pulse">
                      ● Current Visual State
                    </span>
                  )}
                </div>

                {/* Executed Code Snippet */}
                <div className="bg-slate-950/90 rounded-lg p-2 font-mono text-xs text-sky-200 border border-slate-800 mb-2.5 flex items-center gap-2 overflow-x-auto">
                  <Code className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="font-semibold text-emerald-400">{step.code}</span>
                </div>

                {/* Explanation Summary */}
                {step.explanation && (
                  <div className="text-xs text-slate-300 mb-2 leading-relaxed flex items-start gap-1.5">
                    <span className="text-sky-400 font-semibold shrink-0">Action:</span>
                    <span>{step.explanation.title || step.explanation.what_is_happening || 'Statement executed'}</span>
                  </div>
                )}

                {/* Visual State Snapshot Strip */}
                <div className="flex items-center flex-wrap gap-2 text-[11px] font-mono pt-2 border-t border-slate-800/60 text-slate-400">
                  <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                    <LinkIcon className="w-3 h-3 text-sky-400" />
                    <span className="text-slate-400">Chain:</span>
                    {mainChain.length === 0 ? (
                      <span className="text-rose-400 font-semibold">HEAD → NULL</span>
                    ) : (
                      <span className="text-sky-300 font-bold">
                        HEAD → {mainChain.map(n => n.data).join(' → ')} → NULL
                      </span>
                    )}
                  </div>

                  {stagedNodes.length > 0 && (
                    <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/30 text-amber-300">
                      <Database className="w-3 h-3" />
                      <span>Staged: [{stagedNodes.map(n => n.data).join(', ')}]</span>
                    </div>
                  )}

                  {freedNodes.length > 0 && (
                    <div className="flex items-center gap-1 bg-rose-500/10 px-2 py-1 rounded border border-rose-500/30 text-rose-300">
                      <span>Freed: {freedNodes.length}</span>
                    </div>
                  )}

                  {step.stdout_delta && (
                    <div className="flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/30 text-emerald-300">
                      <span>Output: &quot;{step.stdout_delta.trim()}&quot;</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
