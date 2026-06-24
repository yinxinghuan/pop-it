import { useMemo, useState } from 'react';
import type { WallBoard } from '../types';
import { t, popCount } from '../i18n';
import AuthorChip from './AuthorChip';
import MiniBoard from './MiniBoard';
import { BackIcon } from '../assets/icons';

interface Props {
  ws: WallBoard;
  selfId: string;
  accent: string;
  hasPopped: boolean;
  onPop: () => void;
  onBack: () => void;
}

export default function Detail({ ws, selfId, accent, hasPopped, onPop, onBack }: Props) {
  const n = ws.poppers.length;
  const board = ws.board;
  // when the user pops it back, run a cascade across all pressed cells
  const [cascading, setCascading] = useState(false);

  // stagger by reading-order over the pressed cells (left→right, top→bottom)
  const staggerMap = useMemo(() => {
    const m = new Map<number, number>();
    const sorted = [...board.pressed].sort((a, b) => a - b);
    sorted.forEach((idx, i) => m.set(idx, i * 32));
    return m;
  }, [board.pressed]);

  const poppingSet = useMemo(() => new Set(board.pressed), [board.pressed]);

  function handlePop() {
    if (hasPopped || cascading) return;
    setCascading(true);
    onPop();
    // clear the cascade flag after the longest stagger + animation tail
    const total = board.pressed.length * 32 + 500;
    setTimeout(() => setCascading(false), total);
  }

  return (
    <div className="pi-detail">
      <header className="pi-bar">
        <button className="pi-iconbtn" onClick={onBack} aria-label={t('back')}>
          <BackIcon />
        </button>
        <h2 className="pi-bar__title">{n > 0 ? popCount(n) : t('popped')}</h2>
        <span className="pi-iconbtn pi-iconbtn--ghost" />
      </header>

      <div className="pi-detail__stage">
        <MiniBoard
          board={board}
          className="pi-board--big"
          poppingSet={cascading ? poppingSet : undefined}
          staggerOf={idx => staggerMap.get(idx) ?? 0}
        />
      </div>

      <div className="pi-detail__meta">
        <div className="pi-detail__by">
          <span className="pi-detail__bylabel">{t('by')}</span>
          <AuthorChip
            userId={ws.authorId}
            name={ws.authorName}
            avatar={ws.authorAvatar}
            self={ws.authorId === selfId}
            selfLabel={t('you')}
            accent={accent}
          />
        </div>

        {ws.poppers.length > 0 && (
          <div className="pi-poppers">
            <span className="pi-detail__bylabel">{t('poppers')}</span>
            <div className="pi-poppers__row">
              {ws.poppers.slice(0, 12).map((p, i) => (
                <AuthorChip
                  key={p.userId + i}
                  userId={p.userId}
                  name={p.name}
                  avatar={p.avatar}
                  self={p.userId === selfId}
                  selfLabel={t('you')}
                  accent={accent}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="pi-detail__cta">
        {hasPopped ? (
          <div className="pi-popped-tag" style={{ color: accent }}>
            <span className="pi-popped-mark" style={{ background: accent }}>✷</span>
            {t('popped')}
          </div>
        ) : (
          <button className="pi-pop-btn" onClick={handlePop} style={{ background: accent }}>
            {ws.poppers.length === 0 ? t('no_pop_yet') : t('pop_back')}
          </button>
        )}
      </div>
    </div>
  );
}
