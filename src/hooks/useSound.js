import { useRef } from 'react';

// Coliseo Angel Cruz Sound Engine: Curated High-Fidelity Audio Signals
const SOUNDS = {
  WIN: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3', // Crystal Coins
  BET: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3', // Tactical Click
  NOTIFY: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3', // Soft Digital Pop
  STRIKE: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3' // Impact/Gong
};

export const useSound = () => {
  const audioRefs = useRef({});

  // Pre-load all signals on first call to warm up the engine
  const preload = () => {
    Object.keys(SOUNDS).forEach(key => {
        if (!audioRefs.current[key]) {
            audioRefs.current[key] = new Audio(SOUNDS[key]);
            audioRefs.current[key].load();
        }
    });
  };

  const play = (soundKey) => {
    const url = SOUNDS[soundKey];
    if (!url) return;

    try {
        if (!audioRefs.current[soundKey]) {
            audioRefs.current[soundKey] = new Audio(url);
        }
        
        const audio = audioRefs.current[soundKey];
        audio.currentTime = 0;
        audio.volume = 0.5;
        
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {
                console.log('Audio Blocked: Manual trigger required.');
            });
        }
    } catch (err) {
        console.error('Audio Err:', err);
    }
  };

  return { play, preload };
};
