'use client';

import { useState, useEffect } from 'react';

interface SoundToggleProps {
  onToggle: (enabled: boolean) => void;
}

export function SoundToggle({ onToggle }: SoundToggleProps) {
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);

  useEffect(() => {
    // Initialize sound state (could be from localStorage if needed)
    onToggle(isSoundEnabled);
  }, [isSoundEnabled, onToggle]);

  const toggleSound = () => {
    const newState = !isSoundEnabled;
    setIsSoundEnabled(newState);
    onToggle(newState);
  };

  return (
    <button 
      onClick={toggleSound}
      className="pixelated-box flex items-center justify-center p-2 rounded-md border-2 border-gray-800 bg-gray-700 hover:bg-gray-600 transition-colors"
      aria-label={isSoundEnabled ? "Disable sound" : "Enable sound"}
    >
      <div className="flex items-center space-x-2">
        {isSoundEnabled ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
          </svg>
        )}
        <span className="font-pixel text-sm text-white">{isSoundEnabled ? "ON" : "OFF"}</span>
      </div>
    </button>
  );
}

export function useSoundEffects(enabled: boolean) {
  const [sounds, setSounds] = useState<{
    gem: HTMLAudioElement | null;
    mine: HTMLAudioElement | null;
  }>({ gem: null, mine: null });

  useEffect(() => {
    // Only initialize audio in the browser
    if (typeof window !== 'undefined') {
      const gemSound = new Audio('/dum.mp3');
      const mineSound = new Audio('/laugh.mp3');
      
      // Preload the sounds
      gemSound.load();
      mineSound.load();
      
      setSounds({
        gem: gemSound,
        mine: mineSound
      });
    }
  }, []);

  const playGemSound = () => {
    if (enabled && sounds.gem) {
      // Clone to allow overlapping sounds
      const sound = sounds.gem.cloneNode() as HTMLAudioElement;
      sound.play().catch(err => console.log('Error playing gem sound:', err));
    }
  };

  const playMineSound = () => {
    if (enabled && sounds.mine) {
      // Clone to allow overlapping sounds
      const sound = sounds.mine.cloneNode() as HTMLAudioElement;
      sound.play().catch(err => console.log('Error playing mine sound:', err));
    }
  };

  return { playGemSound, playMineSound };
} 