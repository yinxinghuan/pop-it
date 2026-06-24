import { useMemo, useState } from 'react';
import { openAigramProfile, isInAigram } from '@shared/runtime';
import { timeAgo, type GuestMessage } from '@shared/social/guestbook';
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
  /** Public notes on this board (wall ∪ my own, oldest-first). */
  thread: GuestMessage[];
  onPop: () => void;
  onSendNote: (text: string) => void;
  onBack: () => void;
}

export default function Detail({ ws, selfId, accent, hasPopped, thread, onPop, onSendNote, onBack }: Props) {
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

      <div className="pi-detail__scroll">
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

        {/* Public guestbook — text notes left on this board, SEPARATE from the
            pressed-cell pattern. Best-effort cross-user display + author ping. */}
        <div className="pi-notes">
          <div className="pi-notes__eyebrow">
            {t('notes')}{thread.length > 0 ? ` · ${thread.length}` : ''}
          </div>
          {thread.length > 0 ? (
            <ul className="pi-notes__list">
              {thread.map(m => (
                <NoteRow key={m.id} msg={m} selfId={selfId} accent={accent} />
              ))}
            </ul>
          ) : (
            <div className="pi-notes__empty">{t('notes_empty')}</div>
          )}
          {isInAigram ? (
            <Compose onSend={onSendNote} accent={accent} />
          ) : (
            <div className="pi-notes__empty">{t('notes_open')}</div>
          )}
        </div>
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

// One note: author chip (tappable → profile, self shows "you"), text, time.
// onClick + stopPropagation inside the scrollable region (scroll-vs-click).
function NoteRow({ msg, selfId, accent }: { msg: GuestMessage; selfId?: string; accent: string }) {
  const mine = !!msg.fromUserId && msg.fromUserId === selfId;
  const name = mine ? t('you') : (msg.userName || t('someone'));
  const initial = (msg.userName || '?').trim().charAt(0).toUpperCase();
  const tappable = !mine && !!msg.fromUserId && isInAigram;
  const head = (
    <span className="pi-note__head">
      {msg.userAvatarUrl ? (
        <img className="pi-note__av" src={msg.userAvatarUrl} alt="" draggable={false} />
      ) : (
        <span className="pi-note__av pi-note__av--initial">{initial}</span>
      )}
      <span
        className={`pi-note__name${mine ? ' pi-note__name--self' : ''}`}
        style={mine ? { color: accent } : undefined}
      >
        {name}
      </span>
      <span className="pi-note__time">{timeAgo(msg.ts, 'en')}</span>
    </span>
  );
  return (
    <li className="pi-note">
      {tappable ? (
        <button
          className="pi-note__chip"
          onClick={e => {
            e.stopPropagation();
            openAigramProfile(msg.fromUserId!);
          }}
        >
          {head}
        </button>
      ) : (
        head
      )}
      <p className="pi-note__text">{msg.text}</p>
    </li>
  );
}

// Compose box — controlled input + send; clicks don't bubble to the backdrop.
function Compose({ onSend, accent }: { onSend: (text: string) => void; accent: string }) {
  const [text, setText] = useState('');
  const submit = () => {
    const v = text.trim();
    if (!v) return;
    onSend(v);
    setText('');
  };
  return (
    <div className="pi-compose" onClick={e => e.stopPropagation()}>
      <input
        className="pi-compose__input"
        value={text}
        maxLength={140}
        placeholder={t('notes_placeholder')}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); }}
      />
      <button
        className="pi-compose__send"
        disabled={!text.trim()}
        onClick={submit}
        style={{ background: text.trim() ? accent : undefined }}
      >
        {t('send')}
      </button>
    </div>
  );
}
