import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { MenuComponent } from '../../shared/menu/menu.component';
import { UsuarioOption } from '../juegos/juegos.models';
import { UsuariosService } from '../juegos/usuarios.service';
import { AQueJuguemRecommendation, AQueJuguemService } from './a-que-juguem.service';

@Component({
  selector: 'app-a-que-juguem-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MenuComponent],
  templateUrl: './a-que-juguem-page.component.html',
  styleUrl: './a-que-juguem-page.component.css'
})
export class AQueJuguemPageComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private usuariosService = inject(UsuariosService);
  private aQueJuguemService = inject(AQueJuguemService);
  private router = inject(Router);

  loading = signal(true);
  calculating = signal(false);
  error = signal('');
  formError = signal('');
  usuarios = signal<UsuarioOption[]>([]);
  recommendations = signal<AQueJuguemRecommendation[]>([]);
  filteredUsuarios = signal<UsuarioOption[]>([]);
  showUsuarioOptions = signal<number | null>(null);
  private calculationRequestId = 0;
  private lastRecommendationKey = '';

  form = this.fb.group({
    numeroJugadores: [0, [Validators.required, Validators.min(1)]],
    jugadores: this.fb.array([])
  });

  get jugadoresArray(): FormArray {
    return this.form.get('jugadores') as FormArray;
  }

  ngOnInit(): void {
    this.cargarUsuarios();
    this.ensureTrailingEmptyJugador();
  }

  cargarUsuarios(): void {
    this.loading.set(true);
    this.error.set('');

    this.usuariosService.getJugadores().subscribe({
      next: usuarios => {
        this.usuarios.set(usuarios);
        this.filteredUsuarios.set(usuarios);
        this.loading.set(false);
      },
      error: () => {
        this.error.set("No s'han pogut carregar els usuaris.");
        this.loading.set(false);
      }
    });
  }

  onUsuarioInput(index: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value ?? '';
    const group = this.jugadoresArray.at(index);
    const matchedUsuario = this.findExactUsuarioMatch(index, value);

    group.patchValue({
      usuarioId: matchedUsuario?.usuarioId ?? null,
      usuarioSearch: value
    });
    this.ensureTrailingEmptyJugador();
    this.showUsuarioOptions.set(index);
    this.filteredUsuarios.set(this.getUsuariosDisponibles(index, value));
    this.recalculateForCurrentPlayers();
  }

  onUsuarioFocus(index: number): void {
    const value = this.jugadoresArray.at(index).get('usuarioSearch')?.value ?? '';
    this.showUsuarioOptions.set(index);
    this.filteredUsuarios.set(this.getUsuariosDisponibles(index, value));
  }

  seleccionarUsuario(index: number, usuario: UsuarioOption): void {
    const group = this.jugadoresArray.at(index);
    group.patchValue({
      usuarioId: usuario.usuarioId,
      usuarioSearch: usuario.nombre
    });
    this.ensureTrailingEmptyJugador();
    this.showUsuarioOptions.set(null);
    this.recalculateForCurrentPlayers();
  }

  limpiarUsuario(index: number): void {
    const group = this.jugadoresArray.at(index);
    group.patchValue({
      usuarioId: null,
      usuarioSearch: ''
    });
    this.ensureTrailingEmptyJugador();
    this.showUsuarioOptions.set(null);
    this.recalculateForCurrentPlayers();
  }

  allPlayersSelected(): boolean {
    return this.getSelectedUsuarioIds().length > 0;
  }

  calcular(): void {
    const usuarioIds = this.getSelectedUsuarioIds();

    if (usuarioIds.length === 0) {
      this.form.controls.numeroJugadores.setValue(0);
      this.lastRecommendationKey = '';
      this.formError.set('');
      this.recommendations.set([]);
      return;
    }

    const numeroJugadores = usuarioIds.length;
    const recommendationKey = `${numeroJugadores}:${usuarioIds.join(',')}`;

    this.form.controls.numeroJugadores.setValue(numeroJugadores);

    if (recommendationKey === this.lastRecommendationKey) {
      return;
    }

    this.lastRecommendationKey = recommendationKey;
    const requestId = ++this.calculationRequestId;

    this.calculating.set(true);
    this.formError.set('');

    this.aQueJuguemService.getRecommendations(numeroJugadores, usuarioIds).subscribe({
      next: recommendations => {
        if (requestId !== this.calculationRequestId) {
          return;
        }

        this.recommendations.set(recommendations);
        this.calculating.set(false);
      },
      error: err => {
        if (requestId !== this.calculationRequestId) {
          return;
        }

        this.formError.set(err?.error?.message ?? "No s'han pogut calcular els jocs.");
        this.recommendations.set([]);
        this.calculating.set(false);
      }
    });
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: () => this.router.navigateByUrl('/login')
    });
  }

  trackByIndex(index: number): number {
    return index;
  }

  trackByJuegoId(_: number, juego: AQueJuguemRecommendation): number {
    return juego.juegoId;
  }

  trackByUsuarioId(_: number, usuario: UsuarioOption): number {
    return usuario.usuarioId;
  }

  private recalculateForCurrentPlayers(): void {
    this.calcular();
  }

  private ensureTrailingEmptyJugador(): void {
    for (let i = this.jugadoresArray.length - 1; i >= 0; i--) {
      if (this.isJugadorEmpty(i)) {
        this.jugadoresArray.removeAt(i);
      }
    }

    this.jugadoresArray.push(this.createJugadorGroup());
  }

  private createJugadorGroup() {
    return this.fb.group({
      usuarioId: [null as number | null],
      usuarioSearch: ['']
    });
  }

  private isJugadorEmpty(index: number): boolean {
    const control = this.jugadoresArray.at(index);
    const usuarioId = Number(control.get('usuarioId')?.value);
    const search = String(control.get('usuarioSearch')?.value ?? '').trim();

    return (!Number.isFinite(usuarioId) || usuarioId <= 0) && search.length === 0;
  }

  private getSelectedUsuarioIds(): number[] {
    return this.jugadoresArray.controls
      .map(control => Number(control.get('usuarioId')?.value))
      .filter(id => Number.isFinite(id) && id > 0);
  }

  private findExactUsuarioMatch(index: number, value: string): UsuarioOption | null {
    const normalized = value.trim().toLowerCase();

    if (!normalized) {
      return null;
    }

    return this.getUsuariosDisponibles(index, value).find(usuario =>
      usuario.nombre.toLowerCase() === normalized
    ) ?? null;
  }

  private getUsuariosDisponibles(index: number, filter: string): UsuarioOption[] {
    const selectedIds = this.jugadoresArray.controls
      .map((control, controlIndex) => controlIndex === index ? null : Number(control.get('usuarioId')?.value))
      .filter((id): id is number => id !== null && Number.isFinite(id) && id > 0);

    const normalized = filter.trim().toLowerCase();

    return this.usuarios().filter(usuario =>
      !selectedIds.includes(usuario.usuarioId) &&
      usuario.nombre.toLowerCase().includes(normalized)
    );
  }
}
