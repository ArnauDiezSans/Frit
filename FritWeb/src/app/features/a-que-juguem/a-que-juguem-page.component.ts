import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { MenuComponent } from '../../shared/menu/menu.component';
import { UsuarioOption } from '../juegos/juegos.models';
import { UsuariosService } from '../juegos/usuarios.service';
import { AQueJuguemRecommendation, AQueJuguemService } from './a-que-juguem.service';

type JugadorForm = {
  usuarioId: number | null;
  usuarioSearch: string;
};

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

  form = this.fb.group({
    numeroJugadores: [2, [Validators.required, Validators.min(1)]],
    jugadores: this.fb.array([])
  });

  get jugadoresArray(): FormArray {
    return this.form.get('jugadores') as FormArray;
  }

  ngOnInit(): void {
    this.cargarUsuarios();
    this.syncJugadoresWithNumero(2);
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

  onNumeroJugadoresChange(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);

    if (!Number.isFinite(value) || value < 1) {
      return;
    }

    this.form.controls.numeroJugadores.setValue(value);
    this.syncJugadoresWithNumero(value);
    this.recalculateIfReady();
  }

  onUsuarioInput(index: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value ?? '';
    const group = this.jugadoresArray.at(index);
    group.patchValue({
      usuarioId: null,
      usuarioSearch: value
    });
    this.showUsuarioOptions.set(index);
    this.filteredUsuarios.set(this.getUsuariosDisponibles(index, value));
    this.recommendations.set([]);
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
    this.showUsuarioOptions.set(null);
    this.recalculateIfReady();
  }

  limpiarUsuario(index: number): void {
    const group = this.jugadoresArray.at(index);
    group.patchValue({
      usuarioId: null,
      usuarioSearch: ''
    });
    this.showUsuarioOptions.set(null);
    this.recommendations.set([]);
  }

  allPlayersSelected(): boolean {
    return this.jugadoresArray.length > 0 &&
      this.jugadoresArray.controls.every(control => Number(control.get('usuarioId')?.value) > 0);
  }

  calcular(): void {
    if (!this.allPlayersSelected()) {
      this.formError.set('Selecciona tots els jugadors.');
      this.recommendations.set([]);
      return;
    }

    const raw = this.form.getRawValue() as {
      numeroJugadores: number | null;
      jugadores: JugadorForm[];
    };

    const usuarioIds = raw.jugadores.map(jugador => Number(jugador.usuarioId));
    const numeroJugadores = Number(raw.numeroJugadores ?? usuarioIds.length);

    this.calculating.set(true);
    this.formError.set('');

    this.aQueJuguemService.getRecommendations(numeroJugadores, usuarioIds).subscribe({
      next: recommendations => {
        this.recommendations.set(recommendations);
        this.calculating.set(false);
      },
      error: err => {
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

  private recalculateIfReady(): void {
    if (this.allPlayersSelected()) {
      this.calcular();
      return;
    }

    this.recommendations.set([]);
  }

  private syncJugadoresWithNumero(numero: number): void {
    while (this.jugadoresArray.length < numero) {
      this.jugadoresArray.push(
        this.fb.group({
          usuarioId: [null as number | null],
          usuarioSearch: ['', Validators.required]
        })
      );
    }

    while (this.jugadoresArray.length > numero) {
      this.jugadoresArray.removeAt(this.jugadoresArray.length - 1);
    }
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
