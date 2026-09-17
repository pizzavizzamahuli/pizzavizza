import { getRestaurantSettings } from '@/src/models/restaurant-settings';

export async function getRestaurantName() {
  const settings = await getRestaurantSettings();
  return settings.restaurantName?.trim() || 'Pizza Vizza';
}
