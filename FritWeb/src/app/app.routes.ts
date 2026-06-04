import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { LoginPageComponent } from './features/auth/login-page.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { PartidasPageComponent } from './features/partidas/partidas-page.component';
import { JuegosPageComponent } from './features/juegos/juegos-page.component';
import { UsuarioPageComponent } from './features/usuario/usuario-page.component';
import { PendentCompraPageComponent } from './features/pendent-compra/pendent-compra-page.component';

export const routes: Routes = [
  { path: 'login', component: LoginPageComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'app/partidas', component: PartidasPageComponent, canActivate: [authGuard] },
  { path: 'app/juegos', component: JuegosPageComponent, canActivate: [authGuard] },
  { path: 'app/pendent-compra', component: PendentCompraPageComponent, canActivate: [authGuard] },
  { path: 'app/usuario', component: UsuarioPageComponent, canActivate: [authGuard] },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' }
];
