import { isFoodLoadingSceneName, type FoodLoadingSceneName } from '@/src/utils/food-loader';
import { isBootLoaderStyle, type BootLoaderStyle } from '@/src/utils/boot-loader';

export interface SiteAnimations {
  enabled: boolean;
  brandFloat: boolean;
  contentGlow: boolean;
  actionPulse: boolean;
  foodLoader: boolean;
  foodLoaderRandom: boolean;
  foodLoaderScene: FoodLoadingSceneName;
  heroSlideshow: boolean;
  themeColor: string;
  bootLoader: boolean;
  bootLoaderRandom: boolean;
  bootLoaderStyle: BootLoaderStyle;
}

export const defaultSiteAnimations: SiteAnimations = {
  enabled: true,
  brandFloat: true,
  contentGlow: true,
  actionPulse: true,
  foodLoader: true,
  foodLoaderRandom: true,
  foodLoaderScene: 'pizza',
  heroSlideshow: true,
  themeColor: '#f59e0b',
  bootLoader: true,
  bootLoaderRandom: true,
  bootLoaderStyle: 'orbit',
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
  if (value?.heroSlideshow !== undefined && typeof value.heroSlideshow !== 'boolean') {
    normalized.heroSlideshow = defaultSiteAnimations.heroSlideshow;
  }
  if (value?.themeColor !== undefined && !/^#[0-9a-f]{6}$/i.test(value.themeColor)) {
    normalized.themeColor = defaultSiteAnimations.themeColor;
  }
  if (value?.bootLoader !== undefined && typeof value.bootLoader !== 'boolean') {
    normalized.bootLoader = defaultSiteAnimations.bootLoader;
  }
  if (value?.bootLoaderRandom !== undefined && typeof value.bootLoaderRandom !== 'boolean') {
    normalized.bootLoaderRandom = defaultSiteAnimations.bootLoaderRandom;
  }
  if (value?.bootLoaderStyle !== undefined && !isBootLoaderStyle(value.bootLoaderStyle)) {
    normalized.bootLoaderStyle = defaultSiteAnimations.bootLoaderStyle;
  }
  return normalized;
}
