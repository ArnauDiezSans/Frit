import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-resonance-display', standalone: true,
  template: `
    <section class="sci-panel resonance-panel" [class.communion]="level() === 6">
      <div class="panel-corners"></div><header><span>RESONANCIA DEL PATRÓN</span><b>{{ level() }}/6</b></header>
      <div class="resonance-wrap" (click)="onBackground($event)">
        <svg class="resonance" viewBox="0 0 220 220" [attr.aria-label]="'Resonancia, ' + level() + ' de 6 sectores'">
          @for (path of paths; track $index) {
            <path [attr.d]="path" [class.active]="level() > $index" [class]="'sector s' + ($index + 1) + (level() > $index ? ' active' : '')" (click)="setSector($event, $index)"/>
          }
          <circle cx="110" cy="110" r="25" class="core"/><circle cx="110" cy="110" r="10" class="core-dot"/>
        </svg>
        <span class="pattern-code">Ψ · CASANDRA · {{ level().toString().padStart(2, '0') }}</span>
      </div>
      <div class="resonance-status"><strong>{{ label() }}</strong><span>CLIC + / SHIFT −</span></div>
    </section>
  `,
  styleUrl: './casandra-page.component.css'
})
export class ResonanceDisplayComponent {
  readonly level = input.required<number>(); readonly change = output<number>();
  readonly paths = Array.from({length: 6}, (_, i) => this.wedge(i));
  private wedge(i: number): string { const a=i*60-90,b=(i+1)*60-90,r=88,c=110; const p=(d:number)=>`${c+r*Math.cos(d*Math.PI/180)} ${c+r*Math.sin(d*Math.PI/180)}`; return `M ${c} ${c} L ${p(a)} A ${r} ${r} 0 0 1 ${p(b)} Z`; }
  onBackground(e: MouseEvent): void { if ((e.target as Element).tagName !== 'path') this.change.emit(e.shiftKey ? -1 : 1); }
  setSector(e: MouseEvent, index: number): void { e.stopPropagation(); this.change.emit(this.level() > index ? -(this.level()-index) : index+1-this.level()); }
  label(): string { return ['LATENTE','ECO DETECTADO','ACOPLAMIENTO','CONVERGENCIA','INTRUSIÓN','UMBRAL','COMUNIÓN'][this.level()]; }
}
