export const foodLoadingScenes = [
  { emoji: '🍕', name: 'pizza', message: 'Baking something delicious' },
  { emoji: '🍔', name: 'burger', message: 'Grilling your next favorite' },
  { emoji: '🍟', name: 'fries', message: 'Getting the sides ready' },
  { emoji: '🥤', name: 'drink', message: 'Pouring something refreshing' },
  { emoji: '🍩', name: 'donut', message: 'Adding a little sweetness' },
  { emoji: '🌮', name: 'taco', message: 'Fresh flavors are on the way' },
] as const;

export function chooseFoodLoadingScene(previousIndex: number, randomValue = Math.random()) {
  const available = foodLoadingScenes
    .map((scene, index) => ({ scene, index }))
    .filter(({ index }) => index !== previousIndex);
  const selection = available[Math.floor(randomValue * available.length)];
  return selection || { scene: foodLoadingScenes[0], index: 0 };
}
