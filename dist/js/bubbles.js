import { DIFFICULTIES, RULES, pick } from './config.js';

// Pure game model. Positions use percentages, so resizing never resets play.
export class BubblesGame {
  constructor(difficulty, random = Math.random) {
    this.config = DIFFICULTIES[difficulty];
    this.random = random;
    this.score = 0;
    this.correct = 0;
    this.incorrect = 0;
    this.misses = 0;
    this.elapsed = 0;
    this.ended = false;
    this.nextId = 0;
    this.bubbles = [];
    for (let i = 0; i < this.config.bubbleCount; i++) this.spawn(i, 20 + i * 9);
  }
  get level() { return 1 + Math.floor(this.correct / RULES.levelEvery); }
  get speed() { return this.config.bubbleSpeed * Math.min(3, 1 + (this.level - 1) * 0.15); }
  spawn(lane, y = 100) {
    const available = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].filter(letter => !this.bubbles.some(b => b.letter === letter));
    this.bubbles.push({ id: this.nextId++, letter: pick(available, this.random), lane, y });
  }
  update(seconds) {
    if (this.ended) return;
    this.elapsed += seconds;
    for (const bubble of [...this.bubbles]) {
      bubble.y -= this.speed * seconds;
      if (bubble.y <= 0) {
        this.bubbles = this.bubbles.filter(b => b.id !== bubble.id);
        this.misses++;
        if (this.misses >= RULES.missLimit) { this.ended = true; break; }
        this.spawn(bubble.lane);
      }
    }
  }
  input(letter) {
    if (this.ended) return null;
    const bubble = this.bubbles.find(b => b.letter === letter);
    if (bubble) {
      this.bubbles = this.bubbles.filter(b => b.id !== bubble.id);
      this.correct++;
      this.score += RULES.correctPoints;
      this.spawn(bubble.lane);
      return { correct: true, message: `${letter} popped · +10` };
    }
    this.incorrect++;
    this.score = Math.max(0, this.score - RULES.wrongPenalty);
    return { correct: false, message: `${letter} is not visible · −5` };
  }
}
