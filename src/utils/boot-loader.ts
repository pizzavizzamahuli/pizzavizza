export const bootLoaderStyles = [
  { name: 'orbit', label: 'Orbiting rings' },
  { name: 'pulse', label: 'Soft pulse' },
  { name: 'dual-arc', label: 'Dual arcs' },
  { name: 'orbit-dots', label: 'Orbiting dots' },
  { name: 'equalizer', label: 'Equalizer bars' },
  { name: 'shimmer', label: 'Shimmer sweep' },
  { name: 'ripple', label: 'Ripple rings' },
  { name: 'spinner', label: 'Precision spinner' },
  { name: 'squares', label: 'Rotating squares' },
  { name: 'bounce', label: 'Bouncing dots' },
  { name: 'breathing', label: 'Breathing mark' },
  { name: 'progress', label: 'Progress sweep' },
  { name: 'spark', label: 'Orbiting spark' },
  { name: 'stacked', label: 'Stacked bars' },
  { name: 'wave', label: 'Wave rings' },
  { name: 'constellation', label: 'Constellation' },
  { name: 'compass', label: 'Compass spin' },
  { name: 'diamond', label: 'Glow diamond' },
] as const;

export const bootBackgroundPalettes = Array.from({ length: 12 }, (_, index) => index * 30);

export type BootLoaderStyle = (typeof bootLoaderStyles)[number]['name'];

export function isBootLoaderStyle(value: unknown): value is BootLoaderStyle {
  return typeof value === 'string' && bootLoaderStyles.some((style) => style.name === value);
}

export function getBootLoaderStyle(value: unknown): BootLoaderStyle {
  return isBootLoaderStyle(value) ? value : bootLoaderStyles[0].name;
}

export function chooseBootLoaderStyle(randomValue = Math.random()): BootLoaderStyle {
  const index = Math.min(Math.floor(randomValue * bootLoaderStyles.length), bootLoaderStyles.length - 1);
  return bootLoaderStyles[index].name;
}

export function chooseBootBackgroundPalette(previousIndex: number, randomValue = Math.random()) {
  const available = bootBackgroundPalettes
    .map((hue, index) => ({ hue, index }))
    .filter(({ index }) => index !== previousIndex);
  const selection = available[Math.min(Math.floor(randomValue * available.length), available.length - 1)];
  return selection || { hue: bootBackgroundPalettes[0], index: 0 };
}

export function shouldWaitForBootImage({
  loading,
  top,
  bottom,
  viewportHeight,
}: {
  loading: string;
  top: number;
  bottom: number;
  viewportHeight: number;
}) {
  if (loading !== 'lazy') return true;
  return top < viewportHeight * 1.5 && bottom > -viewportHeight * 0.5;
}
