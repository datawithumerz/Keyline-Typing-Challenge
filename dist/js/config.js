// Rules are kept in one place so every difficulty changes actual gameplay.
export const DIFFICULTIES = {
  easy: { label: 'Easy', bubbleSpeed: 8, bubbleCount: 5, seconds: 60 },
  medium: { label: 'Medium', bubbleSpeed: 12, bubbleCount: 6, seconds: 45 },
  hard: { label: 'Hard', bubbleSpeed: 17, bubbleCount: 7, seconds: 30 },
};
export const KEY_SETS = {
  home: { label: 'Home row', keys: ['A', 'S', 'D', 'F', 'J', 'K', 'L'] },
  alphabet: { label: 'All letters', keys: [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'] },
};
export const RULES = { correctPoints: 10, wrongPenalty: 5, missLimit: 6, targetCount: 30, levelEvery: 8 };
export const KEYBOARD_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
export const pick = (items, random = Math.random) => items[Math.min(items.length - 1, Math.floor(random() * items.length))];
