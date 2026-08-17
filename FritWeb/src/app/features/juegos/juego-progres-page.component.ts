import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { MenuComponent } from '../../shared/menu/menu.component';
import { JuegoProgreso, JuegoProgresoNivel } from './juegos.models';
import { JuegosService } from './juegos.service';

@Component({
  selector: 'app-juego-progres-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MenuComponent],
  templateUrl: './juego-progres-page.component.html',
  styleUrl: './juego-progres-page.component.css'
})
export class JuegoProgresPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(JuegosService);
  private readonly auth = inject(AuthService);
  readonly gameId = Number(this.route.snapshot.paramMap.get('id'));
  progress = signal<JuegoProgreso | null>(null);
  loading = signal(true);
  saving = signal(false);
  error = signal('');
  visitorName = '';
  levelName = '';
  private marks = new Set<string>();

  constructor() { this.load(); }

  load(): void {
    this.loading.set(true); this.error.set('');
    this.service.getProgress(this.gameId).subscribe({
      next: progress => { this.progress.set(progress); this.marks = new Set(progress.marcas.map(mark => this.key(mark.juegoProgresoJugadorId, mark.juegoProgresoNivelId))); this.loading.set(false); },
      error: error => { this.error.set(error?.error?.message ?? "No s'ha pogut carregar el progrés."); this.loading.set(false); }
    });
  }

  isAchieved(playerId: number, levelId: number): boolean { return this.marks.has(this.key(playerId, levelId)); }

  toggleMark(playerId: number, levelId: number, achieved: boolean): void {
    const key = this.key(playerId, levelId); achieved ? this.marks.add(key) : this.marks.delete(key);
    this.service.setProgressMark(this.gameId, playerId, levelId, achieved).subscribe({ error: error => { achieved ? this.marks.delete(key) : this.marks.add(key); this.error.set(error?.error?.message ?? "No s'ha pogut desar la casella."); this.progress.update(value => value ? { ...value } : value); } });
  }

  addVisitor(): void {
    const name = this.visitorName.trim(); if (!name || this.saving()) return; this.saving.set(true);
    this.service.addProgressVisitor(this.gameId, name).subscribe({ next: player => { this.progress.update(value => value ? { ...value, jugadores: [...value.jugadores, player] } : value); this.visitorName = ''; this.saving.set(false); }, error: error => this.fail(error, "No s'ha pogut afegir la visita.") });
  }

  deleteVisitor(playerId: number, name: string): void {
    if (!confirm(`Eliminar ${name} d'aquest progrés?`)) return;
    this.service.deleteProgressVisitor(this.gameId, playerId).subscribe({ next: () => this.progress.update(value => value ? { ...value, jugadores: value.jugadores.filter(player => player.juegoProgresoJugadorId !== playerId) } : value), error: error => this.fail(error, "No s'ha pogut eliminar la visita.") });
  }

  addLevel(): void {
    const name = this.levelName.trim(); if (!name || this.saving()) return; this.saving.set(true);
    this.service.addProgressLevel(this.gameId, name).subscribe({ next: level => { this.progress.update(value => value ? { ...value, niveles: [...value.niveles, level] } : value); this.levelName = ''; this.saving.set(false); }, error: error => this.fail(error, "No s'ha pogut afegir el nivell.") });
  }

  renameLevel(level: JuegoProgresoNivel): void {
    const name = prompt('Nom del nivell o objectiu', level.nombre)?.trim(); if (!name || name === level.nombre) return;
    this.service.renameProgressLevel(this.gameId, level.juegoProgresoNivelId, name).subscribe({ next: updated => this.progress.update(value => value ? { ...value, niveles: value.niveles.map(item => item.juegoProgresoNivelId === updated.juegoProgresoNivelId ? updated : item) } : value), error: error => this.fail(error, "No s'ha pogut reanomenar el nivell.") });
  }

  deleteLevel(level: JuegoProgresoNivel): void {
    if (!confirm(`Eliminar «${level.nombre}» i totes les seves marques?`)) return;
    this.service.deleteProgressLevel(this.gameId, level.juegoProgresoNivelId).subscribe({ next: () => this.progress.update(value => value ? { ...value, niveles: value.niveles.filter(item => item.juegoProgresoNivelId !== level.juegoProgresoNivelId) } : value), error: error => this.fail(error, "No s'ha pogut eliminar el nivell.") });
  }

  moveLevel(index: number, direction: -1 | 1): void {
    const progress = this.progress(); if (!progress) return; const target = index + direction; if (target < 0 || target >= progress.niveles.length) return;
    const levels = [...progress.niveles]; [levels[index], levels[target]] = [levels[target], levels[index]]; this.progress.set({ ...progress, niveles: levels });
    this.service.reorderProgressLevels(this.gameId, levels.map(level => level.juegoProgresoNivelId)).subscribe({ error: error => { this.progress.set(progress); this.fail(error, "No s'ha pogut canviar l'ordre."); } });
  }

  back(): void { this.router.navigateByUrl('/app/juegos'); }
  logout(): void { this.auth.logout().subscribe(() => this.router.navigateByUrl('/login')); }
  trackPlayer(_: number, player: JuegoProgreso['jugadores'][number]): number { return player.juegoProgresoJugadorId; }
  trackLevel(_: number, level: JuegoProgresoNivel): number { return level.juegoProgresoNivelId; }
  private key(playerId: number, levelId: number): string { return `${playerId}:${levelId}`; }
  private fail(error: any, fallback: string): void { this.error.set(error?.error?.message ?? fallback); this.saving.set(false); }
}
