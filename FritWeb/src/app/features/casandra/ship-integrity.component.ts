import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-ship-integrity', standalone: true,
  template: `
    <section class="sci-panel integrity-panel" [class.destroyed]="damage() === 7" [style.--damage]="damage()" (dblclick)="change.emit($event.shiftKey ? -1 : 1)">
      <div class="panel-corners"></div>
      <header><span>INTEGRIDAD ESTRUCTURAL</span><b>{{ 7 - damage() }}/7</b></header>
      <div class="ship-blueprint">
        <div class="scanline"></div>
        <svg viewBox="0 0 430 220" aria-label="Esquema técnico de la Argos">
          <g class="grid"><path d="M20 110h390M215 15v190"/><circle cx="215" cy="110" r="88"/></g>
          <g class="ship"><path d="M32 111 118 82l53-51 33 58 142 21-142 22-33 57-53-50z"/><path d="M118 82 205 89l-16 21 16 22-87 7M205 89l61 21-61 22M266 110h80"/><path d="m153 68 17-37m-17 121 17 37"/></g>
          <g class="damage"><path d="m168 76 18 18-13 14 28 18-17 24"/><path d="m238 94-13 13 20 13-16 21"/><path d="m112 103 18 9-11 20"/><path d="m283 105 14 9-18 14"/></g>
        </svg>
        <div class="failure-zone z1"></div><div class="failure-zone z2"></div><div class="failure-zone z3"></div>
      </div>
      <div class="integrity-status"><strong>{{ status() }}</strong><span>DAÑO {{ damage() }} · DOBLE CLIC + / SHIFT −</span></div>
      <div class="damage-bars">@for (bar of bars; track bar) { <i [class.on]="damage() >= bar"></i> }</div>
    </section>
  `,
  styleUrl: './casandra-page.component.css'
})
export class ShipIntegrityComponent {
  readonly damage = input.required<number>(); readonly change = output<number>(); readonly bars = [1,2,3,4,5,6,7];
  status(): string { return ['NOMINAL','DAÑO MENOR','DAÑO MENOR','COMPROMETIDA','COMPROMETIDA','CRÍTICA','CRÍTICA','ARGOS PERDIDA'][this.damage()]; }
}
