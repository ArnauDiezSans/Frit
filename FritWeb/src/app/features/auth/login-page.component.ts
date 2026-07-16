import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.css'
})
export class LoginPageComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly isAjjrr = this.route.snapshot.data['brand'] === 'ajjrr';
  readonly registerUrl = this.isAjjrr ? '/ajjrr/register' : '/register';

  loading = false;
  error = '';

  form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required]],
    password: ['', [Validators.required]]
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = '';

    this.authService.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigateByUrl('/app/partidas');
      },
      error: err => {
        this.loading = false;
        this.error = err.status === 429
          ? 'Massa intents. Torna-ho a provar d’aquí a uns minuts.'
          : 'Usuari o contrasenya incorrectes.';
      }
    });
  }
}
