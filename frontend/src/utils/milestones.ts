import { TraceStep } from '../types';

export interface MilestoneStage {
  id: string;
  stageNumber: number;
  stepIndex: number;
  label: string;
  chain: number[];
  code: string;
  description: string;
  stdoutSnippet?: string;
  isFinal?: boolean;
}

/**
 * Dynamically detects high-level programmatic milestones / stages
 * from execution steps (e.g. Stage 1: 10 -> NULL, Stage 2: 20 -> 10 -> NULL, Stage 3: 30 -> 20 -> 10 -> NULL).
 */
export function extractMilestones(steps: TraceStep[]): MilestoneStage[] {
  if (!steps || steps.length === 0) return [];

  const milestones: MilestoneStage[] = [];
  let lastChainKey = '';
  let stageCount = 1;

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const chain = (s.linked_list?.main_chain || []).map(n => n.data);
    const chainKey = chain.join('->');

    // Detect when a significant list state transition completes
    const isNewChain = chain.length > 0 && chainKey !== lastChainKey;
    const isEndOfOperation =
      s.func === 'main' ||
      (s.stdout_delta && s.stdout_delta.includes('\n')) ||
      (s.diff && s.diff.type === 'pointer_reassigned');

    if (isNewChain && (isEndOfOperation || i === steps.length - 1)) {
      lastChainKey = chainKey;
      milestones.push({
        id: `stage-${stageCount}`,
        stageNumber: stageCount,
        stepIndex: i,
        label: `${chain.join(' → ')} → NULL`,
        chain: chain,
        code: s.code,
        description: `Stage ${stageCount}: ${chain.join(' → ')} → NULL`,
        stdoutSnippet: s.stdout_delta?.trim() || ''
      });
      stageCount++;
    }
  }

  // Ensure Final Output step is always present as the last milestone
  const lastIdx = steps.length - 1;
  const lastStep = steps[lastIdx];
  const finalChain = (lastStep?.linked_list?.main_chain || []).map(n => n.data);
  const finalLabel = finalChain.length > 0 ? `${finalChain.join(' → ')} → NULL` : 'HEAD → NULL';

  const alreadyHasFinal = milestones.length > 0 && milestones[milestones.length - 1].stepIndex === lastIdx;

  if (!alreadyHasFinal) {
    milestones.push({
      id: 'final-output',
      stageNumber: stageCount,
      stepIndex: lastIdx,
      label: finalLabel,
      chain: finalChain,
      code: lastStep?.code || '',
      description: 'Final Output Visual Representation',
      stdoutSnippet: lastStep?.stdout?.trim() || '',
      isFinal: true
    });
  } else if (milestones.length > 0) {
    milestones[milestones.length - 1].isFinal = true;
  }

  return milestones;
}
