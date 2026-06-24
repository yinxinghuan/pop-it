import type { WallBoard } from '../types';
import { t, popCount } from '../i18n';
import AuthorChip from './AuthorChip';
import MiniBoard from './MiniBoard';
import { BackIcon } from '../assets/icons';

interface Props {
  boards: WallBoard[];
  loaded: boolean;
  selfId: string;
  accent: string;
  onOpen: (id: string) => void;
  onBack: () => void;
}

export default function Wall({ boards, loaded, selfId, accent, onOpen, onBack }: Props) {
  return (
    <div className="pi-wall">
      <header className="pi-bar">
        <button className="pi-iconbtn" onClick={onBack} aria-label={t('back')}>
          <BackIcon />
        </button>
        <h2 className="pi-bar__title">{t('wall')}</h2>
        <span className="pi-iconbtn pi-iconbtn--ghost" />
      </header>

      <div className="pi-wall__scroll">
        {loaded && boards.length === 0 && (
          <div className="pi-empty">
            <div className="pi-empty__title">{t('wall_empty')}</div>
            <div className="pi-empty__sub">{t('wall_empty_sub')}</div>
          </div>
        )}
        <div className="pi-grid">
          {boards.map(wb => {
            const self = wb.authorId === selfId;
            const n = wb.poppers.length;
            return (
              <div key={wb.board.id} className="pi-card" onClick={() => onOpen(wb.board.id)}>
                <div className="pi-card__frame">
                  <MiniBoard board={wb.board} className="pi-board--mini" />
                  {n > 0 && (
                    <span className="pi-card__pops" style={{ borderColor: accent }}>
                      ✷ {n}
                    </span>
                  )}
                </div>
                <div className="pi-card__foot">
                  <AuthorChip
                    userId={wb.authorId}
                    name={wb.authorName}
                    avatar={wb.authorAvatar}
                    self={self}
                    selfLabel={t('you')}
                    accent={accent}
                  />
                  <span className="pi-card__count">{n > 0 ? popCount(n) : ''}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
