import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameEvent, telegramId } from '@shared/runtime';
import { useGameSave } from '@shared/save';
import { unlockAudio, playPopIn, playPopOut, playPost } from './utils/sounds';
import { PALETTES, colorIndexFor } from './data/palettes';
import { t } from './i18n';
import { useWall } from './hooks/useWall';
import { GhostFinger, WallIcon } from './assets/icons';
import Wall from './components/Wall';
import Detail from './components/Detail';
import type { PopSave, Board, PopRecord, WallBoard } from './types';
import './PopIt.less';

const COLS = 7;
const ROWS = 9;
const CELLS = COLS * ROWS;
const MIN_PRESSED_TO_POST = 3;

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// A small heart drawn on the 7×9 grid, used by the attract demo (centered).
// Indices computed for COLS=7, ROWS=9.
const DEMO_HEART: number[] = (() => {
  // rows of (col offsets) forming a chunky heart, row indices 1..6
  const map: Record<number, number[]> = {
    1: [1, 2, 4, 5],
    2: [0, 1, 2, 3, 4, 5, 6],
    3: [0, 1, 2, 3, 4, 5, 6],
    4: [1, 2, 3, 4, 5],
    5: [2, 3, 4],
    6: [3],
  };
  const out: number[] = [];
  for (const r of Object.keys(map)) {
    const row = Number(r);
    for (const c of map[row]) out.push(row * COLS + c);
  }
  return out;
})();

