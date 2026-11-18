import React from 'react';

interface PointerArrowProps {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color?: string;
  dashed?: boolean;
  label?: string;
  curved?: boolean;
  curvature?: number;
  bidirectional?: boolean;
}

export const PointerArrow: React.FC<PointerArrowProps> = ({
  startX,
  startY,
  endX,
  endY,
  color = '#38bdf8',
  dashed = false,
  label,
  curved = false,
  curvature = 40,
  bidirectional = false,
}) => {
  let pathD = '';

  if (curved) {
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2 - curvature;
    pathD = `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`;
  } else {
    pathD = `M ${startX} ${startY} L ${endX} ${endY}`;
  }

  const markerId = `arrowhead-${color.replace('#', '')}`;

  return (
    <g className="transition-all duration-300">
      <defs>
        <marker
          id={markerId}
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="4"
          orient="auto"
        >
          <polygon points="0 1, 8 4, 0 7" fill={color} />
        </marker>
        {bidirectional && (
          <marker
            id={`${markerId}-start`}
            markerWidth="8"
            markerHeight="8"
            refX="2"
            refY="4"
            orient="auto-start-reverse"
          >
            <polygon points="0 1, 8 4, 0 7" fill={color} />
          </marker>
        )}
      </defs>

      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeDasharray={dashed ? '5,5' : 'none'}
        markerEnd={`url(#${markerId})`}
        markerStart={bidirectional ? `url(#${markerId}-start)` : undefined}
        className="drop-shadow-sm"
      />

      {label && (
        <text
          x={(startX + endX) / 2}
          y={(startY + endY) / 2 - (curved ? curvature / 2 + 5 : 8)}
          fill={color}
          fontSize="11"
          fontWeight="600"
          textAnchor="middle"
          className="font-mono bg-slate-900 px-1 select-none"
        >
          {label}
        </text>
      )}
    </g>
  );
};
