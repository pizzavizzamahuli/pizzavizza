export interface SiteAnimations {
  enabled: boolean;
  brandFloat: boolean;
  contentGlow: boolean;
  actionPulse: boolean;
}

export const defaultSiteAnimations: SiteAnimations = {
  enabled: true,
  brandFloat: true,
  contentGlow: true,
  actionPulse: true,
};

export function normalizeSiteAnimations(value?: Partial<SiteAnimations> | null): SiteAnimations {
  return {
    ...defaultSiteAnimations,
    ...value,
  };
}
