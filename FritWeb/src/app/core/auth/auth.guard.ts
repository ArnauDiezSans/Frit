import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { TenantFeature } from './tenant-features';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated()
    ? true
    : router.createUrlTree(['/login']);
};

export const hallOfFameGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated()
    ? true
    : router.createUrlTree(['/login']);
};

export const tenantFeatureGuard: CanActivateFn = route => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const feature = route.data['feature'] as TenantFeature;

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  return authService.canUseFeature(feature)
    ? true
    : router.createUrlTree(['/app/partidas']);
};
