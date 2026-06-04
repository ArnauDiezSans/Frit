import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { UsuarioDetalle, UsuarioJuegoOrden, UsuarioService } from './usuario.service';

@Component({
  selector: 'app-usuario-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './usuario-page.component.html',
  styleUrl: './usuario-page.component.css'
})
export class UsuarioPageComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private usuarioService = inject(UsuarioService);
  private router = inject(Router);

  loading = signal(true);
  saving = signal(false);
  savingOrder = signal(false);
  error = signal('');
  formError = signal('');
  orderError = signal('');
  success = signal('');
  modalOpen = signal(false);

  usuario = signal<UsuarioDetalle | null>(null);
  juegosOrdenados = signal<UsuarioJuegoOrden[]>([]);

  passwordForm = this.fb.group(
    {
      oldPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.maxLength(24)]],
      confirmPassword: ['', [Validators.required, Validators.maxLength(24)]]
    },
    {
      validators: control => {
        const newPassword = control.get('newPassword')?.value;
        const confirmPassword = control.get('confirmPassword')?.value;
        return newPassword === confirmPassword ? null : { passwordMismatch: true };
      }
    }
  );

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    const currentUser = this.authService.currentUser;

    if (!currentUser) {
      this.router.navigateByUrl('/login');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    forkJoin({
      usuario: this.usuarioService.getById(currentUser.usuarioId),
      juegos: this.usuarioService.getJuegosOrden(currentUser.usuarioId)
    }).subscribe({
      next: result => {
        this.usuario.set(result.usuario);
        this.juegosOrdenados.set(result.juegos);
        this.loading.set(false);
      },
      error: () => {
        this.error.set("No s'han pogut carregar les dades de l'usuari.");
        this.loading.set(false);
      }
    });
  }

  abrirModalPassword(): void {
    this.passwordForm.reset({
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    this.formError.set('');
    this.success.set('');
    this.modalOpen.set(true);
  }

  cerrarModalPassword(): void {
    this.modalOpen.set(false);
    this.formError.set('');
  }

  guardarPassword(): void {
    const currentUser = this.authService.currentUser;

    if (!currentUser) {
      this.router.navigateByUrl('/login');
      return;
    }

    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      this.formError.set('Revisa els camps de contrasenya.');
      return;
    }

    const raw = this.passwordForm.getRawValue();

    this.saving.set(true);
    this.formError.set('');
    this.success.set('');

    this.usuarioService
      .changePassword(currentUser.usuarioId, {
        oldPassword: raw.oldPassword ?? '',
        newPassword: raw.newPassword ?? ''
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.success.set('Contrasenya actualitzada correctament.');
          this.cerrarModalPassword();
        },
        error: err => {
          this.saving.set(false);
          this.formError.set(err?.error?.message ?? "No s'ha pogut canviar la contrasenya.");
        }
      });
  }

  moverJuego(index: number, direction: -1 | 1): void {
    const targetIndex = index + direction;
    const current = this.juegosOrdenados();

    if (targetIndex < 0 || targetIndex >= current.length || this.savingOrder()) {
      return;
    }

    const previous = current.map(juego => ({ ...juego }));
    const next = current.map(juego => ({ ...juego }));
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    const normalized = next.map((juego, itemIndex) => ({
      ...juego,
      posicion: itemIndex + 1
    }));

    this.juegosOrdenados.set(normalized);
    this.persistirOrden(previous);
  }

  private persistirOrden(previous: UsuarioJuegoOrden[]): void {
    const currentUser = this.authService.currentUser;

    if (!currentUser) {
      this.router.navigateByUrl('/login');
      return;
    }

    this.savingOrder.set(true);
    this.orderError.set('');

    this.usuarioService
      .updateJuegosOrden(currentUser.usuarioId, {
        juegos: this.juegosOrdenados().map(juego => ({
          juegoId: juego.juegoId,
          posicion: juego.posicion
        }))
      })
      .subscribe({
        next: () => {
          this.savingOrder.set(false);
        },
        error: err => {
          this.juegosOrdenados.set(previous);
          this.savingOrder.set(false);
          this.orderError.set(err?.error?.message ?? "No s'ha pogut guardar l'ordre dels jocs.");
        }
      });
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: () => this.router.navigateByUrl('/login')
    });
  }

  formatFecha(value: string): string {
    return new Date(value).toLocaleDateString('ca-ES');
  }

  trackByJuego(_: number, juego: UsuarioJuegoOrden): number {
    return juego.juegoId;
  }
}
