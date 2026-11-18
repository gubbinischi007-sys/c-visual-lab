import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ExecutionMode,
  AnimationSpeed,
  TraceStep,
  TraceResult,
  Program,
  CompilerDiagnostic
} from './types';
import {
  compileCode,
  traceCode,
  runCode,
  fetchPrograms,
  fetchSession,
  saveSession,
  createProgram,
  updateProgram,
  deleteProgram
} from './api';
import { Navbar } from './components/Navbar';
import { Toolbar } from './components/Toolbar';
import { VisualizationContainer } from './components/visualizers/VisualizationContainer';
import { CodeEditor } from './components/CodeEditor';
import { BottomPanel } from './components/BottomPanel';
import { ProgramManagerModal } from './components/ProgramManagerModal';
import { AIAssistantModal } from './components/AIAssistantModal';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const CLEAN_STARTER_CODE = `#include <stdio.h>
#include <stdlib.h>

int main() {
    // Write your C program here
    
    return 0;
}
`;

export const App: React.FC = () => {
  // --- Core State ---
  const [code, setCode] = useState<string>(CLEAN_STARTER_CODE);
  const [mode, setMode] = useState<ExecutionMode>('combined');
  const [speed, setSpeed] = useState<AnimationSpeed>('1x');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [traceResult, setTraceResult] = useState<TraceResult | null>(null);
  const [isTracing, setIsTracing] = useState<boolean>(false);

  // --- Output & Compiler Diagnostics ---
  const [stdout, setStdout] = useState<string>('');
  const [stderr, setStderr] = useState<string>('');
  const [diagnostics, setDiagnostics] = useState<CompilerDiagnostic[]>([]);
  const [stdin, setStdin] = useState<string>('');

  // --- Programs & Templates ---
  const [programs, setPrograms] = useState<Program[]>([]);
  const [currentProgram, setCurrentProgram] = useState<Program | null>(null);
  const [currentCategory, setCurrentCategory] = useState<string>('all');

  // --- Modals ---
  const [isProgramsModalOpen, setIsProgramsModalOpen] = useState<boolean>(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState<boolean>(false);

  // --- Workspace Layout & Panel Resizing ---
  const [splitRatio, setSplitRatio] = useState<number>(50); // percentage for code editor (15-85)
  const [isVisualizationExpanded, setIsVisualizationExpanded] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mouse drag handler for interactive panel resize
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newRatio = ((e.clientX - rect.left) / rect.width) * 100;
      if (newRatio >= 15 && newRatio <= 85) {
        setSplitRatio(newRatio);
        setIsVisualizationExpanded(false);
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const toggleExpandVisualization = () => {
    setIsVisualizationExpanded(prev => !prev);
  };

  // --- Playback Timer Ref ---
  const timerRef = useRef<any>(null);

  // --- Initial Load ---
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [loadedPrograms, session] = await Promise.all([
          fetchPrograms(),
          fetchSession()
        ]);
        setPrograms(loadedPrograms);

        if (session) {
          if (session.execution_mode) setMode(session.execution_mode);
          if (session.animation_speed) setSpeed(session.animation_speed);
          if (session.current_code && !session.current_code.includes("Allocate memory for second node")) {
            setCode(session.current_code);
          } else {
            setCode(CLEAN_STARTER_CODE);
          }
        } else {
          setCode(CLEAN_STARTER_CODE);
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
      }
    }
    loadInitialData();
  }, []);

  // --- Auto-Save Session debounce ---
  useEffect(() => {
    const timer = setTimeout(() => {
      saveSession({
        current_code: code,
        execution_mode: mode,
        animation_speed: speed,
        last_program_id: currentProgram?.id || null
      }).catch(() => { });
    }, 1000);
    return () => clearTimeout(timer);
  }, [code, mode, speed, currentProgram]);

  // --- Speed in milliseconds ---
  const getSpeedMs = useCallback((s: AnimationSpeed) => {
    switch (s) {
      case '0.25x': return 2500;
      case '0.5x': return 1600;
      case '1x': return 1000;
      case '1.5x': return 650;
      case '2x': return 400;
      default: return 1000;
    }
  }, []);

  // --- Run Handler (Starts step-by-step visualization from Step 1) ---
  const handleRunFull = async () => {
    setIsTracing(true);
    setIsPlaying(false);
    clearInterval(timerRef.current);

    try {
      const res = await traceCode(code, stdin);
      setTraceResult(res);

      if (res.diagnostics) {
        setDiagnostics(res.diagnostics);
      }

      if (res.compile_failed) {
        setStderr(res.raw_output || 'Compilation failed.');
        setStdout('');
      } else if (res.success && res.steps.length > 0) {
        setStderr('');
        // Start from step 0 so students see the execution step by step!
        setCurrentStepIndex(0);
        setStdout(res.steps[0].stdout || '');

        // In Auto or Combined mode, automatically play through each step!
        if (mode === 'auto' || mode === 'combined') {
          setIsPlaying(true);
        }
      } else {
        setStderr(res.error || 'Execution stopped unexpectedly.');
      }
    } catch (e: any) {
      setStderr(`Trace error: ${e?.message || 'Server connection failed'}`);
    } finally {
      setIsTracing(false);
    }
  };

  // --- Step Debug / Trace Handler (Starts paused at Step 1 for manual stepping) ---
  const handleRunTrace = async () => {
    setIsTracing(true);
    setIsPlaying(false);
    clearInterval(timerRef.current);

    try {
      const res = await traceCode(code, stdin);
      setTraceResult(res);

      if (res.diagnostics) {
        setDiagnostics(res.diagnostics);
      }

      if (res.compile_failed) {
        setStderr(res.raw_output || 'Compilation failed.');
        setStdout('');
      } else if (res.success && res.steps.length > 0) {
        setStderr('');
        setCurrentStepIndex(0);
        setStdout(res.steps[0].stdout || '');
        // Always paused for manual exploration
        setIsPlaying(false);
      } else {
        setStderr(res.error || 'Execution stopped unexpectedly.');
      }
    } catch (e: any) {
      setStderr(`Trace error: ${e?.message || 'Server connection failed'}`);
    } finally {
      setIsTracing(false);
    }
  };

  // --- Compile Only Handler ---
  const handleCompile = async () => {
    setIsTracing(true);
    try {
      const res = await compileCode(code);
      setDiagnostics(res.diagnostics);
      if (res.success) {
        setStdout('Compilation successful! Clean compilation with zero errors.\n');
        setStderr('');
      } else {
        setStderr(res.raw_output || 'Compilation failed.');
        setStdout('');
      }
    } catch (e: any) {
      setStderr(`Compile error: ${e?.message}`);
    } finally {
      setIsTracing(false);
    }
  };

  // --- Raw Direct Execution Handler ---
  const handleRawRun = async () => {
    setIsTracing(true);
    try {
      const res = await runCode(code, stdin);
      setStdout(res.stdout);
      setStderr(res.stderr);
    } catch (e: any) {
      setStderr(`Run error: ${e?.message}`);
    } finally {
      setIsTracing(false);
    }
  };

  // --- Step Navigation Handlers ---
  const totalSteps = traceResult?.steps?.length || 0;
  const currentStep: TraceStep | null =
    traceResult && totalSteps > 0 && currentStepIndex < totalSteps
      ? traceResult.steps[currentStepIndex]
      : null;

  const handleNextStep = useCallback(() => {
    setCurrentStepIndex(prev => {
      if (prev < totalSteps - 1) {
        const nextIdx = prev + 1;
        if (traceResult?.steps[nextIdx]) {
          setStdout(traceResult.steps[nextIdx].stdout || '');
        }
        return nextIdx;
      } else {
        setIsPlaying(false);
        return prev;
      }
    });
  }, [totalSteps, traceResult]);

  const handlePrevStep = useCallback(() => {
    setCurrentStepIndex(prev => {
      if (prev > 0) {
        const prevIdx = prev - 1;
        if (traceResult?.steps[prevIdx]) {
          setStdout(traceResult.steps[prevIdx].stdout || '');
        }
        return prevIdx;
      }
      return prev;
    });
  }, [traceResult]);

  const handleFirstStep = useCallback(() => {
    setIsPlaying(false);
    clearInterval(timerRef.current);
    setCurrentStepIndex(0);
    if (traceResult?.steps[0]) {
      setStdout(traceResult.steps[0].stdout || '');
    }
  }, [traceResult]);

  const handleLastStep = useCallback(() => {
    if (totalSteps > 0) {
      setIsPlaying(false);
      clearInterval(timerRef.current);
      const lastIdx = totalSteps - 1;
      setCurrentStepIndex(lastIdx);
      if (traceResult?.steps[lastIdx]) {
        setStdout(traceResult.steps[lastIdx].stdout || '');
      }
    }
  }, [totalSteps, traceResult]);

  const handleReset = handleFirstStep;

  // --- Automatic Playback Loop ---
  useEffect(() => {
    if (isPlaying && totalSteps > 0) {
      timerRef.current = setInterval(() => {
        handleNextStep();
      }, getSpeedMs(speed));
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isPlaying, totalSteps, speed, handleNextStep, getSpeedMs]);

  // --- Mode Switching (Requirement 3: Preserve State) ---
  const handleModeChange = (newMode: ExecutionMode) => {
    setMode(newMode);
    if (newMode === 'step') {
      setIsPlaying(false);
    } else if (newMode === 'auto' && totalSteps > 0 && currentStepIndex < totalSteps - 1) {
      setIsPlaying(true);
    }
    // Execution state, variables, and currentStepIndex are fully preserved!
  };

  // --- Program Selection ---
  const handleSelectProgram = (prog: Program) => {
    setCurrentProgram(prog);
    setCode(prog.code);
    setIsPlaying(false);
    setTraceResult(null);
    setCurrentStepIndex(0);
    setStdout('');
    setStderr('');
    setDiagnostics([]);
  };

  // --- Program Operations ---
  const handleNewProgram = () => {
    setCode(CLEAN_STARTER_CODE);
    setCurrentProgram(null);
    setTraceResult(null);
    setCurrentStepIndex(0);
    setStdout('');
    setStderr('');
    setDiagnostics([]);
  };

  const handleSaveProgram = async () => {
    if (currentProgram) {
      const updated = await updateProgram(currentProgram.id, { code });
      setCurrentProgram(updated);
      setPrograms(prev => prev.map(p => p.id === updated.id ? updated : p));
      alert(`Program "${updated.title}" saved.`);
    } else {
      const title = prompt('Enter a name for this C program (e.g. MyProgram.c):', 'MyProgram.c');
      if (!title) return;
      const created = await createProgram({
        title,
        category: 'custom',
        description: 'User program',
        code
      });
      setCurrentProgram(created);
      setPrograms(prev => [...prev, created]);
      alert(`Program "${title}" saved.`);
    }
  };

  const handleDownloadCode = () => {
    const blob = new Blob([code], { type: 'text/x-csrc' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(currentProgram?.title || 'program').toLowerCase().replace(/\s+/g, '_')}.c`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* 1. Top Navbar */}
      <Navbar
        onNewFile={handleNewProgram}
        onOpenSaved={() => setIsProgramsModalOpen(true)}
        onOpenAI={() => setIsAIModalOpen(true)}
        savedCount={programs.length}
      />

      {/* 2. Top Controls Toolbar */}
      <Toolbar
        mode={mode}
        onModeChange={handleModeChange}
        speed={speed}
        onSpeedChange={setSpeed}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        currentStepIndex={currentStepIndex}
        totalSteps={totalSteps}
        onPrevStep={handlePrevStep}
        onNextStep={handleNextStep}
        onFirstStep={handleFirstStep}
        onLastStep={handleLastStep}
        onReset={handleReset}
        onRunFull={handleRunFull}
        onRunTrace={handleRunTrace}
        onCompile={handleCompile}
        isTracing={isTracing}
        onOpenProgramsModal={() => setIsProgramsModalOpen(true)}
        onNewProgram={handleNewProgram}
        onSaveProgram={handleSaveProgram}
        onDownloadCode={handleDownloadCode}
        onOpenAI={() => setIsAIModalOpen(true)}
      />

      {/* 3. Main Workspace: Resizable & Expandable Split Panel */}
      <div
        ref={containerRef}
        className={`flex-1 flex overflow-hidden relative ${isDragging ? 'select-none cursor-col-resize' : ''}`}
      >
        {/* Left Panel: Monaco C Code Editor (Hidden when Visualization is expanded) */}
        {!isVisualizationExpanded && (
          <div
            style={{ width: `${splitRatio}%` }}
            className="h-full flex flex-col bg-[#0b0f19] border-r border-slate-800 transition-[width] duration-75 relative"
          >
            <CodeEditor
              code={code}
              onChange={setCode}
              currentLine={currentStep?.line}
              diagnostics={diagnostics}
              isExecuting={isPlaying}
            />
          </div>
        )}

        {/* Draggable Divider Handle with Expand Arrow Button */}
        {!isVisualizationExpanded && (
          <div
            onMouseDown={handleMouseDown}
            onDoubleClick={() => setSplitRatio(50)}
            className="w-2 hover:w-2.5 bg-slate-800 hover:bg-sky-500 active:bg-sky-400 transition-all cursor-col-resize flex items-center justify-center relative group z-20 select-none"
            title="Drag left/right to resize panels (Double-click to reset 50/50)"
          >
            <div className="h-8 w-1 bg-slate-600 group-hover:bg-white rounded-full transition-colors" />

            {/* Expand Arrow Button on Divider */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpandVisualization();
              }}
              className="absolute top-1/2 -translate-y-1/2 -left-3.5 w-7 h-12 bg-slate-900 hover:bg-sky-600 text-slate-400 hover:text-white rounded-lg border border-slate-700 hover:border-sky-400 shadow-xl flex items-center justify-center transition-all cursor-pointer opacity-90 hover:opacity-100 z-30"
              title="Click expand arrow to collapse code editor and view visualization full screen"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* When Visualization is Expanded: Restore Arrow Button on Left Border */}
        {isVisualizationExpanded && (
          <div className="absolute top-1/2 -translate-y-1/2 left-0 z-40">
            <button
              onClick={() => setIsVisualizationExpanded(false)}
              className="w-7 h-14 bg-slate-900/95 hover:bg-sky-600 text-slate-300 hover:text-white rounded-r-lg border-r border-y border-slate-700 hover:border-sky-400 shadow-2xl flex items-center justify-center transition-all cursor-pointer group"
              title="Click expand arrow to restore code editor (Split view)"
            >
              <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        )}

        {/* Right Panel: Visualization Canvas & Explanations (Expands to 100% when toggled) */}
        <div
          style={{ width: isVisualizationExpanded ? '100%' : `${100 - splitRatio}%` }}
          className="h-full flex flex-col transition-[width] duration-75 relative"
        >
          {/* Floating 'Show Code Editor' button when in 100% expanded mode */}
          {isVisualizationExpanded && (
            <button
              onClick={() => setIsVisualizationExpanded(false)}
              className="absolute top-2.5 left-10 z-30 flex items-center gap-1.5 px-3 py-1 bg-slate-900/95 hover:bg-slate-800 text-sky-400 text-xs font-semibold rounded-lg border border-sky-500/40 shadow-xl backdrop-blur transition-all"
              title="Show Code Editor (Restore Split View)"
            >
              <span>◀ Restore Code Editor</span>
            </button>
          )}

          <VisualizationContainer
            currentStep={currentStep}
            totalSteps={totalSteps}
            allSteps={traceResult?.steps || []}
            currentStepIndex={currentStepIndex}
            onSelectStep={(idx) => {
              setCurrentStepIndex(idx);
              if (traceResult?.steps[idx]) {
                setStdout(traceResult.steps[idx].stdout || '');
              }
            }}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            onRun={handleRunFull}
            onStepDebug={handleRunTrace}
            onJumpToFinal={handleLastStep}
            onJumpToStart={handleFirstStep}
            onNextStep={handleNextStep}
            onPrevStep={handlePrevStep}
            isExpanded={isVisualizationExpanded}
            onToggleExpand={toggleExpandVisualization}
            onSetSplitRatio={(ratio) => {
              setSplitRatio(ratio);
              setIsVisualizationExpanded(false);
            }}
          />
        </div>
      </div>

      {/* 4. Bottom Panel: Output, Clang Compiler Diagnostics & Leaks */}
      <BottomPanel
        stdout={stdout}
        stderr={stderr}
        diagnostics={diagnostics}
        summary={traceResult?.summary}
        stdin={stdin}
        onStdinChange={setStdin}
        onSendStdin={handleRunTrace}
        isExecuting={isTracing}
      />

      {/* 5. Modals */}
      <ProgramManagerModal
        isOpen={isProgramsModalOpen}
        onClose={() => setIsProgramsModalOpen(false)}
        programs={programs}
        currentProgramId={currentProgram?.id}
        onSelectProgram={handleSelectProgram}
        onCreateProgram={async (title, cat, desc) => {
          const created = await createProgram({
            title,
            category: cat,
            description: desc,
            code
          });
          setPrograms(prev => [...prev, created]);
          setCurrentProgram(created);
        }}
        onUpdateProgram={async (id, title, cat) => {
          const updated = await updateProgram(id, { title, category: cat });
          setPrograms(prev => prev.map(p => p.id === id ? updated : p));
        }}
        onDeleteProgram={async (id) => {
          await deleteProgram(id);
          setPrograms(prev => prev.filter(p => p.id !== id));
        }}
      />

      <AIAssistantModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        code={code}
        currentStep={currentStep}
        runtimeError={traceResult?.summary?.has_error ? stderr : undefined}
      />
    </div>
  );
};

export default App;
