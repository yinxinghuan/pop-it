type Lang = 'zh' | 'en';

function detectLocale(): Lang {
  const override = localStorage.getItem('game_locale');
  if (override === 'en' || override === 'zh') return override;
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

const DICT: Record<Lang, Record<string, string>> = {
  en: {
    brand: 'POP · IT',
    hint_tap: 'TAP TO POP',
    clear: 'Clear',
    post: 'Post',
    posting: 'Posting…',
    wall: 'Wall',
    back: 'Studio',
    you: 'You',
    by: 'by',
    pop_back: 'Pop it back',
    popped: 'Popped',
    no_pop_yet: 'No pops yet — be the first.',
    wall_empty: 'The wall is empty.',
    wall_empty_sub: 'Press a shape and post the first one.',
    pop_count_one: '1 pop',
    pop_count_many: '{n} pops',
    poppers: 'Popped by',
    notify_pop: '{sender_name} popped your message.',
    notes: 'Notes',
    notes_empty: 'No notes yet — be the first.',
    notes_open: 'Open in AlterU to leave a note.',
    notes_placeholder: 'Leave a note…',
    send: 'Send',
    someone: 'someone',
    notify_note: '{sender_name} left a note on your board.',
  },
  zh: {
    brand: 'POP · IT',
    hint_tap: '点一下爆',
    clear: '清空',
    post: '发布',
    posting: '发布中…',
    wall: '留言墙',
    back: '工作台',
    you: '你',
    by: '作者',
    pop_back: '戳回去',
    popped: '已戳爆',
    no_pop_yet: '还没人戳 —— 来当第一个。',
    wall_empty: '墙上还空着。',
    wall_empty_sub: '按出一个图案，发布第一个。',
    pop_count_one: '1 次戳',
    pop_count_many: '{n} 次戳',
    poppers: '戳过的人',
    notify_pop: '{sender_name} 戳爆了你的留言。',
    notes: '留言',
    notes_empty: '还没有留言 —— 来当第一个。',
    notes_open: '在 AlterU 中打开即可留言。',
    notes_placeholder: '写句留言…',
    send: '发送',
    someone: '某人',
    notify_note: '{sender_name} 在你的留言板上留了言。',
  },
};

let lang = detectLocale();

export function t(key: string, vars?: { n?: number | string }): string {
  let s = DICT[lang][key] ?? DICT.en[key] ?? key;
  if (vars?.n !== undefined) s = s.replace('{n}', String(vars.n));
  return s;
}

export function popCount(n: number): string {
  return n === 1 ? t('pop_count_one') : t('pop_count_many', { n });
}
