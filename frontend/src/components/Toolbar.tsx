import React from 'react';
import { ExecutionMode, AnimationSpeed } from '../types';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  FolderOpen,
  Download,
  PlusCircle,
  Save,
  Gauge,
  Hammer,
  Bug
} from 'lucide-react';

interface ToolbarProps {
  mode: ExecutionMode;
  onModeChange: (m: ExecutionMode) => void;
  speed: AnimationSpeed;
  onSpeedChange: (s: AnimationSpeed) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentStepIndex: number;
  totalSteps: number;
  onPrevStep: () => void;
  onNextStep: () => void;
  onReset: () => void;
  onFirstStep?: () => void;
  onLastStep?: () => void;
  onRunFull: () => void;
  onRunTrace: () => void;
  onCompile: () => void;
  isTracing: boolean;
  onOpenProgramsModal: () => void;
  onNewProgram: () => void;
  onSaveProgram: () => void;
  onDownloadCode: () => void;
  onOpenAI: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  mode,
  onModeChange,
  speed,
  onSpeedChange,
  isPlaying,
  onTogglePlay,
  currentStepIndex,
  totalSteps,
  onPrevStep,
  onNextStep,
  onReset,
  onFirstStep,
  onLastStep,
  onRunFull,
  onRunTrace,
  onCompile,
  isTracing,
  onOpenProgramsModal,
  onNewProgram,
  onSaveProgram,
  onDownloadCode,
  onOpenAI
}) => {
  const speeds: AnimationSpeed[] = ['0.25x', '0.5x', '1x', '1.5x', '2x'];

  return (
    <div className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between gap-3 text-xs select-none">
      {/* Left: Execution Controls (Run, Compile, Debug/Trace, Play/Pause, Steps) */}
      <div className="flex items-center gap-2">
        {/* 1. Main RUN Button (Green) - Runs and animates step-by-step from Step 1 */}
        <button
          onClick={onRunFull}
          disabled={isTracing}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-bold rounded-lg transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
          title="Run program and animate step-by-step process from line 1"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{isTracing ? 'Running...' : 'Run'}</span>
        </button>

        {/* 2. Step Debug / Trace Button */}
        <button
          onClick={onRunTrace}
          disabled={isTracing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-slate-950 font-bold rounded-lg transition-all shadow-md shadow-sky-500/20 disabled:opacity-50"
          title="Start paused at Step 1 for manual step-by-step exploration"
        >
          <Bug className="w-4 h-4" />
          <span>{isTracing ? 'Tracing...' : 'Step Debug'}</span>
        </button>

        {/* 3. Compile Only Button */}
        <button
          onClick={onCompile}
          disabled={isTracing}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg border border-slate-700 transition-all disabled:opacity-50"
          title="Check compilation with Clang (syntax & type check)"
        >
          <Hammer className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Compile</span>
        </button>

        <div className="h-5 w-px bg-slate-800 mx-1" />

        {/* Auto Play / Pause (Available whenever steps exist) */}
        {totalSteps > 0 && (
          <button
            onClick={onTogglePlay}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold border transition-all ${
              isPlaying
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
            }`}
            title={isPlaying ? "Pause auto-playback" : "Play step-by-step animation"}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlaying ? 'Pause' : 'Auto Play'}</span>
          </button>
        )}

        {/* Step Navigation Controls (First, Prev, Counter, Next, Last, Reset) */}
        <div className="flex items-center gap-0.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
          {/* Jump to First Step */}
          <button
            onClick={onFirstStep || onReset}
            disabled={currentStepIndex <= 0 || totalSteps === 0}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent"
            title="First Step (Step 1)"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          {/* Previous Step */}
          <button
            onClick={onPrevStep}
            disabled={currentStepIndex <= 0 || totalSteps === 0}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent"
            title="Previous Step"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Step Indicator */}
          <span className="font-mono text-[11px] px-2 text-slate-300 whitespace-nowrap select-none font-semibold">
            {totalSteps > 0 ? `${currentStepIndex + 1} / ${totalSteps}` : '0 / 0'}
          </span>

          {/* Next Step */}
          <button
            onClick={onNextStep}
            disabled={currentStepIndex >= totalSteps - 1 || totalSteps === 0}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent"
            title="Next Step"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Jump to Last Step (Final Output) */}
          <button
            onClick={onLastStep}
            disabled={currentStepIndex >= totalSteps - 1 || totalSteps === 0}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent"
            title="Final Output (Last Step)"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          {/* Reset */}
          <button
            onClick={onReset}
            disabled={totalSteps === 0}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 disabled:opacity-30"
            title="Reset to Step 1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Animation Speed Selector */}
        {(mode === 'auto' || mode === 'combined') && (
          <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 text-slate-400">
            <Gauge className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={speed}
              onChange={(e) => onSpeedChange(e.target.value as AnimationSpeed)}
              className="bg-transparent text-slate-300 font-mono text-[11px] focus:outline-none cursor-pointer"
            >
              {speeds.map(s => (
                <option key={s} value={s} className="bg-slate-900 text-slate-200">
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Center: Execution Mode Selector */}
      <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
        <button
          onClick={() => onModeChange('auto')}
          className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
            mode === 'auto'
              ? 'bg-sky-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Mode A: Automatic animated execution"
        >
          Mode A: Auto
        </button>
        <button
          onClick={() => onModeChange('step')}
          className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
            mode === 'step'
              ? 'bg-sky-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Mode B: Step-by-step manual execution"
        >
          Mode B: Step
        </button>
        <button
          onClick={() => onModeChange('combined')}
          className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
            mode === 'combined'
              ? 'bg-sky-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Mode C: Combined automatic & manual step controls"
        >
          Mode C: Combined
        </button>
      </div>

      {/* Right: Program Management & AI Learning Assistant */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={onNewProgram}
            className="flex items-center gap-1 px-2 py-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 text-xs"
            title="Create New Blank C Program"
          >
            <PlusCircle className="w-3.5 h-3.5 text-sky-400" />
            <span>New</span>
          </button>
          <button
            onClick={onSaveProgram}
            className="flex items-center gap-1 px-2 py-1 hover:bg-slate-800 rounded text-slate-400 hover:text-emerald-400 text-xs"
            title="Save Program to SQLite"
          >
            <Save className="w-3.5 h-3.5 text-emerald-400" />
            <span>Save</span>
          </button>
          <button
            onClick={onOpenProgramsModal}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-amber-400"
            title="My Saved Programs Library"
          >
            <FolderOpen className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDownloadCode}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200"
            title="Download source code as .c file"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* AI Learning Assistant Button */}
        <button
          onClick={onOpenAI}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-450 hover:to-purple-550 text-white font-bold rounded-lg shadow-md shadow-indigo-500/20 transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Ask AI</span>
        </button>
      </div>
    </div>
  );
};
