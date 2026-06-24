// Three pop-it silicone palettes. US-Gen-Z aesthetic per instant-play rules —
// no single culture frames the toy. Each defines the tray (frame + inner bath)
// plus a rainbow of bubble colors. Cells are colored by ROW so the tray reads
// as a rainbow. Pressed bubbles render as a darker, inset version of the color.
export interface Palette {
  id: string;
  name: string; // English label shown on the theme chip
  tray: string; // outer silicone tray / frame color
  bath: string; // recessed inner background behind the bubbles
  bubbles: string[]; // rainbow ramp, cycled by row
}

export const PALETTES: Palette[] = [
  {
    id: 'cotton',
    name: 'Cotton Candy',
    tray: '#ffe1ef',
    bath: '#ffd0e4',
    bubbles: ['#ff8fb8', '#ffb38a', '#ffe08a', '#a8e6a3', '#8fd3ff', '#c4a8ff'],
  },
  {
    id: 'macaron',
    name: 'Macaron',
    tray: '#f3ece2',
    bath: '#e8ddcc',
    bubbles: ['#e7a6a0', '#e9c79b', '#d8e3a0', '#a9d8c2', '#a3c4e0', '#c3aed6'],
  },
  {
    id: 'neon',
    name: 'Neon Pop',
    tray: '#16121f',
    bath: '#0d0a16',
    bubbles: ['#ff4d8d', '#ff7a3d', '#ffe14d', '#3dffa6', '#3dd0ff', '#b14dff'],
  },
];

export function paletteById(id: string): Palette {
  return PALETTES.find(p => p.id === id) ?? PALETTES[0];
}
