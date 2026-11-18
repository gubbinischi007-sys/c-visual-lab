import React from 'react';
import { StepExplanation, StepDiff } from '../../types';
import { BookOpen, HelpCircle, HardDrive, Compass, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ExplanationPanelProps {
  explanation?: StepExplanation;
  diff?: StepDiff | null;
  code: string;
  line: number;
  stepIndex: number;
  totalSteps: number;
  error?: string;
}

export const ExplanationPanel: React.FC<ExplanationPanelProps> = ({
  explanation,
  diff,
  code,
  line,
  stepIndex,
  totalSteps,
  error
}) => {
  if (!explanation) return null;

  const whatText = explanation.what_is_happening || explanation.what_it_does || 'Executing statement in sequence.';
  const whyText = explanation.why_are_we_doing_this || explanation.why_it_matters || 'Sequential execution step in C program.';
  const memoryText = explanation.memory_changes || 'Stack and Heap memory unchanged.';
  const pointerText = explanation.pointer_changes || 'No pointer assignments on this step.';
  const beforeVal = explanation.before_value || diff?.before;
  const afterVal = explanation.after_value || diff?.after;

  return (
    <div className="bg-slate-900 border-t border-slate-800 p-3.5 shadow-xl select-none">
      {/* Header Bar */}
      <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg border ${
            error
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              : 'bg-sky-500/10 border-sky-500/30 text-sky-400'
          }`}>
            {error ? <AlertCircle className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-100 font-mono tracking-wide flex items-center gap-2">
              <span>{explanation.title || `Micro-Step ${stepIndex + 1} of ${totalSteps}`}</span>
              <span className="text-[10px] font-sans font-normal text-sky-400 bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.2 rounded">
                Line {line}
              </span>
            </h4>
          </div>
        </div>

        {/* Code Snippet Tag */}
        <div className="flex items-center gap-2">
          <code className="text-[11px] font-mono text-emerald-300 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 font-semibold max-w-[280px] truncate" title={code}>
            {code}
          </code>
        </div>
      </div>

      {/* 4-Box Teaching Grid (Requirement 5) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
        {/* 1. What is happening? */}
        <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-sky-400 font-semibold mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>What is happening?</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              {whatText}
            </p>
          </div>

          {/* Before -> After Diff Pill */}
          {beforeVal && afterVal && beforeVal !== afterVal && (
            <div className="mt-2 pt-1.5 border-t border-slate-900 flex items-center gap-1.5 text-[10px] font-mono">
              <span className="text-slate-500">Value:</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">{beforeVal}</span>
              <ArrowRight className="w-3 h-3 text-emerald-400" />
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">{afterVal}</span>
            </div>
          )}
        </div>

        {/* 2. Why are we doing this? */}
        <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
          <div className="flex items-center gap-1.5 text-amber-400 font-semibold mb-1">
            <HelpCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Why are we doing this?</span>
          </div>
          <p className="text-slate-300 leading-relaxed text-[11px]">
            {whyText}
          </p>
        </div>

        {/* 3. Memory Changes */}
        <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
          <div className="flex items-center gap-1.5 text-purple-400 font-semibold mb-1">
            <HardDrive className="w-3.5 h-3.5 shrink-0" />
            <span>Memory Changes</span>
          </div>
          <p className="text-slate-300 leading-relaxed text-[11px] font-mono">
            {memoryText}
          </p>
        </div>

        {/* 4. Pointer Changes */}
        <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-1">
            <Compass className="w-3.5 h-3.5 shrink-0" />
            <span>Pointer Changes</span>
          </div>
          <p className="text-slate-300 leading-relaxed text-[11px] font-mono">
            {pointerText}
          </p>
        </div>
      </div>
    </div>
  );
};
