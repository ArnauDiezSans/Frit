import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { MenuComponent } from '../../shared/menu/menu.component';
import { UsuarioOption } from '../juegos/juegos.models';
import { UsuariosService } from '../juegos/usuarios.service';
import { HallOfFame, HallOfFameEntry, HallOfFameService } from './hall-of-fame.service';

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

  getProgressWidth(entry: HallOfFameEntry): string {
    const target = Math.max(entry.medal.targetValue, 1);
    return `${Math.min(100, Math.round((entry.bestUser.currentValue * 1000) / target) / 10)}%`;
  }

  trackByEntry(_: number, entry: HallOfFameEntry): string {
    return entry.medal.medalId;
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
}
