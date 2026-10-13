import { isFoodLoadingSceneName, type FoodLoadingSceneName } from '@/src/utils/food-loader';

export interface SiteAnimations {
  enabled: boolean;
  brandFloat: boolean;
  contentGlow: boolean;
  actionPulse: boolean;
  foodLoader: boolean;
  foodLoaderRandom: boolean;
  foodLoaderScene: FoodLoadingSceneName;
}

export const defaultSiteAnimations: SiteAnimations = {
  enabled: true,
  brandFloat: true,
  contentGlow: true,
  actionPulse: true,
  foodLoader: true,
  foodLoaderRandom: true,
  foodLoaderScene: 'pizza',
};

export function normalizeSiteAnimations(value?: Partial<SiteAnimations> | null): SiteAnimations {
  const normalized = {
    ...defaultSiteAnimations,
    ...value,
  };
  if (value?.foodLoaderRandom !== undefined && typeof value.foodLoaderRandom !== 'boolean') {
    normalized.foodLoaderRandom = defaultSiteAnimations.foodLoaderRandom;
  }
  if (value?.foodLoaderScene !== undefined && !isFoodLoadingSceneName(value.foodLoaderScene)) {
    normalized.foodLoaderScene = defaultSiteAnimations.foodLoaderScene;
  }
  return normalized;
}
