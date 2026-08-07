import { AuthUser } from './auth.models';

export type TenantFeature = 'laLlista' | 'assistencia';

const hiddenFeaturesByTenant: Readonly<Record<string, readonly TenantFeature[]>> = {
  ajjrr26: ['laLlista', 'assistencia']
};

export function canUseTenantFeature(user: AuthUser | null, feature: TenantFeature): boolean {
  if (!user) {
    return false;
  }

  return !hiddenFeaturesByTenant[user.tenantCodi]?.includes(feature);
}
