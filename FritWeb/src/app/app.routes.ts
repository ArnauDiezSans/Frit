import { Routes } from '@angular/router';
import { authGuard, hallOfFameGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: 'ajjrr', data: { brand: 'ajjrr' }, loadComponent: () => import('./features/auth/login-page.component').then(m => m.LoginPageComponent) },
  { path: 'ajjrr/register', data: { brand: 'ajjrr' }, loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent) },
  { path: 'login', loadComponent: () => import('./features/auth/login-page.component').then(m => m.LoginPageComponent) },
  { path: 'register', loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent) },
  { path: 'app/partidas', loadComponent: () => import('./features/partidas/partidas-page.component').then(m => m.PartidasPageComponent), canActivate: [authGuard] },
  { path: 'app/rankings', loadComponent: () => import('./features/rankings/rankings-page.component').then(m => m.RankingsPageComponent), canActivate: [authGuard] },
  { path: 'app/hall-of-fame', loadComponent: () => import('./features/hall-of-fame/hall-of-fame-page.component').then(m => m.HallOfFamePageComponent), canActivate: [hallOfFameGuard] },
  { path: 'app/juegos', loadComponent: () => import('./features/juegos/juegos-page.component').then(m => m.JuegosPageComponent), canActivate: [authGuard] },
  { path: 'app/la-llista', loadComponent: () => import('./features/la-llista/la-llista-page.component').then(m => m.LaLlistaPageComponent), canActivate: [authGuard] },
  { path: 'app/pendent-compra', loadComponent: () => import('./features/pendent-compra/pendent-compra-page.component').then(m => m.PendentCompraPageComponent), canActivate: [authGuard] },
  { path: 'app/a-que-juguem', loadComponent: () => import('./features/a-que-juguem/a-que-juguem-page.component').then(m => m.AQueJuguemPageComponent), canActivate: [authGuard] },
  { path: 'app/assistencia', loadComponent: () => import('./features/csopa/csopa-page.component').then(m => m.CsopaPageComponent), canActivate: [authGuard] },
  { path: 'app/cine', redirectTo: 'app/assistencia', pathMatch: 'full' },
  { path: 'app/csopa', redirectTo: 'app/assistencia', pathMatch: 'full' },
  { path: 'app/usuario', loadComponent: () => import('./features/usuario/usuario-page.component').then(m => m.UsuarioPageComponent), canActivate: [authGuard] },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' }
];
