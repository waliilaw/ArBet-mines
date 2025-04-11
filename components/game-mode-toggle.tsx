'use client';

import { useState, useEffect } from 'react';
import { setTestMode, getTestMode } from '@/lib/arweave-integration';

export function GameModeToggle() {
  const [isTestMode, setIsTestMode] = useState(true);

  useEffect(() => {
    // Initialize state from arweave integration
    setIsTestMode(getTestMode());
  }, []);

  const toggleMode = () => {
    const newMode = !isTestMode;
    setIsTestMode(newMode);
    setTestMode(newMode);
  };

  return (
    <div className="flex flex-col items-center mb-4">
      <div className="flex items-center space-x-2 mb-2">
        <div 
          className={`relative inline-flex h-10 w-20 cursor-pointer rounded-md border-2 border-gray-800 ${isTestMode ? 'bg-gray-300' : 'bg-red-500'} transition-colors duration-200 ease-in-out`}
          onClick={toggleMode}
        >
          {/* Pixelated Toggle Slider */}
          <div 
            className={`absolute top-1 ${isTestMode ? 'left-1' : 'left-10'} h-6 w-8 transform rounded border-2 border-gray-800 bg-white transition-transform duration-200 ease-in-out`}
            style={{ 
              boxShadow: '2px 2px 0 #000',
              imageRendering: 'pixelated'
            }}
          />
        </div>
        <span className="font-pixel text-lg font-bold">
          {isTestMode ? 'TEST MODE' : 'REAL MODE'}
        </span>
      </div>
      
      <div className="text-center">
        {isTestMode ? (
          <div className="pixelated-box bg-green-100 p-3 rounded-lg border-2 border-green-600">
            <p className="font-pixel text-sm text-green-800">
              Test Mode: You have 100 AR for testing. No real tokens will be used.
            </p>
          </div>
        ) : (
          <div className="pixelated-box bg-red-100 p-3 rounded-lg border-2 border-red-600">
            <p className="font-pixel text-sm text-red-800">
              Real Mode: Your actual AR wallet will be used. Real tokens will be wagered.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// CSS classes to add to global.css
/*
.pixelated-box {
  image-rendering: pixelated;
  box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.2);
}

.font-pixel {
  font-family: 'Press Start 2P', monospace;  
}
*/ 