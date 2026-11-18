import React, { useState, useEffect } from 'react';
import { TraceStep } from '../../types';
import { LinkedListVisualizer } from './LinkedListVisualizer';
import { MemoryVisualizer } from './MemoryVisualizer';
import { ExplanationPanel } from './ExplanationPanel';
import { StepFlowVisualizer } from './StepFlowVisualizer';
import { extractMilestones } from '../../utils/milestones';
import {
  GitCommit,
  Layers,
  Eye,
  Maximize2,
  Minimize2,
  Expand,
  Shrink,
  ChevronLeft,
  ChevronRight,
  ListOrdered,
  CheckCircle2,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Sparkles
} from 'lucide-react';

interface VisualizationContainerProps {
  currentStep?: TraceStep | null;
  totalSteps: number;
  allSteps?: TraceStep[];
  currentStepIndex?: number;
  onSelectStep?: (index: number) => void;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  onRun?: () => void;
  onStepDebug?: () => void;
  onJumpToFinal?: () => void;
  onJumpToStart?: () => void;
  onNextStep?: () => void;
  onPrevStep?: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onSetSplitRatio?: (ratio: number) => void;
}

export const VisualizationContainer: React.FC<VisualizationContainerProps> = ({
  currentStep,
  totalSteps,
  allSteps = [],
  currentStepIndex = 0,
  onSelectStep,
  isPlaying = false,
  onTogglePlay,
  onRun,
  onStepDebug,
  onJumpToFinal,
  onJumpToStart,
  onNextStep,
  onPrevStep,
  isExpanded,
  onToggleExpand,
  onSetSplitRatio
}) => {
  const [activeTab, setActiveTab] = useState<'linked_list' | 'memory' | 'step_flow'>('linked_list');
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const handleFSChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFSChange);
    return () => document.removeEventListener('fullscreenchange', handleFSChange);
  }, []);

  const milestones = extractMilestones(allSteps);

  const handlePrevStage = () => {
    const curIdx = currentStep?.step_index || 0;
    for (let i = milestones.length - 1; i >= 0; i--) {
      if (milestones[i].stepIndex < curIdx) {
        onSelectStep?.(milestones[i].stepIndex);
        return;
      }
    }
    if (milestones[0]) onSelectStep?.(milestones[0].stepIndex);
  };

  const handleNextStage = () => {
    const curIdx = currentStep?.step_index || 0;
    for (let i = 0; i < milestones.length; i++) {
      if (milestones[i].stepIndex > curIdx) {
        onSelectStep?.(milestones[i].stepIndex);
        return;
      }
    }
    if (onJumpToFinal) onJumpToFinal();
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  if (!currentStep) {
    return (
      <div className="flex flex-col h-full bg-slate-950 text-slate-400 relative">
        {/* Top Expansion Bar in empty state */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900/60 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-slate-400 font-medium">
            <Eye className="w-4 h-4 text-sky-400" />
            <span>Visualization Workspace</span>
          </div>

          <div className="flex items-center gap-1.5">
            {onSetSplitRatio && (
              <>
                <button
                  onClick={() => onSetSplitRatio(50)}
                  className={`px-2 py-1 rounded text-[11px] font-mono border transition-all ${
                    !isExpanded
                      ? 'bg-slate-800 text-sky-300 border-slate-700'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                  title="50:50 Split View"
                >
                  50:50
                </button>
                <button
                  onClick={() => onSetSplitRatio(25)}
                  className="px-2 py-1 rounded text-[11px] font-mono border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
                  title="Wide Visualizer (75% / 25%)"
                >
                  Wide (75%)
                </button>
              </>
            )}

            {/* Expand / Collapse Left Panel Button */}
            {onToggleExpand && (
              <button
                onClick={onToggleExpand}
                className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-sky-600 hover:text-white text-sky-400 font-semibold rounded text-[11px] border border-slate-700 transition-all cursor-pointer"
                title={isExpanded ? "Restore Split View" : "Expand to Full Width (Collapse Code Editor)"}
              >
                {isExpanded ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
                <span>{isExpanded ? 'Restore Split' : 'Expand Full'}</span>
              </button>
            )}

            {/* True Browser Fullscreen Button */}
            <button
              onClick={handleToggleFullscreen}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold rounded text-[11px] border border-slate-700 transition-all cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen" : "Full Screen Mode (Entire Display)"}
            >
              {isFullscreen ? <Shrink className="w-3.5 h-3.5 text-amber-400" /> : <Expand className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{isFullscreen ? 'Exit Full' : 'Full Screen'}</span>
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-sky-400 mb-4 shadow-xl">
            <Eye className="w-8 h-8 opacity-80" />
          </div>
          <h3 className="text-lg font-semibold text-slate-200 mb-2">Visualization Workspace</h3>
          <p className="max-w-md text-sm text-slate-400 leading-relaxed mb-6">
            Write or select a C program from the templates above, then click <strong className="text-emerald-400">Run</strong> to execute directly or <strong className="text-sky-400">Step Debug</strong> to step through lines.
          </p>

          <div className="flex items-center gap-3 mb-6">
            {onRun && (
              <button
                onClick={onRun}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 text-xs transition-all cursor-pointer"
              >
                <span>▶ Run & Animate Steps</span>
              </button>
            )}
            {onStepDebug && (
              <button
                onClick={onStepDebug}
                className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-sky-500/20 text-xs transition-all cursor-pointer"
              >
                <span>🔍 Step-by-Step Debug</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
            <span>Mode: Real Clang Compilation + Native Execution Tracing</span>
          </div>
        </div>
      </div>
    );
  }

  const { linked_list, variables, heap, call_stack, explanation, error } = currentStep;

  return (
    <div className="flex flex-col h-full bg-slate-950 overflow-hidden">
      {/* Top Tab Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('linked_list')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'linked_list'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <GitCommit className="w-3.5 h-3.5" />
            <span>Linked List Canvas</span>
            {linked_list.nodes.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-sky-500/30 text-sky-200">
                {linked_list.nodes.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('memory')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'memory'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Stack & Heap Memory</span>
            {heap.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/30 text-emerald-200">
                {heap.length}
              </span>
            )}
          </button>

          {/* Tab 3: Step-by-Step Flow List */}
          <button
            onClick={() => setActiveTab('step_flow')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'step_flow'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>All Steps One-by-One</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/30 text-amber-200 font-mono font-bold">
              {allSteps.length > 0 ? allSteps.length : totalSteps}
            </span>
          </button>
        </div>

        {/* Step indicator & View Expansion Controls */}
        <div className="flex items-center gap-2.5">
          {/* Quick jump to Final Output Visual button */}
          {onJumpToFinal && (
            <button
              onClick={onJumpToFinal}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                currentStep.step_index === totalSteps - 1
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}
              title="Jump directly to Final Output Visual"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Final Output Visual</span>
            </button>
          )}

          <div className="h-4 w-px bg-slate-800" />

          <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
            <span className="text-sky-300 font-bold">Step {currentStep.step_index + 1}/{totalSteps}</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300">L{currentStep.line}</span>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          {/* Quick preset width buttons (50%, 75%, 100%) */}
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
            {onSetSplitRatio && (
              <>
                <button
                  onClick={() => onSetSplitRatio(50)}
                  className={`px-2 py-0.5 rounded font-mono transition-all ${
                    !isExpanded ? 'bg-slate-800 text-sky-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="50:50 Split View (Editor and Visualizer)"
                >
                  50:50
                </button>
                <button
                  onClick={() => onSetSplitRatio(25)}
                  className="px-2 py-0.5 rounded font-mono text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
                  title="Wide Visualizer view (75% Visualizer / 25% Editor)"
                >
                  Wide
                </button>
              </>
            )}

            {/* Expand / Collapse Left Panel Button */}
            {onToggleExpand && (
              <button
                onClick={onToggleExpand}
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded font-semibold transition-all ${
                  isExpanded
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title={isExpanded ? 'Restore Split View (Show Code Editor)' : 'Expand Visualization to Full Width (100% Width)'}
              >
                {isExpanded ? (
                  <>
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span>Restore</span>
                  </>
                ) : (
                  <>
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Expand</span>
                  </>
                )}
              </button>
            )}

            {/* True Browser Fullscreen Button */}
            <button
              onClick={handleToggleFullscreen}
              className={`flex items-center gap-1 px-2 py-0.5 rounded font-semibold transition-all border ${
                isFullscreen
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                  : 'border-transparent text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title={isFullscreen ? 'Exit Full Screen' : 'Full Screen Mode (Entire Display)'}
            >
              {isFullscreen ? (
                <>
                  <Shrink className="w-3.5 h-3.5 text-amber-400" />
                  <span>Exit Full</span>
                </>
              ) : (
                <>
                  <Expand className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Full Screen</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* State Milestones Progression Bar (e.g. Stage 1: 10 -> Stage 2: 20 to 10 -> Stage 3: 30 to 20 to 10 -> Final Output) */}
      {milestones.length > 0 && activeTab === 'linked_list' && (
        <div className="bg-slate-900/95 border-b border-slate-800 px-4 py-2 flex items-center gap-2 overflow-x-auto shadow-inner text-xs select-none">
          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            Progression:
          </span>

          <div className="flex items-center gap-1.5 shrink-0">
            {milestones.map((m, mIdx) => {
              const isCurrent =
                (currentStep?.step_index || 0) >= m.stepIndex &&
                (mIdx === milestones.length - 1 || (currentStep?.step_index || 0) < milestones[mIdx + 1].stepIndex);

              return (
                <React.Fragment key={m.id}>
                  <button
                    onClick={() => {
                      onSelectStep?.(m.stepIndex);
                      if (m.isFinal) onJumpToFinal?.();
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-xs font-semibold border transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-sky-500/20 text-sky-200 border-sky-400 shadow-md shadow-sky-500/10 ring-1 ring-sky-500/40'
                        : m.isFinal
                        ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                    }`}
                    title={m.description}
                  >
                    <span className="text-[10px] text-slate-400 font-sans font-bold">
                      {m.isFinal ? '✨ Final' : `Stage ${m.stageNumber}:`}
                    </span>
                    <span className="font-bold">{m.label}</span>
                  </button>

                  {mIdx < milestones.length - 1 && (
                    <span className="text-slate-600 text-xs">──▶</span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Canvas Area */}
      <div className="flex-1 relative overflow-hidden">
        {activeTab === 'step_flow' ? (
          <StepFlowVisualizer
            steps={allSteps.length > 0 ? allSteps : [currentStep]}
            currentStepIndex={currentStepIndex}
            onSelectStep={(idx) => {
              onSelectStep?.(idx);
              setActiveTab('linked_list');
            }}
            isPlaying={isPlaying}
            onTogglePlay={onTogglePlay || (() => {})}
            onJumpToFinal={() => {
              onJumpToFinal?.();
              setActiveTab('linked_list');
            }}
            onJumpToStart={() => {
              onJumpToStart?.();
              setActiveTab('linked_list');
            }}
          />
        ) : activeTab === 'linked_list' ? (
          <LinkedListVisualizer
            nodes={linked_list.nodes}
            listType={linked_list.type}
            hasCycle={linked_list.has_cycle}
            variables={variables}
            selectedAddress={selectedAddress}
            onSelectNode={setSelectedAddress}
          />
        ) : (
          <MemoryVisualizer
            variables={variables}
            heapBlocks={heap}
            callStack={call_stack}
            selectedAddress={selectedAddress}
            onSelectAddress={setSelectedAddress}
          />
        )}
      </div>

      {/* Step-by-Step Interactive Floater strip right on canvas */}
      {activeTab !== 'step_flow' && (
        <div className="bg-slate-900/95 border-t border-slate-800 px-4 py-2 flex items-center justify-between text-xs select-none shadow-lg">
          <div className="flex items-center gap-1.5">
            {/* First Step */}
            <button
              onClick={onJumpToStart}
              disabled={currentStep.step_index <= 0}
              className="p-1 hover:bg-slate-800 rounded text-slate-300 disabled:opacity-30 cursor-pointer"
              title="First Step (Step 1)"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            {/* Prev Stage Button (Jump to previous major state) */}
            {milestones.length > 1 && (
              <button
                onClick={handlePrevStage}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 font-semibold text-[11px] cursor-pointer"
                title="Jump to Previous Major Stage (e.g. 20 -> 10, or 10)"
              >
                <span className="text-amber-400 font-bold">⏮</span>
                <span className="hidden sm:inline">Stage</span>
              </button>
            )}

            {/* Prev Micro Step */}
            <button
              onClick={onPrevStep}
              disabled={currentStep.step_index <= 0}
              className="p-1 hover:bg-slate-800 rounded text-slate-300 disabled:opacity-30 cursor-pointer"
              title="Previous Line Step"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Current Step Counter Badge */}
            <span className="font-mono px-2 py-0.5 bg-slate-950 rounded text-sky-300 font-bold border border-slate-800">
              Step {currentStep.step_index + 1} / {totalSteps}
            </span>

            {/* Next Micro Step */}
            <button
              onClick={onNextStep}
              disabled={currentStep.step_index >= totalSteps - 1}
              className="p-1 hover:bg-slate-800 rounded text-slate-300 disabled:opacity-30 cursor-pointer"
              title="Next Line Step"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Next Stage Button (Jump to next major state) */}
            {milestones.length > 1 && (
              <button
                onClick={handleNextStage}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 font-semibold text-[11px] cursor-pointer"
                title="Jump to Next Major Stage (e.g. 20 -> 10, or 30 -> 20 -> 10)"
              >
                <span className="hidden sm:inline">Stage</span>
                <span className="text-amber-400 font-bold">⏭</span>
              </button>
            )}

            {/* Auto Play Steps Toggle */}
            {onTogglePlay && (
              <button
                onClick={onTogglePlay}
                className={`flex items-center gap-1 px-2.5 py-1 rounded font-bold border transition-all cursor-pointer ${
                  isPlaying
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                }`}
                title={isPlaying ? "Pause auto-playback" : "Play step-by-step animation"}
              >
                {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                <span>{isPlaying ? 'Pause' : 'Play Steps'}</span>
              </button>
            )}
          </div>

          {/* Current Code Line Executed */}
          <div className="flex items-center gap-2 truncate max-w-[45%] font-mono text-[11px] text-slate-400">
            <span className="text-slate-500 shrink-0">Line {currentStep.line}:</span>
            <span className="text-emerald-300 font-semibold truncate bg-slate-950 px-2 py-0.5 rounded border border-slate-800/80">
              {currentStep.code}
            </span>
          </div>

          {/* Quick jump to Final Output button */}
          {onJumpToFinal && (
            <button
              onClick={onJumpToFinal}
              disabled={currentStep.step_index >= totalSteps - 1}
              className="flex items-center gap-1.5 px-3 py-1 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 rounded-lg border border-sky-500/40 font-bold text-xs disabled:opacity-30 transition-all cursor-pointer"
              title="Jump directly to Final Output Visual"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
              <span>Final Output</span>
            </button>
          )}
        </div>
      )}

      {/* Pedagogical Teaching Explanation Panel (Requirement 5) */}
      <ExplanationPanel
        explanation={explanation}
        diff={currentStep.diff}
        code={currentStep.code}
        line={currentStep.line}
        stepIndex={currentStep.step_index}
        totalSteps={totalSteps}
        error={error}
      />
    </div>
  );
};
