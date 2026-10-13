import FoodLoadingAnimation from '@/src/components/food-loading-animation';
import { getRestaurantSettingsForRender } from '@/src/models/restaurant-settings';

export default async function Loading() {
  const settings = await getRestaurantSettingsForRender().catch(() => null);
  return <FoodLoadingAnimation restaurantName={settings?.restaurantName} />;
}
