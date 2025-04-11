'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { useArweaveWallet } from '@/hooks/use-arweave-wallet';
import { cn } from '@/lib/utils';

export function WalletDisplay() {
  const router = useRouter();
  const { connected, address, balance, disconnect, connect, isConnecting } = useArweaveWallet();
  const [isExpanded, setIsExpanded] = useState(false);
  const [displayState, setDisplayState] = useState({ 
    connected: false, 
    address: '', 
    balance: '0'
  });

  // Use effect to update the display state when wallet state changes
  useEffect(() => {
    setDisplayState({ 
      connected, 
      address: address || '', 
      balance: balance || '0' 
    });
    
    // Log for debugging
    console.log('Wallet state changed in WalletDisplay:', { connected, address, balance });
  }, [connected, address, balance]);

  const handleReconnect = async () => {
    if (isConnecting) return;
    try {
      await connect();
    } catch (error) {
      console.error('Error reconnecting wallet:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      // Close the expanded dropdown
      setIsExpanded(false);
      
      // Disconnect the wallet
      const success = await disconnect();
      if (success) {
        // Use Next.js router to navigate to home page
        router.push('/');
      }
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  };

  const shortAddress = displayState.address
    ? `${displayState.address.slice(0, 6)}...${displayState.address.slice(-4)}`
    : '';

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="relative">
        <Button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "font-pixel border-2 px-4 py-2 rounded-lg shadow-lg transition-all duration-200",
            displayState.connected 
              ? "bg-green-800 hover:bg-green-700 text-white border-green-600" 
              : "bg-red-800 hover:bg-red-700 text-white border-red-600"
          )}
          style={{
            boxShadow: "0 4px 0 rgba(0,0,0,0.2)",
            textShadow: "2px 2px 0 rgba(0,0,0,0.2)",
            imageRendering: "pixelated"
          }}
        >
          {isConnecting ? "Connecting..." : displayState.connected ? shortAddress : "Not Connected"}
        </Button>
        
        {isExpanded && (
          <div 
            className="absolute right-0 mt-2 w-64 bg-gray-800 border-2 border-gray-600 rounded-lg shadow-lg p-4"
            style={{
              boxShadow: "0 4px 0 rgba(0,0,0,0.2)",
              textShadow: "2px 2px 0 rgba(0,0,0,0.2)",
              imageRendering: "pixelated"
            }}
          >
            {displayState.connected ? (
              <>
                <div className="text-white font-pixel mb-4">
                  <div className="text-sm text-gray-400 mb-1">Wallet Address:</div>
                  <div className="break-all bg-gray-700 p-2 rounded border border-gray-600">{displayState.address}</div>
                  <div className="text-sm text-gray-400 mt-2 mb-1">Balance:</div>
                  <div className="bg-gray-700 p-2 rounded border border-gray-600">{Number(displayState.balance).toFixed(2)} AR</div>
                </div>
                <Button
                  onClick={handleDisconnect}
                  className="w-full font-pixel bg-red-600 hover:bg-red-700 text-white border-2 border-red-500"
                  style={{
                    boxShadow: "0 4px 0 rgba(0,0,0,0.2)",
                    textShadow: "2px 2px 0 rgba(0,0,0,0.2)",
                    imageRendering: "pixelated"
                  }}
                >
                  Disconnect
                </Button>
              </>
            ) : (
              <>
                <div className="text-white font-pixel mb-4">
                  <div className="text-center p-2 bg-red-900 rounded mb-3">Not Connected</div>
                  <p className="text-sm">Connect your Arweave wallet to play</p>
                </div>
                <Button
                  onClick={handleReconnect}
                  disabled={isConnecting}
                  className="w-full font-pixel bg-blue-600 hover:bg-blue-700 text-white border-2 border-blue-500"
                  style={{
                    boxShadow: "0 4px 0 rgba(0,0,0,0.2)",
                    textShadow: "2px 2px 0 rgba(0,0,0,0.2)",
                    imageRendering: "pixelated"
                  }}
                >
                  {isConnecting ? "Connecting..." : "Connect Wallet"}
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 