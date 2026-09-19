import { Component, input } from '@angular/core';
import { formatKg, plateBand } from '../core/format';

@Component({
  selector: 'app-plate-face',
  template: `
    <div class="plate" [attr.data-band]="band()" role="img" [attr.aria-label]="formatKg(weightKg()) + ' kilograms'">
      <div class="metal">
        <div class="band"></div>
        <div class="hub">
          <span class="value">{{ formatKg(weightKg()) }}</span>
          <span class="unit">KG</span>
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      line-height: 0;
    }

    .plate {
      width: min(11.5rem, 42vw);
      aspect-ratio: 1;
      margin: 0 auto;
      border: 0;
      outline: none;
      box-shadow: none;
      background: transparent;
    }

    .metal {
      position: relative;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      overflow: hidden;
      background:
        radial-gradient(circle at 32% 28%, #3a3a42 0 18%, #222228 42%, #141416 100%);
      box-shadow: 0 16px 32px rgba(0, 0, 0, 0.4);
    }

    .band {
      position: absolute;
      inset: 11%;
      border-radius: 50%;
      border: 9px solid var(--band, #c8f247);
      background: radial-gradient(circle at 40% 35%, #2a2a32, #16161a 70%);
      box-sizing: border-box;
    }

    .hub {
      position: absolute;
      inset: 29%;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at 38% 32%, #3a3a42, #1c1c20 72%);
    }

    .value {
      font-family: var(--font-display);
      font-size: clamp(1.7rem, 8vw, 2.55rem);
      font-weight: 700;
      line-height: 0.9;
      color: var(--color-lime);
      letter-spacing: -0.03em;
    }

    .unit {
      margin-top: 0.2rem;
      font-family: var(--font-display);
      font-size: 0.8rem;
      letter-spacing: 0.22em;
      color: var(--color-mute);
      line-height: 1;
    }

    .plate[data-band='green'] { --band: #c8f247; }
    .plate[data-band='yellow'] { --band: #c9b6ff; }
    .plate[data-band='blue'] { --band: #c9b6ff; }
    .plate[data-band='red'] { --band: #f3b4d0; }
  `,
})
export class PlateFace {
  readonly weightKg = input(40);
  readonly band = () => plateBand(this.weightKg());
  readonly formatKg = formatKg;
}