export default function PopIt() {
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const ghostLabelRef = useRef<HTMLSpanElement | null>(null);
  const trayRef = useRef<HTMLDivElement | null>(null);
  const interactedRef = useRef(false);

  const [paletteIdx, setPaletteIdx] = useState(0);
  const palette = PALETTES[paletteIdx];
  const [interacted, setInteracted] = useState(false);
  const [pressed, setPressed] = useState<Set<number>>(new Set());
  // demo-pressed cells are React state (never the real pattern). Driving them
  // through state — not direct classList — avoids racing React's reconciler.
  const [demoCells, setDemoCells] = useState<Set<number>>(new Set());
  const [posting, setPosting] = useState(false);
  const [screen, setScreen] = useState<'studio' | 'wall' | 'detail'>('studio');
  const [detailId, setDetailId] = useState<string | null>(null);

  // pop-burst particles: a tiny expanding ring + confetti dots per real pop,
  // anchored to the pressed cell, auto-removed (~420ms). Capped concurrent.
  const [bursts, setBursts] = useState<{ id: number; idx: number; color: string }[]>([]);
  const burstSeq = useRef(0);
  const MAX_BURSTS = 8;
  function spawnBurst(idx: number, color: string) {
    const id = ++burstSeq.current;
    setBursts(prev => {
      const next = [...prev, { id, idx, color }];
      return next.length > MAX_BURSTS ? next.slice(next.length - MAX_BURSTS) : next;
    });
    window.setTimeout(() => {
      setBursts(prev => prev.filter(b => b.id !== id));
    }, 460);
  }

  const { savedData, loaded, persist } = useGameSave<PopSave>('pop-it');
  const [myBoards, setMyBoards] = useState<Board[]>([]);
  const [myPops, setMyPops] = useState<PopRecord[]>([]);
  const seeded = useRef(false);

  const events = useGameEvent();
  const wall = useWall();

  const selfId = telegramId ? String(telegramId) : 'self';

  // ── seed local mirror once (useGameSave-mirror rule) ───────────────────────
  useEffect(() => {
    if (!loaded || seeded.current) return;
    seeded.current = true;
    if (savedData) {
      setMyBoards(savedData.boards || []);
      setMyPops(savedData.pops || []);
    }
  }, [loaded, savedData]);

  // ── attract demo: ghost finger presses a heart into the tray, then clears ──
  // bounded + looping, stops permanently on first real pointerdown.
  useEffect(() => {
    if (interacted || screen !== 'studio') return;
    let raf = 0;
    const start = performance.now();
    let lastLocal = -1;
    const CYCLE = 6.2; // seconds
    // press one heart cell every PRESS_STEP seconds, in reading order
    const order = [...DEMO_HEART];
    const PRESS_WINDOW = 4.0; // press all cells within first 4s
    const step = PRESS_WINDOW / order.length;
    const cur = new Set<number>();

    const ghostTo = (idx: number) => {
      const tray = trayRef.current;
      if (!tray || !ghostRef.current) return;
      // query bubbles directly — the tray also holds sheen/burst overlay nodes,
      // so positional child index would be off.
      const el = tray.querySelectorAll('.pi-bub')[idx] as HTMLElement | undefined;
      if (!el) return;
      const trayRect = tray.getBoundingClientRect();
      const cellRect = el.getBoundingClientRect();
      const x = cellRect.left - trayRect.left + cellRect.width / 2;
      const y = cellRect.top - trayRect.top + cellRect.height / 2;
      ghostRef.current.style.transform = `translate(${x}px, ${y}px)`;
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (interactedRef.current) return;
      const local = ((now - start) / 1000) % CYCLE;
      // loop boundary → clear demo cells
      if (local < lastLocal) {
        cur.clear();
        setDemoCells(new Set());
      }
      if (local < PRESS_WINDOW) {
        const shouldHave = Math.min(order.length, Math.floor(local / step) + 1);
        if (cur.size < shouldHave) {
          for (let k = cur.size; k < shouldHave; k++) cur.add(order[k]);
          setDemoCells(new Set(cur));
        }
        ghostTo(order[Math.min(order.length - 1, Math.floor(local / step))]);
      } else {
        // hold the finished heart, finger rests on its last cell
        ghostTo(order[order.length - 1]);
      }
      if (ghostLabelRef.current && ghostLabelRef.current.textContent !== t('hint_tap')) {
        ghostLabelRef.current.textContent = t('hint_tap');
      }
      lastLocal = local;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      setDemoCells(new Set());
    };
  }, [interacted, screen, palette]);

  function firstInteract() {
    if (interactedRef.current) return;
    interactedRef.current = true;
    setInteracted(true);
  }

  // ── studio: tap a bubble toggles it pressed/unpressed ──────────────────────
  function pressCell(idx: number) {
    unlockAudio();
    firstInteract();
    setPressed(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
        playPopOut(0.92 + (idx % 5) * 0.04);
      } else {
        next.add(idx);
        playPopIn(0.9 + (idx % 7) * 0.05);
        const row = Math.floor(idx / COLS);
        const col = idx % COLS;
        const ci = colorIndexFor(palette.arrangement, row, col, COLS, ROWS);
        spawnBurst(idx, palette.bubbles[ci % palette.bubbles.length]);
      }
      return next;
    });
  }

  function clearAll() {
    if (pressed.size === 0) return;
    unlockAudio();
    playPopOut(0.8);
    setPressed(new Set());
  }

  function post() {
    if (pressed.size < MIN_PRESSED_TO_POST || posting) return;
    unlockAudio();
    setPosting(true);
    playPost();
    try {
      const board: Board = {
        id: uid(),
        cols: COLS,
        rows: ROWS,
        pressed: [...pressed].sort((a, b) => a - b),
        paletteId: palette.id,
        createdAt: Date.now(),
      };
      const next = [board, ...myBoards].slice(0, 20);
      setMyBoards(next);
      persist({ boards: next, pops: myPops });
      wall.refresh();
      setPressed(new Set());
      setScreen('wall');
    } finally {
      setPosting(false);
    }
  }

  // ── pop it back ────────────────────────────────────────────────────────────
  function popBoard(wb: WallBoard) {
    if (myPops.some(p => p.boardId === wb.board.id)) return;
    unlockAudio();
    // cascade sound: stagger playPopIn across the pressed cells (capped voices)
    const cells = wb.board.pressed;
    cells.forEach((c, i) => {
      setTimeout(() => playPopIn(0.9 + (c % 7) * 0.05), i * 34);
    });
    const rec: PopRecord = { boardId: wb.board.id, authorId: wb.authorId, at: Date.now() };
    const next = [rec, ...myPops].slice(0, 300);
    setMyPops(next);
    persist({ boards: myBoards, pops: next });

    // notify the author — board is DOM-rendered, so OMIT the image field.
    if (wb.authorId && wb.authorId !== selfId && wb.authorId !== 'self') {
      events.trigger(`pop:${wb.board.id}`, {
        actions: [
          {
            type: 'notify',
            target_user_id: wb.authorId,
            message: { template: t('notify_pop'), variables: ['sender_name'] },
          },
        ],
      });
    }
  }

  // ── merged wall (optimistic own boards + own pops) ─────────────────────────
  const wallBoards = useMemo<WallBoard[]>(() => {
    const cloud = wall.boards;
    const cloudIds = new Set(cloud.map(w => w.board.id));
    const mineExtra: WallBoard[] = myBoards
      .filter(b => !cloudIds.has(b.id))
      .map(b => ({ board: b, authorId: selfId, authorName: t('you'), poppers: [] }));
    let merged = [...mineExtra, ...cloud];
    merged = merged.map(wb => {
      const mine = myPops.find(pr => pr.boardId === wb.board.id);
      if (mine && !wb.poppers.some(p => p.userId === selfId)) {
        return { ...wb, poppers: [...wb.poppers, { userId: selfId, name: t('you') }] };
      }
      return wb;
    });
    merged.sort((a, b) => (b.board.createdAt ?? 0) - (a.board.createdAt ?? 0));
    return merged.slice(0, 36);
  }, [wall.boards, myBoards, myPops, selfId]);

  const detailWs = detailId ? wallBoards.find(w => w.board.id === detailId) ?? null : null;

  // bounce back if the opened board vanished from the merged list
  useEffect(() => {
    if (screen === 'detail' && !detailWs) setScreen('wall');
  }, [screen, detailWs]);

  const canPost = pressed.size >= MIN_PRESSED_TO_POST;

  return (
    <div className="pi-root" style={{ background: palette.tray }}>
      {/* ── Studio ── */}
      <div className={`pi-studio ${screen === 'studio' ? '' : 'pi-hidden'}`}>
        <header className="pi-top">
          <button
            className="pi-top__wall"
            onClick={() => {
              wall.refresh();
              setScreen('wall');
            }}
          >
            <WallIcon />
            {t('wall')}
          </button>
          <button
            className="pi-top__theme"
            style={{ borderColor: palette.bubbles[0] }}
            onClick={() => setPaletteIdx((paletteIdx + 1) % PALETTES.length)}
          >
            <span className="pi-swatch" style={{ background: palette.bubbles[0] }} />
            <span className="pi-swatch" style={{ background: palette.bubbles[3] }} />
            {palette.name}
          </button>
        </header>

        <div className="pi-stage">
          {/* background life — slow drifting blurred bokeh blobs, theme-tinted,
              bounded looping @keyframes, behind the tray, no pointer events */}
          <div className="pi-bokeh" aria-hidden>
            <span className="pi-bokeh__b pi-bokeh__b--1" style={{ background: palette.bubbles[4] }} />
            <span className="pi-bokeh__b pi-bokeh__b--2" style={{ background: palette.bubbles[0] }} />
            <span className="pi-bokeh__b pi-bokeh__b--3" style={{ background: palette.bubbles[2] }} />
          </div>

          <div
            className={`pi-board pi-board--play${palette.dark ? ' pi-board--dark' : ''}`}
            ref={trayRef}
            style={{
              background: palette.tray,
              ['--bath' as any]: palette.bath,
              gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            }}
          >
            {/* idle specular sweep traveling across the tray surface, looping */}
            <span className="pi-sheen" aria-hidden />

            {Array.from({ length: CELLS }, (_, idx) => {
              const row = Math.floor(idx / COLS);
              const col = idx % COLS;
              const ci = colorIndexFor(palette.arrangement, row, col, COLS, ROWS);
              const color = palette.bubbles[ci % palette.bubbles.length];
              const on = interacted ? pressed.has(idx) : demoCells.has(idx);
              return (
                <span
                  key={idx}
                  className={`pi-bub${on ? ' pi-bub--in' : ''}`}
                  style={{ ['--c' as any]: color }}
                  onPointerDown={e => {
                    e.preventDefault();
                    pressCell(idx);
                  }}
                />
              );
            })}

            {/* pop-burst particles, anchored into the same grid cell */}
            {bursts.map(b => (
              <span
                key={b.id}
                className="pi-burst"
                aria-hidden
                style={{
                  gridColumn: (b.idx % COLS) + 1,
                  gridRow: Math.floor(b.idx / COLS) + 1,
                  ['--c' as any]: b.color,
                }}
              >
                <span className="pi-burst__ring" />
                <i className="pi-burst__dot pi-burst__dot--1" />
                <i className="pi-burst__dot pi-burst__dot--2" />
                <i className="pi-burst__dot pi-burst__dot--3" />
                <i className="pi-burst__dot pi-burst__dot--4" />
              </span>
            ))}

            {!interacted && (
              <div className="pi-ghost" ref={ghostRef}>
                <GhostFinger size={58} />
                <span className="pi-ghost__label" ref={ghostLabelRef}>
                  {t('hint_tap')}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="pi-bottom">
          <div className="pi-brand">{t('brand')}</div>
          <div className="pi-actions">
            <button className="pi-pill" onClick={clearAll} disabled={pressed.size === 0}>
              {t('clear')}
            </button>
            <button
              className="pi-pill pi-pill--go"
              onClick={post}
              disabled={!canPost || posting}
              style={{ background: canPost && !posting ? palette.bubbles[0] : undefined }}
            >
              {posting ? t('posting') : t('post')}
            </button>
          </div>
        </div>
      </div>

      {/* ── Wall ── */}
      {screen === 'wall' && (
        <Wall
          boards={wallBoards}
          loaded={wall.loaded || myBoards.length > 0}
          selfId={selfId}
          accent={palette.bubbles[0]}
          onOpen={id => {
            setDetailId(id);
            setScreen('detail');
          }}
          onBack={() => setScreen('studio')}
        />
      )}

      {/* ── Detail ── */}
      {screen === 'detail' && detailWs && (
        <Detail
          ws={detailWs}
          selfId={selfId}
          accent={palette.bubbles[0]}
          hasPopped={myPops.some(p => p.boardId === detailWs.board.id)}
          onPop={() => popBoard(detailWs)}
          onBack={() => setScreen('wall')}
        />
      )}
    </div>
  );
}
