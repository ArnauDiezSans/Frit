import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { Juego } from '../juegos/juegos.models';
import { JuegosService } from '../juegos/juegos.service';
import { UsuarioDetalle, UsuarioService } from './usuario.service';

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
  private juegosService = inject(JuegosService);
  private usuarioService = inject(UsuarioService);
  private router = inject(Router);

  loading = signal(true);
  saving = signal(false);
  error = signal('');
  formError = signal('');
  success = signal('');
  modalOpen = signal(false);

  usuario = signal<UsuarioDetalle | null>(null);
  juegos = signal<Juego[]>([]);

  juegosOrdenados = computed(() =>
    [...this.juegos()]
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'ca'))
      .map((juego, index) => ({
        posicion: index + 1,
        nombre: juego.nombre
      }))
  );

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
      juegos: this.juegosService.getAll()
    }).subscribe({
      next: result => {
        this.usuario.set(result.usuario);
        this.juegos.set(result.juegos);
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

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: () => this.router.navigateByUrl('/login')
    });
  }

  formatFecha(value: string): string {
    return new Date(value).toLocaleDateString('ca-ES');
  }

  trackByJuego(_: number, juego: { posicion: number; nombre: string }): number {
    return juego.posicion;
  }
}
