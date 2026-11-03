import { DIFFICULTIES, KEY_SETS, RULES, pick } from './config.js';

export class KeyMagnetGame {
  constructor(difficulty, keySet, random = Math.random) {
    this.config = DIFFICULTIES[difficulty];
    this.keys = KEY_SETS[keySet].keys;
    this.random = random;
    this.score = 0;
    this.correct = 0;
    this.incorrect = 0;
    this.elapsed = 0;
    this.targetStarted = 0;
    this.responseTimes = [];
    this.ended = false;
    this.target = pick(this.keys, this.random);
  }
  get remaining() { return Math.max(0, this.config.seconds - this.elapsed); }
  get averageResponse() { return this.responseTimes.length ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length : 0; }
  update(seconds) {
    if (this.ended) return;
    this.elapsed = Math.min(this.config.seconds, this.elapsed + seconds);
    if (this.remaining <= 0) this.ended = true;
  }
  input(letter) {
    if (this.ended) return null;
    if (letter !== this.target) {
      this.incorrect++;
      this.score = Math.max(0, this.score - RULES.wrongPenalty);
      return { correct: false, message: `Try ${this.target} · −5` };
    }
    this.responseTimes.push(this.elapsed - this.targetStarted);
    this.correct++;
    this.score += RULES.correctPoints;
    if (this.correct >= RULES.targetCount) this.ended = true;
    else {
      this.target = pick(this.keys.filter(key => key !== letter), this.random);
      this.targetStarted = this.elapsed;
    }
    return { correct: true, message: `${letter} matched · +10` };
  }
}
