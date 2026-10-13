'use client';

import { useEffect, useState } from 'react';
import { chooseFoodLoadingScene, foodLoadingScenes, getFoodLoadingScene } from '@/src/utils/food-loader';

function chooseFoodScene() {
  const scope = document.querySelector('.site-animation-scope');
  const randomMode = scope?.getAttribute('data-food-loader-random') !== 'false';
  if (!randomMode) {
    return getFoodLoadingScene(scope?.getAttribute('data-food-loader-scene'));
  }
  let previousIndex = -1;
  try {
    const storedIndex = sessionStorage.getItem('pv-food-loader-scene');
    previousIndex = storedIndex === null ? -1 : Number(storedIndex);
  } catch {
    // The animation still works when browser storage is unavailable.
  }
  const { scene, index } = chooseFoodLoadingScene(previousIndex);
  try {
    sessionStorage.setItem('pv-food-loader-scene', String(index));
  } catch {
    // The animation still works when browser storage is unavailable.
  }
  return scene;
}

export default function FoodLoadingAnimation() {
  const [scene, setScene] = useState<(typeof foodLoadingScenes)[number] | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => setScene(chooseFoodScene()), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const activeScene = scene || foodLoadingScenes[0];
  return (
    <div className="food-loading-overlay" role="status" aria-live="polite" aria-label="Loading page">
      <div className="food-loading-card">
        <div className={`food-loading-plate food-loading-${activeScene.name}`} data-food-scene={activeScene.name} aria-hidden="true">
          <span className="food-loading-spark food-loading-spark-one">✦</span>
          <span className="food-loading-spark food-loading-spark-two">✧</span>
          <span className="food-loading-emoji">{activeScene.emoji}</span>
        </div>
        <p className="food-loading-brand">PIZZA VIZZA</p>
        <p className="food-loading-message">{activeScene.message}</p>
        <div className="food-loading-track" aria-hidden="true"><span /></div>
        <span className="sr-only">Please wait while the page loads.</span>
      </div>
    </div>
  );
}
