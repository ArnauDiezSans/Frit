import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApproachDisplayComponent } from './approach-display.component';
import { ShipIntegrityComponent } from './ship-integrity.component';
import { ResonanceDisplayComponent } from './resonance-display.component';
import { CASANDRA_STORAGE_KEY, CasandraState, DEFAULT_CASANDRA_STATE, SALVATIERRA_MESSAGES } from './casandra.models';
import { approximationLevel, clamp, crossedLevels, elapsedProgress, restoreState, tickRemaining } from './casandra-timer';

@Component({
  selector: 'app-casandra-page', standalone: true,
  imports: [CommonModule, FormsModule, ApproachDisplayComponent, ShipIntegrityComponent, ResonanceDisplayComponent],
  templateUrl: './casandra-page.component.html', styleUrl: './casandra-page.component.css'
})
export class CasandraPageComponent implements OnInit, OnDestroy {
  private readonly document = inject(DOCUMENT); private timer?: number;
  readonly state = signal<CasandraState>({...DEFAULT_CASANDRA_STATE}); readonly controlsVisible = signal(true); readonly alertLevel = signal<number|null>(null);
  totalInput = '01:30:00'; remainingInput = '01:30:00'; readonly messages = SALVATIERRA_MESSAGES;

  ngOnInit(): void { const restored=restoreState(localStorage.getItem(CASANDRA_STORAGE_KEY)); this.state.set(restored); this.syncInputs(); this.checkOfflineCrossings(); this.timer=window.setInterval(()=>this.tick(),200); }
  ngOnDestroy(): void { if(this.timer) clearInterval(this.timer); }
  progress(): number { const s=this.state(); return elapsedProgress(s.totalMs,s.remainingMs); }
  level(): number { const s=this.state(); return approximationLevel(s.totalMs,s.remainingMs); }
  time(): string { return this.formatTime(this.state().remainingMs); }
  toggleTimer(): void { this.state().running ? this.pause() : this.start(); }
  start(): void { if(this.alertLevel() || this.state().remainingMs<=0) return; this.update({running:true,lastStartedAt:Date.now()}); }
  pause(): void { this.tick(); this.update({running:false,lastStartedAt:null}); }
  resetTimer(): void { this.update({remainingMs:this.state().totalMs,running:false,lastStartedAt:null}); this.syncInputs(); }
  continueAlert(): void { this.alertLevel.set(null); this.start(); }
  dismissAlert(): void { this.alertLevel.set(null); }
  resetEvents(): void { this.update({shownEvents:[]}); }

  applyTimes(): void { const total=this.parseTime(this.totalInput); const remaining=this.parseTime(this.remainingInput); if(!total) return; this.update({totalMs:total,remainingMs:clamp(remaining,0,total),running:false,lastStartedAt:null}); this.syncInputs(); }
  setProgress(value:number):void { this.update({remainingMs:this.state().totalMs*(1-value),running:false,lastStartedAt:null}); this.syncInputs(); }
  adjustDamage(delta:number):void { const next=clamp(this.state().integrity+delta,0,7); if(next===7&&this.state().integrity<7&&!confirm('¿Confirmas la destrucción de la Argos?'))return; this.update({integrity:next}); if(delta>0)this.sound('damage'); if(next===7)this.sound('destroy'); }
  repair():void { this.update({integrity:0}); }
  adjustResonance(delta:number):void { const next=clamp(this.state().resonance+delta,0,6); this.update({resonance:next}); if(delta>0)this.sound('resonance'); }
  toggleMute():void { this.update({muted:!this.state().muted}); }
  setVolume(value:number):void { this.update({volume:value}); }
  toggleFullscreen():void { this.document.fullscreenElement ? this.document.exitFullscreen() : this.document.documentElement.requestFullscreen(); }
  resetSession():void { if(!confirm('¿Reiniciar por completo la sesión de Protocolo Casandra?'))return; this.state.set({...DEFAULT_CASANDRA_STATE});this.alertLevel.set(null);this.syncInputs();this.persist(); }

  @HostListener('document:keydown',['$event']) onKey(e:KeyboardEvent):void { const tag=(e.target as HTMLElement)?.tagName;if(['INPUT','TEXTAREA','SELECT'].includes(tag))return;if(e.key.toLowerCase()==='h'){this.controlsVisible.update(v=>!v);e.preventDefault();}else if(e.code==='Space'){this.toggleTimer();e.preventDefault();}else if(e.key==='Escape'&&this.alertLevel()){this.dismissAlert();} }
  private tick():void { const s=this.state();if(!s.running||!s.lastStartedAt)return;const now=Date.now(),next=tickRemaining(s.remainingMs,s.lastStartedAt,now),crossed=crossedLevels(s.totalMs,s.remainingMs,next).find(n=>!s.shownEvents.includes(n));if(crossed){this.state.set({...s,remainingMs:next,running:false,lastStartedAt:null,shownEvents:[...s.shownEvents,crossed]});this.alertLevel.set(crossed);this.sound('alert');}else{this.state.set({...s,remainingMs:next,running:next>0,lastStartedAt:next>0?now:null});}this.persist();}
  private checkOfflineCrossings():void { const s=this.state(), crossed=approximationLevel(s.totalMs,s.remainingMs); const pending=Array.from({length:crossed},(_,i)=>i+1).find(n=>!s.shownEvents.includes(n));if(pending){this.update({running:false,lastStartedAt:null,shownEvents:[...s.shownEvents,pending]});this.alertLevel.set(pending);} }
  private update(partial:Partial<CasandraState>):void { this.state.update(s=>({...s,...partial}));this.persist(); }
  private persist():void { localStorage.setItem(CASANDRA_STORAGE_KEY,JSON.stringify(this.state())); }
  private syncInputs():void { this.totalInput=this.formatTime(this.state().totalMs);this.remainingInput=this.formatTime(this.state().remainingMs); }
  private formatTime(ms:number):string { const sec=Math.ceil(ms/1000),h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60;return [h,m,s].map(v=>v.toString().padStart(2,'0')).join(':'); }
  private parseTime(value:string):number { const p=value.trim().split(':').map(Number);if(p.some(Number.isNaN))return 0;const [h,m,s]=p.length===3?p:[0,...p];return Math.max(0,(h*3600+m*60+s)*1000); }
  private sound(name:string):void { const s=this.state();if(s.muted)return;const audio=new Audio(`assets/casandra/sounds/${name}.mp3`);audio.volume=s.volume;audio.play().catch(()=>undefined); }
}
