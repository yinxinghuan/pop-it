// Three pop-it silicone palettes. US-Gen-Z aesthetic per instant-play rules —
// no single culture frames the toy. Each defines the tray (frame + inner bath)
// plus a rainbow ramp of bubble colors. Crucially each palette uses a DIFFERENT
// `arrangement` so the three themes read as visually distinct toys, not the same
// rainbow grid: Cotton = horizontal rainbow by ROW, Macaron = DIAGONAL rainbow,
// Neon = concentric RINGS out from the center on a dark, glowy tray.
export type Arrangement = 'row' | 'diagonal' | 'ring';

export interface Palette {
  id: string;
  name: string; // English label shown on the theme chip
  tray: string; // outer silicone tray / frame color
  bath: string; // recessed inner background behind the bubbles
  bubbles: string[]; // color ramp, indexed via colorIndexFor()
  arrangement: Arrangement;
  dark?: boolean; // dark tray (neon) → triggers per-bubble glow styling
}

export const PALETTES: Palette[] = [
  {
    id: 'cotton',
    name: 'Cotton Candy',
    tray: '#ffe1ef',
    bath: '#ffd0e4',
    bubbles: ['#ff8fb8', '#ffb38a', '#ffe08a', '#a8e6a3', '#8fd3ff', '#c4a8ff'],
    arrangement: 'row',
  },
  {
    id: 'macaron',
    name: 'Macaron',
    tray: '#f3ece2',
    bath: '#e8ddcc',
    bubbles: ['#e7a6a0', '#e9c79b', '#d8e3a0', '#a9d8c2', '#a3c4e0', '#c3aed6'],
    arrangement: 'diagonal',
  },
  {
    id: 'neon',
    name: 'Neon Pop',
    tray: '#16121f',
    bath: '#0d0a16',
    bubbles: ['#ff4d8d', '#ff7a3d', '#ffe14d', '#3dffa6', '#3dd0ff', '#b14dff'],
    arrangement: 'ring',
    dark: true,
  },
];

export function paletteById(id: string): Palette {
  return PALETTES.find(p => p.id === id) ?? PALETTES[0];
}

// Which ramp color a cell gets, per the palette's arrangement. Used by BOTH the
// studio tray and MiniBoard so wall thumbnails match the live toy exactly.
export function colorIndexFor(
  arrangement: Arrangement,
  row: number,
  col: number,
  cols: number,
  rows: number,
): number {
  switch (arrangement) {
    case 'diagonal':
      return row + col;
    case 'ring': {
      // Chebyshev distance from the grid center → concentric square rings.
      const cr = (rows - 1) / 2;
      const cc = (cols - 1) / 2;
      return Math.round(Math.max(Math.abs(row - cr), Math.abs(col - cc)));
    }
    case 'row':
    default:
      return row;
  }
}
