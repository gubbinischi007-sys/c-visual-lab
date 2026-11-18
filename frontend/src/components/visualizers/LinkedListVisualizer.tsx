import React from 'react';
import { LinkedListNode, Variable } from '../../types';
import { PointerArrow } from './PointerArrow';

interface LinkedListVisualizerProps {
  nodes: LinkedListNode[];
  listType: 'singly' | 'doubly' | 'circular';
  hasCycle: boolean;
  variables: Variable[];
  selectedAddress?: string | null;
  onSelectNode?: (address: string) => void;
}

export const LinkedListVisualizer: React.FC<LinkedListVisualizerProps> = ({
  nodes,
  listType,
  hasCycle,
  variables,
  selectedAddress,
  onSelectNode
}) => {
  // Find head pointer variable
  const headVar = variables.find(v => {
    const n = v.name.toLowerCase();
    return ['head', 'first', 'start', 'list', 'h', 'front', 'root', 'top', 'phead', 'hdr'].includes(n) && v.is_pointer;
  });

  // Categorize nodes strictly into Main Connected Chain, Staged (unattached), and Freed
  const mainChain = nodes.filter(n => n.is_main_list && !n.is_freed);
  const stagedNodes = nodes.filter(n => n.is_staged && !n.is_freed);
  const freedNodes = nodes.filter(n => n.is_freed);

  // Layout constants
  const isDoubly = listType === 'doubly';
  const NODE_WIDTH = isDoubly ? 230 : 190;
  const NODE_HEIGHT = 92;
  const NODE_GAP_X = 85;
  const START_X = 110;

  const hasStaged = stagedNodes.length > 0;
  const hasFreed = freedNodes.length > 0;

  const STAGED_Y = 65;
  const MAIN_Y = hasStaged ? 230 : 130;
  const FREED_Y = hasStaged ? (mainChain.length > 0 ? 390 : 230) : (mainChain.length > 0 ? 290 : 130);

  // Compute node positions map
  const nodePositions = new Map<string, { x: number; y: number }>();

  // 1. Position Staged Nodes in upper Work Area
  stagedNodes.forEach((node, idx) => {
    nodePositions.set(node.id, {
      x: START_X + idx * (NODE_WIDTH + NODE_GAP_X),
      y: STAGED_Y
    });
  });

  // 2. Position Main Chain Nodes in sequential order from HEAD to tail
  mainChain.forEach((node, idx) => {
    nodePositions.set(node.id, {
      x: START_X + idx * (NODE_WIDTH + NODE_GAP_X),
      y: MAIN_Y
    });
  });

  // 3. Position Freed Nodes in separate deallocated row
  freedNodes.forEach((node, idx) => {
    nodePositions.set(node.id, {
      x: START_X + idx * (NODE_WIDTH + NODE_GAP_X),
      y: FREED_Y
    });
  });

  // Canvas dimensions supporting smooth horizontal scrolling
  const maxNodesInRow = Math.max(mainChain.length, stagedNodes.length, freedNodes.length, 1);
  const totalWidth = Math.max(920, START_X + maxNodesInRow * (NODE_WIDTH + NODE_GAP_X) + 180);
  const totalHeight = hasStaged && hasFreed ? 520 : hasStaged || hasFreed ? 390 : 290;

  // Render completely empty state if no heap nodes exist
  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center select-none bg-slate-950">
        <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-8 max-w-md shadow-2xl flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-4 font-mono font-bold text-xl">
            HEAD
          </div>
          <div className="flex items-center gap-3 font-mono text-lg mb-4">
            <span className="text-sky-400 font-semibold">{headVar?.name || 'head'}</span>
            <span className="text-slate-500">───▶</span>
            <span className="px-3 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded font-bold">
              NULL (0x0)
            </span>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            The linked list is currently empty (<code className="text-sky-300">head == NULL</code>).
            When your C program executes <code className="text-emerald-300">malloc()</code>, nodes with separate <strong>DATA</strong> and <strong>LINK</strong> boxes will appear dynamically.
          </p>
        </div>
      </div>
    );
  }

  // Format memory addresses cleanly (e.g. "0x1058053b0" -> "...53b0" or full short address)
  const formatAddress = (addr: string | null | undefined): string => {
    if (!addr || addr === 'NULL' || addr === '0x0') return 'NULL';
    if (addr.length > 8) {
      return '...' + addr.slice(-4);
    }
    return addr;
  };

  return (
    <div className="relative w-full h-full overflow-auto bg-slate-950 p-4 select-none">
      {/* Top Status & Structure Legend Bar */}
      <div className="absolute top-3 left-4 z-10 flex items-center gap-3 bg-slate-900/95 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-lg text-xs shadow-md">
        <span className="text-slate-400">Structure:</span>
        <span className="font-semibold capitalize text-sky-400">{listType} Linked List</span>
        {hasCycle && (
          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full font-mono text-[10px] font-bold animate-pulse">
            Circular Cycle Detected
          </span>
        )}
        <span className="text-slate-600">|</span>
        <span className="text-slate-400">Connected: <strong className="text-emerald-400">{mainChain.length}</strong></span>
        {hasStaged && (
          <>
            <span className="text-slate-600">|</span>
            <span className="text-amber-400 font-medium">Staged (unattached): {stagedNodes.length}</span>
          </>
        )}
        {hasFreed && (
          <>
            <span className="text-slate-600">|</span>
            <span className="text-rose-400 font-medium">Freed: {freedNodes.length}</span>
          </>
        )}
      </div>

      <svg width={totalWidth} height={totalHeight} className="overflow-visible min-w-full">
        {/* Section 1 Header: Staged / Work Area (if any unattached node exists) */}
        {hasStaged && (
          <g transform={`translate(${START_X}, ${STAGED_Y - 26})`}>
            <rect x={-8} y={-14} width={310} height={20} rx={4} fill="#451a03" stroke="#b45309" strokeWidth="1" />
            <text x={4} y={0} fill="#fde68a" fontSize="10" fontWeight="bold" className="font-mono">
              ★ WORK AREA: Allocated Node (Not yet linked to HEAD)
            </text>
          </g>
        )}

        {/* Section 2 Header: Main Connected Chain */}
        <g transform={`translate(${START_X}, ${MAIN_Y - 26})`}>
          <rect x={-8} y={-14} width={270} height={20} rx={4} fill="#0c4a6e" stroke="#0284c7" strokeWidth="1" />
          <text x={4} y={0} fill="#bae6fd" fontSize="10" fontWeight="bold" className="font-mono">
            ● CONNECTED LIST (Reachable from HEAD)
          </text>
        </g>

        {/* Empty list indicator in Main Chain if HEAD is NULL */}
        {mainChain.length === 0 ? (
          <g transform={`translate(${START_X}, ${MAIN_Y})`}>
            {/* HEAD indicator badge */}
            <rect x={0} y={15} width={64} height={26} rx={6} fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" />
            <text x={32} y={32} fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle" className="font-mono">
              HEAD
            </text>
            <path d="M 64 28 L 115 28" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrowhead-38bdf8)" />
            {/* NULL Box */}
            <rect x={120} y={13} width={80} height={30} rx={6} fill="#1e293b" stroke="#f43f5e" strokeWidth="1.5" />
            <text x={160} y={32} fill="#fca5a5" fontSize="11" fontWeight="bold" textAnchor="middle" className="font-mono">
              NULL (0x0)
            </text>
          </g>
        ) : (
          /* Explicit HEAD indicator pointing to first node */
          <g transform={`translate(${START_X - 84}, ${MAIN_Y + 33})`}>
            <rect x={0} y={0} width={60} height={26} rx={6} fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" />
            <text x={30} y={17} fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle" className="font-mono">
              {headVar?.name || 'HEAD'}
            </text>
            <path d="M 60 13 L 80 13" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrowhead-38bdf8)" />
          </g>
        )}

        {/* Section 3 Header: Freed Nodes (if any deallocated node exists) */}
        {hasFreed && (
          <g transform={`translate(${START_X}, ${FREED_Y - 26})`}>
            <rect x={-8} y={-14} width={230} height={20} rx={4} fill="#450a0a" stroke="#dc2626" strokeWidth="1" />
            <text x={4} y={0} fill="#fca5a5" fontSize="10" fontWeight="bold" className="font-mono">
              ✖ DEALLOCATED (Freed with free())
            </text>
          </g>
        )}

        {/* --- Render Pointer Arrows (Directional & Exact) --- */}
        {nodes.map(node => {
          const currentPos = nodePositions.get(node.id);
          // Never draw outgoing arrows for freed nodes
          if (!currentPos || node.is_freed) return null;

          // Next pointer arrow
          if (node.next && node.next !== 'NULL') {
            const targetPos = nodePositions.get(node.next);
            if (targetPos) {
              const isBetweenRows = currentPos.y !== targetPos.y;
              // STRICT ACCURACY: A circular back-edge is ONLY drawn if hasCycle is TRUE!
              const isCircularBackEdge = hasCycle && targetPos.x <= currentPos.x && currentPos.y === targetPos.y;

              if (isCircularBackEdge) {
                // Curved cycle arrow looping back to head in circular list
                return (
                  <PointerArrow
                    key={`cycle-${node.id}`}
                    startX={currentPos.x + NODE_WIDTH}
                    startY={currentPos.y + 56}
                    endX={targetPos.x}
                    endY={targetPos.y + 56}
                    color="#f59e0b"
                    curved={true}
                    curvature={80}
                    label="next (cycle)"
                  />
                );
              } else if (isBetweenRows) {
                // Curved arrow connecting Staged node down to target in Main Chain
                return (
                  <PointerArrow
                    key={`down-${node.id}`}
                    startX={currentPos.x + NODE_WIDTH - 10}
                    startY={currentPos.y + 56}
                    endX={targetPos.x + 15}
                    endY={targetPos.y}
                    color="#38bdf8"
                    curved={true}
                    curvature={50}
                    label="next connects"
                  />
                );
              } else {
                // Standard horizontal directional arrow from LINK box to next node's left edge
                const startY = currentPos.y + 56;
                const endY = targetPos.y + 56;
                return (
                  <PointerArrow
                    key={`next-${node.id}`}
                    startX={currentPos.x + NODE_WIDTH - 6}
                    startY={startY}
                    endX={targetPos.x}
                    endY={endY}
                    color="#38bdf8"
                  />
                );
              }
            }
          } else if (node.next === 'NULL' && node.is_main_list) {
            // Arrow pointing to NULL box for terminal node in main chain
            const startY = currentPos.y + 56;
            const nullBoxX = currentPos.x + NODE_WIDTH + 32;
            return (
              <g key={`null-${node.id}`}>
                <PointerArrow
                  startX={currentPos.x + NODE_WIDTH - 6}
                  startY={startY}
                  endX={nullBoxX}
                  endY={startY}
                  color="#94a3b8"
                  dashed={true}
                />
                <rect
                  x={nullBoxX}
                  y={startY - 13}
                  width={46}
                  height={26}
                  rx={4}
                  fill="#1e293b"
                  stroke="#64748b"
                  strokeWidth="1.5"
                />
                <text
                  x={nullBoxX + 23}
                  y={startY + 4}
                  fill="#cbd5e1"
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                  className="font-mono"
                >
                  NULL
                </text>
              </g>
            );
          }

          // Prev pointer arrow for Doubly Linked List
          if (isDoubly && node.prev && node.prev !== 'NULL') {
            const prevPos = nodePositions.get(node.prev);
            if (prevPos) {
              return (
                <PointerArrow
                  key={`prev-${node.id}`}
                  startX={currentPos.x}
                  startY={currentPos.y + 68}
                  endX={prevPos.x + NODE_WIDTH - 10}
                  endY={prevPos.y + 68}
                  color="#a855f7"
                  label="prev"
                />
              );
            }
          }

          return null;
        })}

        {/* --- Render Node Cards: Header with Address + TWO SEPARATE BOXES (DATA & LINK) --- */}
        {nodes.map(node => {
          const pos = nodePositions.get(node.id);
          if (!pos) return null;

          const isSelected = selectedAddress === node.address;
          const isFreed = node.is_freed;
          const isStaged = node.is_staged;
          const highlightField = node.highlight_field;

          // Determine border & glow colors based on micro-step action
          const isDataHighlighted = highlightField === 'data';
          const isNextHighlighted = highlightField === 'next';
          const isAllocated = highlightField === 'alloc';
          const isBeingFreed = highlightField === 'free';

          let outerBorderColor = '#334155';
          if (isFreed) outerBorderColor = '#ef4444';
          else if (isBeingFreed) outerBorderColor = '#f43f5e';
          else if (isAllocated || isStaged) outerBorderColor = '#f59e0b';
          else if (isSelected) outerBorderColor = '#38bdf8';
          else if (node.is_head) outerBorderColor = '#0284c7';

          // Box dimensions inside card
          const dataBoxWidth = isDoubly ? 60 : 84;
          const linkBoxWidth = isDoubly ? 58 : 84;
          const prevBoxWidth = isDoubly ? 58 : 0;

          return (
            <g
              key={node.id}
              transform={`translate(${pos.x}, ${pos.y})`}
              className="cursor-pointer transition-all duration-300 hover:scale-[1.02]"
              onClick={() => onSelectNode?.(node.address)}
            >
              {/* Floating Pointer Badges above the node */}
              {node.pointers.length > 0 && (
                <g transform="translate(0, -32)">
                  {node.pointers.map((ptrName, pIdx) => {
                    const isHead = ['head', 'first', 'start', 'list', 'h', 'front', 'root', 'top', 'phead', 'hdr'].includes(ptrName.toLowerCase());
                    const isTail = ptrName.toLowerCase() === 'tail';
                    const isNewNode = ptrName.toLowerCase() === 'newnode';
                    const isCurr = ptrName.toLowerCase() === 'curr' || ptrName.toLowerCase() === 'temp';

                    let badgeFill = '#6366f1';
                    if (isHead) badgeFill = '#0284c7';
                    else if (isTail) badgeFill = '#059669';
                    else if (isNewNode) badgeFill = '#d97706';
                    else if (isCurr) badgeFill = '#9333ea';

                    return (
                      <g key={ptrName} transform={`translate(${pIdx * 54}, 0)`}>
                        <rect
                          width={50}
                          height={19}
                          rx={9.5}
                          fill={badgeFill}
                          className="shadow-lg animate-bounce"
                          style={{ animationDuration: '2.5s' }}
                        />
                        <text
                          x={25}
                          y={13}
                          fill="#ffffff"
                          fontSize="10"
                          fontWeight="bold"
                          textAnchor="middle"
                          className="font-mono"
                        >
                          {ptrName}
                        </text>
                        {/* Downward pointer arrow from badge into node header */}
                        <path
                          d="M 25 19 L 25 30"
                          stroke={badgeFill}
                          strokeWidth="2"
                        />
                      </g>
                    );
                  })}
                </g>
              )}

              {/* Node Card Outer Container */}
              <rect
                width={NODE_WIDTH}
                height={NODE_HEIGHT}
                rx={8}
                fill={isFreed ? '#1c1917' : isStaged ? '#1c1917' : isSelected ? '#1e293b' : '#0f172a'}
                stroke={outerBorderColor}
                strokeWidth={isAllocated || isDataHighlighted || isSelected ? '2.5' : '1.5'}
                strokeDasharray={isFreed ? '4,4' : isStaged ? '6,3' : 'none'}
                className="transition-colors duration-200"
              />

              {/* Header: Node Memory Address Banner (Requirement 1) */}
              <path
                d={`M 0 8 Q 0 0 8 0 L ${NODE_WIDTH - 8} 0 Q ${NODE_WIDTH} 0 ${NODE_WIDTH} 8 L ${NODE_WIDTH} 24 L 0 24 Z`}
                fill={isFreed ? '#450a0a' : isStaged ? '#451a03' : '#1e293b'}
              />
              <text
                x={NODE_WIDTH / 2}
                y={16}
                fill={isFreed ? '#fca5a5' : isStaged ? '#fde68a' : '#94a3b8'}
                fontSize="9.5"
                fontWeight="bold"
                textAnchor="middle"
                className="font-mono tracking-tight"
              >
                <title>{`Heap Memory Address: ${node.address}`}</title>
                {node.address} {isFreed ? '[FREED]' : isStaged ? '[UNATTACHED]' : ''}
              </text>

              {/* Optional PREV Box for Doubly Linked List */}
              {isDoubly && (
                <g transform="translate(6, 30)">
                  <rect
                    width={prevBoxWidth}
                    height={54}
                    rx={5}
                    fill="#020617"
                    stroke="#1e293b"
                    strokeWidth="1"
                  />
                  <text
                    x={prevBoxWidth / 2}
                    y={14}
                    fill="#a855f7"
                    fontSize="8.5"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    PREV
                  </text>
                  <text
                    x={prevBoxWidth / 2}
                    y={36}
                    fill={node.prev === 'NULL' ? '#f43f5e' : '#c084fc'}
                    fontSize="9.5"
                    fontWeight="bold"
                    textAnchor="middle"
                    className="font-mono"
                  >
                    <title>{`Previous Node: ${node.prev || 'NULL'}`}</title>
                    {formatAddress(node.prev)}
                  </text>
                </g>
              )}

              {/* FIRST BOX: DATA (Requirement 1) */}
              <g transform={`translate(${isDoubly ? 68 : 8}, 30)`}>
                <rect
                  width={dataBoxWidth}
                  height={54}
                  rx={5}
                  fill="#020617"
                  stroke={isDataHighlighted ? '#10b981' : '#1e293b'}
                  strokeWidth={isDataHighlighted ? '2.5' : '1.5'}
                  className={isDataHighlighted ? 'animate-pulse' : ''}
                />
                <text
                  x={dataBoxWidth / 2}
                  y={14}
                  fill={isDataHighlighted ? '#34d399' : '#64748b'}
                  fontSize="8.5"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  DATA
                </text>
                <text
                  x={dataBoxWidth / 2}
                  y={38}
                  fill={isDataHighlighted ? '#10b981' : '#ffffff'}
                  fontSize="17"
                  fontWeight="bold"
                  textAnchor="middle"
                  className="font-mono"
                >
                  {node.data}
                </text>
              </g>

              {/* SECOND BOX: LINK / NEXT (Requirement 1) */}
              <g transform={`translate(${isDoubly ? 134 : 96}, 30)`}>
                <rect
                  width={linkBoxWidth}
                  height={54}
                  rx={5}
                  fill="#030712"
                  stroke={isNextHighlighted ? '#38bdf8' : '#1e293b'}
                  strokeWidth={isNextHighlighted ? '2.5' : '1.5'}
                  className={isNextHighlighted ? 'animate-pulse' : ''}
                />
                <text
                  x={linkBoxWidth / 2}
                  y={14}
                  fill={isNextHighlighted ? '#38bdf8' : '#94a3b8'}
                  fontSize="8.5"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  LINK (next)
                </text>
                {/* Actual Pointer Address (or NULL) displayed prominently */}
                <text
                  x={linkBoxWidth / 2 - 3}
                  y={38}
                  fill={node.next === 'NULL' || !node.next ? '#f43f5e' : '#38bdf8'}
                  fontSize="11"
                  fontWeight="bold"
                  textAnchor="middle"
                  className="font-mono tracking-tight"
                >
                  <title>{`Next Pointer Address: ${node.next || 'NULL'}`}</title>
                  {formatAddress(node.next)}
                </text>
                {/* Pointer Arrow Anchor Dot */}
                <circle
                  cx={linkBoxWidth - 7}
                  cy={34}
                  r={3.5}
                  fill={node.next === 'NULL' || !node.next ? '#f43f5e' : '#38bdf8'}
                  className={isNextHighlighted ? 'animate-ping' : ''}
                />
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
