import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class RestTimer {
  readonly remaining = signal(0);
  readonly total = signal(0);
  readonly running = signal(false);
  private handle: ReturnType<typeof setInterval> | null = null;

  start(seconds: number) {
    if (seconds <= 0) {
      this.skip();
      return;
    }
    this.clearInterval();
    this.total.set(seconds);
    this.remaining.set(seconds);
    this.running.set(true);
    this.handle = setInterval(() => {
      const next = this.remaining() - 1;
      if (next <= 0) {
        this.skip();
        beep();
        return;
      }
      this.remaining.set(next);
    }, 1000);
  }

  add(seconds: number) {
    if (!this.running()) {
      return;
    }
    const next = this.remaining() + seconds;
    this.remaining.set(next);
    this.total.update((total) => Math.max(total, next));
  }

  skip() {
    this.clearInterval();
    this.running.set(false);
    this.remaining.set(0);
  }

  label(): string {
    const value = Math.max(0, this.remaining());
    const minutes = Math.floor(value / 60);
    const seconds = value % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  private clearInterval() {
    if (this.handle != null) {
      clearInterval(this.handle);
      this.handle = null;
    }
  }
}

function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
    window.setTimeout(() => ctx.close(), 400);
  } catch {
    return;
  }
}
