// Cross-user pop-it wall. Reads every recent player's saved Pop It data,
// flattens ALL their boards + ALL their pop records (never [0]), aggregates
// pops onto boards by boardId, resolves avatar+name for authors and poppers,
// and returns a flat WallBoard[]. Follows the social-wall flatten +
// profile-resolve pattern.

import { useCallback, useEffect, useState } from 'react';
import { callAigramAPI, isInAigram, type AigramResponse } from '@shared/runtime';
import { getGameUuid } from '@shared/runtime/game-id';
import { messagesByTarget, type GuestMessage } from '@shared/social/guestbook';
import type { PopSave, Popper, WallBoard } from '../types';

interface SaveRow {
  user_id: string;
  time: string;
  resource_data: string;
}
interface Profile {
  name?: string;
  head_url?: string;
}

export interface UseWall {
  boards: WallBoard[];
  /** Best-effort guestbook notes left on boards, keyed by board.id, authors
   *  stamped with their resolved profile (same read window as the wall). */
  messagesByTarget: Map<string, GuestMessage[]>;
  loaded: boolean;
  refresh: () => void;
}

export function useWall(): UseWall {
  const [boards, setBoards] = useState<WallBoard[]>([]);
  const [messages, setMessages] = useState<Map<string, GuestMessage[]>>(new Map());
  const [loaded, setLoaded] = useState(false);
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => setNonce(n => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    const sessionId = getGameUuid();
    if (!isInAigram || !sessionId) {
      setLoaded(true);
      return;
    }
    (async () => {
      try {
        const res = await callAigramAPI<AigramResponse<SaveRow[]>>(
          `/note/aigram/ai/game/get/data/list?session_id=${encodeURIComponent(sessionId)}`,
          'GET',
        );
        const rows = Array.isArray(res?.data) ? res.data : [];

        // 1. flatten every author's full board history + every popper's pops
        const boardMap = new Map<string, WallBoard>();
        const popsByBoard = new Map<string, string[]>(); // boardId -> popperIds
        for (const row of rows) {
          if (!row.user_id || !row.resource_data) continue;
          let save: PopSave;
          try {
            save = JSON.parse(row.resource_data) as PopSave;
          } catch {
            continue;
          }
          for (const b of save.boards || []) {
            if (b && b.id && Array.isArray(b.pressed) && !boardMap.has(b.id)) {
              boardMap.set(b.id, { board: b, authorId: row.user_id, poppers: [] });
            }
          }
          for (const p of save.pops || []) {
            if (!p || !p.boardId) continue;
            const list = popsByBoard.get(p.boardId) || [];
            list.push(row.user_id);
            popsByBoard.set(p.boardId, list);
          }
        }

        // 2. attach pops to boards
        for (const [boardId, list] of popsByBoard) {
          const wb = boardMap.get(boardId);
          if (!wb) continue;
          wb.poppers = list.map(id => ({ userId: id }));
        }

        // 3. newest first, display-cap
        const all = Array.from(boardMap.values()).sort(
          (a, b) => (b.board.createdAt ?? 0) - (a.board.createdAt ?? 0),
        );
        const limited = all.slice(0, 36);

        // 3b. guestbook notes left on boards (best-effort, SAME fetch — no
        //     second network call). A separate channel from the pressed-cell
        //     patterns: parsed out of each blob's `messages`, keyed by board.id.
        const msgs = messagesByTarget(rows);

        // 4. resolve profiles for every author + popper + note author surfaced
        const ids = new Set<string>();
        for (const wb of limited) {
          if (wb.authorId) ids.add(wb.authorId);
          for (const p of wb.poppers) if (p.userId) ids.add(p.userId);
        }
        for (const list of msgs.values()) {
          for (const m of list) if (m.fromUserId) ids.add(m.fromUserId);
        }
        const profEntries = await Promise.all(
          Array.from(ids).map(async uid => {
            try {
              const r = await callAigramAPI<AigramResponse<Profile>>(
                `/note/telegram/user/get/info/by/telegram_id?telegram_id=${encodeURIComponent(uid)}`,
                'GET',
              );
              return [uid, r?.data ?? null] as const;
            } catch {
              return [uid, null] as const;
            }
          }),
        );
        const profMap = new Map(profEntries);
        const resolved = limited.map(wb => {
          const ap = profMap.get(wb.authorId);
          const poppers: Popper[] = wb.poppers.map(p => {
            const pr = profMap.get(p.userId);
            return { ...p, name: pr?.name, avatar: pr?.head_url };
          });
          return {
            ...wb,
            authorName: ap?.name,
            authorAvatar: ap?.head_url,
            poppers,
          };
        });

        // stamp each note's author with their resolved profile
        const msgsWithProfiles = new Map<string, GuestMessage[]>();
        for (const [target, list] of msgs) {
          msgsWithProfiles.set(
            target,
            list.map(m => {
              const pr = m.fromUserId ? profMap.get(m.fromUserId) : null;
              return { ...m, userName: pr?.name, userAvatarUrl: pr?.head_url };
            }),
          );
        }

        if (!cancelled) {
          setBoards(resolved);
          setMessages(msgsWithProfiles);
        }
      } catch {
        if (!cancelled) { setBoards([]); setMessages(new Map()); }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  return { boards, messagesByTarget: messages, loaded, refresh };
}
