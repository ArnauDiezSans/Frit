import { Routes } from '@angular/router';
import { authGuard, hallOfFameGuard } from './core/auth/auth.guard';
import { LoginPageComponent } from './features/auth/login-page.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { PartidasPageComponent } from './features/partidas/partidas-page.component';
import { JuegosPageComponent } from './features/juegos/juegos-page.component';
import { UsuarioPageComponent } from './features/usuario/usuario-page.component';
import { PendentCompraPageComponent } from './features/pendent-compra/pendent-compra-page.component';
import { AQueJuguemPageComponent } from './features/a-que-juguem/a-que-juguem-page.component';
import { CinePageComponent } from './features/cine/cine-page.component';
import { CsopaPageComponent } from './features/csopa/csopa-page.component';
import { LaLlistaPageComponent } from './features/la-llista/la-llista-page.component';
import { RankingsPageComponent } from './features/rankings/rankings-page.component';
import { HallOfFamePageComponent } from './features/hall-of-fame/hall-of-fame-page.component';

export const routes: Routes = [
  { path: 'login', component: LoginPageComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'app/partidas', component: PartidasPageComponent, canActivate: [authGuard] },
  { path: 'app/rankings', component: RankingsPageComponent, canActivate: [authGuard] },
  { path: 'app/hall-of-fame', component: HallOfFamePageComponent, canActivate: [hallOfFameGuard] },
  { path: 'app/juegos', component: JuegosPageComponent, canActivate: [authGuard] },
  { path: 'app/la-llista', component: LaLlistaPageComponent, canActivate: [authGuard] },
  { path: 'app/pendent-compra', component: PendentCompraPageComponent, canActivate: [authGuard] },
  { path: 'app/a-que-juguem', component: AQueJuguemPageComponent, canActivate: [authGuard] },
  { path: 'app/cine', component: CinePageComponent, canActivate: [authGuard] },
  { path: 'app/csopa', component: CsopaPageComponent, canActivate: [authGuard] },
  { path: 'app/usuario', component: UsuarioPageComponent, canActivate: [authGuard] },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' }
];
