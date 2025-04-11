'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export function WalletNotFound() {
  const [isBrave, setIsBrave] = useState(false);

  // Detect if user is on Brave browser
  useEffect(() => {
    const detectBrave = async () => {
      // @ts-ignore - Brave exposes this property
      const isBrave = navigator.brave && await navigator.brave.isBrave();
      setIsBrave(!!isBrave);
    };
    
    detectBrave().catch(() => {
      // Fallback detection
      setIsBrave(window.navigator.userAgent.includes('Brave'));
    });
  }, []);

  return (
    <div className="pixelated-box bg-red-900 p-4 rounded-lg border-2 border-red-700 my-4">
      <h3 className="font-pixel text-white text-lg mb-3">Arweave Wallet Not Detected</h3>
      
      <p className="font-pixel text-white text-sm mb-4">
        To play Mines Game, you need to install an Arweave wallet extension for your browser.
      </p>

      {isBrave && (
        <div className="bg-yellow-800 p-3 rounded-lg border-2 border-yellow-600 mb-4">
          <p className="font-pixel text-white text-sm">
            <span className="text-yellow-300">Brave Browser Detected:</span> If you're using Brave and have already installed 
            Wander wallet, please check if the extension is enabled in your browser settings.
          </p>
        </div>
      )}
      
      <div className="space-y-3">
        <a
          href="https://www.wander.app"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center font-pixel bg-blue-600 hover:bg-blue-700 text-white border-2 border-blue-500 p-2 rounded-md"
          style={{
            boxShadow: "0 3px 0 rgba(0,0,0,0.2)",
            textShadow: "1px 1px 0 rgba(0,0,0,0.2)",
            imageRendering: "pixelated"
          }}
        >
          Get Wander Wallet
        </a>

        {isBrave && (
          <a
            href="brave://extensions"
            className="block w-full text-center font-pixel bg-orange-600 hover:bg-orange-700 text-white border-2 border-orange-500 p-2 rounded-md"
            style={{
              boxShadow: "0 3px 0 rgba(0,0,0,0.2)",
              textShadow: "1px 1px 0 rgba(0,0,0,0.2)",
              imageRendering: "pixelated"
            }}
          >
            Open Brave Extensions
          </a>
        )}
        
        <Button
          onClick={() => window.location.reload()}
          className="w-full font-pixel bg-gray-600 hover:bg-gray-700 text-white border-2 border-gray-500"
          style={{
            boxShadow: "0 3px 0 rgba(0,0,0,0.2)",
            textShadow: "1px 1px 0 rgba(0,0,0,0.2)",
            imageRendering: "pixelated"
          }}
        >
          Refresh Page
        </Button>
      </div>
    </div>
  );
} 