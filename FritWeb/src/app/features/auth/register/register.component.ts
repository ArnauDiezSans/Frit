import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loading = false;
  error = '';
  success = '';

  form = this.fb.nonNullable.group({
    tenantCodi: ['', [Validators.required, Validators.maxLength(100)]],
    nombre: ['', [Validators.required, Validators.maxLength(200)]],
    password: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(100)]]
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    const value = this.form.getRawValue();

    this.authService.register({
      tenantCodi: value.tenantCodi,
      nombre: value.nombre,
      password: value.password
    }).subscribe({
      next: () => {
        this.loading = false;
        this.success = 'Usuari creat correctament.';
        this.router.navigateByUrl('/login');
      },
      error: err => {
        this.loading = false;

        if (err.status === 409) {
          this.error = 'Ja existeix un usuari amb aquest nom.';
          return;
        }

        if (err.status === 400) {
          this.error = err.error?.message ?? 'Les dades de registre no són vàlides.';
          return;
        }

        if (err.status === 429) {
          this.error = 'Massa intents. Torna-ho a provar d’aquí a uns minuts.';
          return;
        }

        if (err.status === 503) {
          this.error = 'El registre no està disponible temporalment.';
          return;
        }

        this.error = "No s'ha pogut crear l'usuari.";
      }
    });
  }

  get nombre() { return this.form.controls.nombre; }
  get tenantCodi() { return this.form.controls.tenantCodi; }
  get password() { return this.form.controls.password; }
}
