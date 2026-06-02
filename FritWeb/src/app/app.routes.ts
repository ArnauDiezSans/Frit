import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { LoginPageComponent } from './features/auth/login-page.component';
import { PartidasPageComponent } from './features/partidas/partidas-page.component';

export const routes: Routes = [
  { path: 'login', component: LoginPageComponent },
  {
    path: 'app/partidas',
    component: PartidasPageComponent,
    canActivate: [authGuard]
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' }
];