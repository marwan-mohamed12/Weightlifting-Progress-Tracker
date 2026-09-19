import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-line-chart',
  template: `
    <div>
      <p class="label-caps mb-2">{{ title() }}</p>
      @if (points().length < 2) {
        <p class="m-0 text-sm text-mute">Log more sessions to see this chart.</p>
      } @else {
        <svg viewBox="0 0 320 140" class="h-36 w-full" role="img" [attr.aria-label]="title()">
          <line x1="28" y1="12" x2="28" y2="118" stroke="currentColor" class="text-line" stroke-width="1" />
          <line x1="28" y1="118" x2="312" y2="118" stroke="currentColor" class="text-line" stroke-width="1" />
          <polyline
            fill="none"
            [attr.stroke]="color()"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
            [attr.points]="polyline()"
          />
          @for (point of points(); track $index) {
            <circle [attr.cx]="point.x" [attr.cy]="point.y" r="4" [attr.fill]="color()" />
          }
          <text x="28" y="10" class="fill-mute" font-size="10">{{ maxLabel() }}</text>
          <text x="28" y="136" class="fill-mute" font-size="10">{{ minLabel() }}</text>
        </svg>
      }
    </div>
  `,
})
export class LineChart {
  readonly title = input('');
  readonly values = input<number[]>([]);
  readonly color = input('#c8f247');

  readonly minLabel = computed(() => String(Math.round(this.bounds().min)));
  readonly maxLabel = computed(() => String(Math.round(this.bounds().max)));

  readonly points = computed(() => {
    const values = this.values();
    if (values.length === 0) {
      return [];
    }
    const { min, max } = this.bounds();
    const span = max - min || 1;
    return values.map((value, index) => ({
      x: 28 + (index * 284) / Math.max(values.length - 1, 1),
      y: 118 - ((value - min) / span) * 96,
    }));
  });

  readonly polyline = computed(() => this.points().map((point) => `${point.x},${point.y}`).join(' '));

  private bounds() {
    const values = this.values();
    if (values.length === 0) {
      return { min: 0, max: 1 };
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    return { min, max: max === min ? min + 1 : max };
  }
}
