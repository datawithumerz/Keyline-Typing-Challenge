// One owner for animation frames. A generation token also rejects stale callbacks.
export class GameLoop {
  constructor(request = callback => requestAnimationFrame(callback), cancel = id => cancelAnimationFrame(id), now = () => performance.now()) {
    this.request = request;
    this.cancel = cancel;
    this.now = now;
    this.frameId = null;
    this.generation = 0;
  }
  start(step) {
    this.stop();
    const generation = this.generation;
    this.lastTime = this.now();
    this.step = step;
    const tick = time => {
      if (generation !== this.generation) return;
      this.frameId = null;
      this.advance(time);
      if (generation === this.generation) this.frameId = this.request(tick);
    };
    this.frameId = this.request(tick);
  }
  advance(time = this.now()) {
    if (!this.step) return;
    const seconds = Math.max(0, (time - this.lastTime) / 1000);
    this.lastTime = time;
    this.step(seconds);
  }
  stop() {
    if (this.frameId !== null) this.cancel(this.frameId);
    this.frameId = null;
    this.step = null;
    this.generation++;
  }
}
