export const foodLoadingScenes = [
  { emoji: '🍕', name: 'pizza', message: 'Baking something delicious' },
  { emoji: '🍔', name: 'burger', message: 'Grilling your next favorite' },
  { emoji: '🍟', name: 'fries', message: 'Getting the sides ready' },
  { emoji: '🥤', name: 'drink', message: 'Pouring something refreshing' },
  { emoji: '🍩', name: 'donut', message: 'Adding a little sweetness' },
  { emoji: '🌮', name: 'taco', message: 'Fresh flavors are on the way' },
  { emoji: '🍝', name: 'pasta', message: 'Tossing up a fresh favorite' },
  { emoji: '🍣', name: 'sushi', message: 'Rolling something special' },
  { emoji: '🍦', name: 'icecream', message: 'Scooping up a sweet treat' },
  { emoji: '🥪', name: 'sandwich', message: 'Stacking fresh ingredients' },
  { emoji: '☕', name: 'coffee', message: 'Brewing a little pick-me-up' },
  { emoji: '🍰', name: 'cake', message: 'Finishing a lovely dessert' },
  { emoji: '🧇', name: 'waffle', message: 'Making it golden and crisp' },
  { emoji: '🥟', name: 'dumplings', message: 'Folding in something delicious' },
  { emoji: '🥗', name: 'salad', message: 'Tossing together fresh greens' },
  { emoji: '🥤', name: 'milkshake', message: 'Blending a cool treat' },
  { emoji: '🥐', name: 'croissant', message: 'Warming up a flaky favorite' },
  { emoji: '🍜', name: 'ramen', message: 'Simmering a comforting bowl' },
] as const;

export type FoodLoadingSceneName = (typeof foodLoadingScenes)[number]['name'];

export function isFoodLoadingSceneName(value: unknown): value is FoodLoadingSceneName {
  return typeof value === 'string' && foodLoadingScenes.some((scene) => scene.name === value);
}

export function chooseFoodLoadingScene(previousIndex: number, randomValue = Math.random()) {
  const available = foodLoadingScenes
    .map((scene, index) => ({ scene, index }))
    .filter(({ index }) => index !== previousIndex);
  const selection = available[Math.floor(randomValue * available.length)];
  return selection || { scene: foodLoadingScenes[0], index: 0 };
}

export function getFoodLoadingScene(name: unknown) {
  return foodLoadingScenes.find((scene) => scene.name === name) || foodLoadingScenes[0];
}
