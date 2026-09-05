import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-casandra-approach',
  standalone: true,
  template: `
    <section class="approach-panel sci-panel" aria-label="Aproximación a la Tierra">
      <div class="panel-corners"></div>
      <header><span>VECTOR DE APROXIMACIÓN</span><b>NIVEL {{ level() }}/6</b></header>
      <div class="space-view">
        <div class="stars stars-a"></div><div class="stars stars-b"></div>
        <div class="trajectory"><i></i></div>
        <button class="argos-marker" type="button" aria-label="Arrastrar progreso de la Argos"
          [style.left.%]="8 + progress() * 65" (pointerdown)="startDrag($event)">
          <svg viewBox="0 0 130 60" aria-hidden="true"><path d="M4 31 37 20 57 5l13 18 51 8-51 8-13 17-20-15z"/><path d="m48 23 23 8-23 7"/></svg>
          <span>ARGOS</span>
        </button>
        <div class="earth"><div class="atmosphere"></div><div class="continents"></div></div>
        <div class="telemetry left"><span>TRAYECTORIA</span><b>Σ-09 / TIERRA</b></div>
        <div class="telemetry right"><span>VELOCIDAD REL.</span><b>{{ speedLabel() }}</b></div>
      </div>
      <div class="clock"><small>TIEMPO HASTA INTERCEPCIÓN</small><strong>{{ time() }}</strong></div>
      <div class="level-track" aria-label="Progreso de aproximación">
        @for (item of levels; track item) { <span [class.reached]="level() >= item"><i>{{ item }}</i></span> }
      </div>
    </section>
  `,
  styleUrl: './casandra-page.component.css'
})
export class ApproachDisplayComponent {
  readonly progress = input.required<number>();
  readonly level = input.required<number>();
  readonly time = input.required<string>();
  readonly progressChange = output<number>();
  readonly levels = [1, 2, 3, 4, 5, 6];

  speedLabel(): string { return `${Math.round(18420 + this.progress() * 31600).toLocaleString('es-ES')} KM/S`; }

  startDrag(event: PointerEvent): void {
    event.preventDefault();
    const panel = (event.currentTarget as HTMLElement).closest('.space-view') as HTMLElement;
    const move = (e: PointerEvent) => {
      const rect = panel.getBoundingClientRect();
      this.progressChange.emit(Math.min(1, Math.max(0, (e.clientX - rect.left - rect.width * .08) / (rect.width * .65))));
    };
    const stop = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', stop); move(event);
  }
}
