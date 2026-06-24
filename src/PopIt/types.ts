/** A posted pop-it board: a grid where some cells are pressed-in (concave). */
export interface Board {
  id: string;
  cols: number;
  rows: number;
  /** Sorted cell indices (row * cols + col) that are pressed-in. */
  pressed: number[];
  paletteId: string;
  createdAt: number;
}

/** One "pop" a user gave to a board (stored in the popper's own save). */
export interface PopRecord {
  boardId: string;
  authorId: string; // telegram_id of the board's author ('self' for local-only)
  at: number;
}

export interface PopSave {
  boards: Board[];
  pops: PopRecord[];
}

/** A board resolved for the wall, with author identity + aggregated poppers. */
export interface WallBoard {
  board: Board;
  authorId: string;
  authorName?: string;
  authorAvatar?: string;
  poppers: Popper[];
}

export interface Popper {
  userId: string;
  name?: string;
  avatar?: string;
}
