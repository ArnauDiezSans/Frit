import { CommonModule } from '@angular/common';
import { Component, Input, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { MenuComponent } from '../../shared/menu/menu.component';
import { UsuarioOption } from '../juegos/juegos.models';
import { UsuariosService } from '../juegos/usuarios.service';
import { HallOfFame, HallOfFameEntry, HallOfFameService, MedalGame, MedalProgress, MedalUserProgress } from './hall-of-fame.service';

interface EntryRank {
  rankName: string;
  rankLevel: number;
  rankTargetValue: number;
  rankColor: string;
}

@Component({
  selector: 'app-hall-of-fame-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MenuComponent],
  templateUrl: './hall-of-fame-page.component.html',
  styleUrl: './hall-of-fame-page.component.css'
})
export class HallOfFamePageComponent {
  private authService = inject(AuthService);
  private hallOfFameService = inject(HallOfFameService);
  private usuariosService = inject(UsuariosService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  loading = signal(true);
  saving = signal(false);
  error = signal('');
  formError = signal('');
  modalOpen = signal(false);
  hallOfFame = signal<HallOfFame | null>(null);
  usuarios = signal<UsuarioOption[]>([]);
  selectedUsuarioIds = signal<number[]>([]);
  gameMedalFilter = signal('');
  gamesModalMedal = signal<MedalProgress | null>(null);
  @Input() embedded = false;

  form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(200)]],
    descripcion: ['', Validators.maxLength(800)],
    iconPath: ['/assets/medallas/default-medal.svg', Validators.maxLength(500)]
  });

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.loading.set(true);
    this.error.set('');

    this.hallOfFameService.getHallOfFame().subscribe({
      next: hallOfFame => {
        this.hallOfFame.set(hallOfFame);
        this.loading.set(false);
        if (hallOfFame.canManageManualMedals) {
          this.loadUsuarios();
        }
      },
      error: () => {
        this.error.set("No s'ha pogut carregar el Saló de la fama.");
        this.loading.set(false);
      }
    });
  }

  abrirModal(): void {
    this.form.reset({
      nombre: '',
      descripcion: '',
      iconPath: '/assets/medallas/default-medal.svg'
    });
    this.selectedUsuarioIds.set([]);
    this.formError.set('');
    this.modalOpen.set(true);
    this.loadUsuarios();
  }

  cerrarModal(): void {
    this.modalOpen.set(false);
    this.formError.set('');
  }

  toggleUsuario(usuarioId: number): void {
    this.selectedUsuarioIds.update(current =>
      current.includes(usuarioId)
        ? current.filter(id => id !== usuarioId)
        : [...current, usuarioId]
    );
  }

  crearMedallaManual(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set('Revisa els camps de la medalla.');
      return;
    }

    const raw = this.form.getRawValue();
    this.saving.set(true);
    this.formError.set('');

    this.hallOfFameService.createManualMedal({
      nombre: raw.nombre?.trim() ?? '',
      descripcion: raw.descripcion?.trim() ?? '',
      iconPath: raw.iconPath?.trim() || '/assets/medallas/default-medal.svg',
      usuarioIds: this.selectedUsuarioIds()
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.cerrarModal();
        this.cargarDatos();
      },
      error: error => {
        this.saving.set(false);
        this.formError.set(error?.error?.message ?? "No s'ha pogut crear la medalla.");
      }
    });
  }

  getFritEntries(): HallOfFameEntry[] {
    const entries = this.hallOfFame()?.entries.filter(entry => entry.medal.tipo !== 'GameWins') ?? [];

    if (!this.embedded) {
      return entries;
    }

    return [...entries].sort((left, right) =>
      left.users.length - right.users.length ||
      left.medal.nombre.localeCompare(right.medal.nombre)
    );
  }

  getGameEntries(): HallOfFameEntry[] {
    const filter = this.normalizeFilter(this.gameMedalFilter());
    const entries = this.hallOfFame()?.entries.filter(entry => entry.medal.tipo === 'GameWins') ?? [];

    if (!filter) {
      return entries;
    }

    return entries.filter(entry =>
      this.normalizeFilter(entry.medal.nombre).includes(filter) ||
      entry.users.some(user => this.normalizeFilter(user.usuarioNombre).includes(filter))
    );
  }

  onGameMedalFilterInput(value: string): void {
    this.gameMedalFilter.set(value);
  }

  openGamesModal(medal: MedalProgress): void {
    if (medal.games.length > 0) {
      this.gamesModalMedal.set(medal);
    }
  }

  closeGamesModal(): void {
    this.gamesModalMedal.set(null);
  }

  trackByMedalGame(_: number, game: MedalGame): number {
    return game.juegoId;
  }

  trackByEntry(_: number, entry: HallOfFameEntry): string {
    return entry.entryId;
  }

  trackByEntryUser(_: number, user: { usuarioId: number }): number {
    return user.usuarioId;
  }

  shouldShowRankTarget(entry: HallOfFameEntry): boolean {
    return entry.medal.tipo !== 'HeavyBggWins' &&
      entry.medal.tipo !== 'TotalPlays' &&
      entry.medal.rankTargetValue > 0;
  }

  getHallRankName(entry: HallOfFameEntry): string {
    return this.shouldShowRankTarget(entry) ? entry.bestUser.rankName : 'Llegenda';
  }

  getEntryRanks(entry: HallOfFameEntry): EntryRank[] {
    const ranksByLevel = new Map<number, EntryRank>();

    for (const user of entry.users) {
      if (!ranksByLevel.has(user.rankLevel)) {
        ranksByLevel.set(user.rankLevel, {
          rankName: user.rankName,
          rankLevel: user.rankLevel,
          rankTargetValue: user.rankTargetValue,
          rankColor: user.rankColor
        });
      }
    }

    return [...ranksByLevel.values()].sort((left, right) => right.rankLevel - left.rankLevel);
  }

  shouldShowUserRankValue(entry: HallOfFameEntry, user: MedalUserProgress): boolean {
    return entry.medal.tipo === 'RowingPoints' &&
      user.rankTargetValue > 0;
  }

  trackByUsuario(_: number, usuario: UsuarioOption): number {
    return usuario.usuarioId;
  }

  useDefaultMedalIcon(event: Event): void {
    const image = event.target as HTMLImageElement | null;

    if (image && !image.src.endsWith('/assets/medallas/default-medal.svg')) {
      image.src = '/assets/medallas/default-medal.svg';
    }
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: () => this.router.navigateByUrl('/login')
    });
  }

  private loadUsuarios(): void {
    if (this.usuarios().length > 0) {
      return;
    }

    this.usuariosService.getJugadores().subscribe({
      next: usuarios => this.usuarios.set(usuarios),
      error: () => this.usuarios.set([])
    });
  }

  private normalizeFilter(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }
}
