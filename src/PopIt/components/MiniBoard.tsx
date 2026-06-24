import { useMemo } from 'react';
import type { Board } from '../types';
import { paletteById } from '../data/palettes';

interface Props {
  board: Board;
  /** Cells to render as freshly-popped (for the detail cascade animation). */
  poppingSet?: Set<number>;
  /** Optional per-cell stagger index map for the cascade. */
  staggerOf?: (idx: number) => number;
  className?: string;
}

// Pure DOM render of a pop-it board straight from data. Rows get rainbow
// colors from the palette; pressed cells render concave (inset, darker).
export default function MiniBoard({ board, poppingSet, staggerOf, className }: Props) {
  const pal = paletteById(board.paletteId);
  const pressed = useMemo(() => new Set(board.pressed), [board.pressed]);

  return (
    <div
      className={`pi-board ${className || ''}`}
      style={{
        background: pal.tray,
        ['--bath' as any]: pal.bath,
        gridTemplateColumns: `repeat(${board.cols}, 1fr)`,
      }}
    >
      {Array.from({ length: board.cols * board.rows }, (_, idx) => {
        const row = Math.floor(idx / board.cols);
        const color = pal.bubbles[row % pal.bubbles.length];
        const isPressed = pressed.has(idx);
        const popping = poppingSet?.has(idx);
        const delay = popping && staggerOf ? staggerOf(idx) : 0;
        return (
          <span
            key={idx}
            className={`pi-bub${isPressed ? ' pi-bub--in' : ''}${popping ? ' pi-bub--pop' : ''}`}
            style={{ ['--c' as any]: color, animationDelay: popping ? `${delay}ms` : undefined }}
          />
        );
      })}
    </div>
  );
}
