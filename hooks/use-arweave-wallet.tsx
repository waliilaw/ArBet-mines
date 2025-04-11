"use client"

import { useState, useEffect } from 'react';
import { connectWallet, disconnectWallet, fetchArweaveBalance, isWanderWalletInstalled } from '@/lib/arweave-integration';

/**
 * Custom hook for Arweave wallet interaction
 * Supports both test mode with mock tokens and real wallet mode
 */
export function useArweaveWallet() {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string>('');
  const [balance, setBalance] = useState<string>('0.0');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isWalletInstalled, setIsWalletInstalled] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [isBraveBrowser, setIsBraveBrowser] = useState(false);

  // Detect browser type
  useEffect(() => {
    const detectBrave = async () => {
      try {
        // @ts-ignore - Brave exposes this property
        const isBrave = navigator.brave && await navigator.brave.isBrave();
        setIsBraveBrowser(!!isBrave);
      } catch (e) {
        // Fallback detection
        setIsBraveBrowser(window.navigator.userAgent.includes('Brave'));
      }
    };
    
    detectBrave();
  }, []);

  useEffect(() => {
    // Check if wallet is installed and already connected
    const checkWalletState = async () => {
      const installed = isWanderWalletInstalled();
      setIsWalletInstalled(installed);
      console.log('Wallet installed check:', installed);
      
      if (!installed) {
        const errorMsg = isBraveBrowser 
          ? 'Arweave wallet extension not found. Please check browser extensions.'
          : 'Arweave wallet extension not found';
        setWalletError(errorMsg);
        return;
      }
      
      try {
        // Use the global to get access to either window.wander or window.arweaveWallet
        const wallet = window.wander || window.arweaveWallet;
        if (!wallet) {
          console.log('No wallet interface found despite being "installed"');
          return;
        }
        
        console.log('Checking for active address...');
        const activeAddress = await wallet.getActiveAddress().catch(err => {
          console.error('Error in getActiveAddress:', err);
          return null;
        });
        
        console.log('Active address check result:', activeAddress);
        
        if (activeAddress) {
          console.log('Found active address, setting connected state');
          setConnected(true);
          setAddress(activeAddress);
          
          try {
            const balance = await fetchArweaveBalance(activeAddress);
            console.log('Fetched balance:', balance);
            setBalance(balance);
          } catch (balanceError) {
            console.error('Error fetching initial balance:', balanceError);
          }
        } else {
          console.log('No active address found');
          setConnected(false);
          setAddress('');
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
        setWalletError('Error checking wallet connection');
      }
    };

    // Run immediately and then set up an interval to periodically check
    checkWalletState();
    
    // Also recheck every 3 seconds in case the user connects via the wallet UI directly
    const intervalId = setInterval(() => {
      if (!connected) {
        checkWalletState();
      }
    }, 3000);
    
    return () => clearInterval(intervalId);
  }, [isBraveBrowser, connected]);

  const connect = async () => {
    setWalletError(null);
    setIsConnecting(true);
    
    if (!isWanderWalletInstalled()) {
      const errorMsg = isBraveBrowser 
        ? 'Arweave wallet extension not found. Please check browser extensions.'
        : 'Arweave wallet extension not found';
      setWalletError(errorMsg);
      setIsConnecting(false);
      throw new Error('WALLET_NOT_INSTALLED');
    }
    
    try {
      const walletAddress = await connectWallet();
      
      // Log successful connection
      console.log('Successfully connected to wallet:', walletAddress);
      
      // Update state in a single batch to avoid race conditions
      setConnected(true);
      setAddress(walletAddress);
      
      try {
        const balanceValue = await fetchArweaveBalance(walletAddress);
        setBalance(balanceValue);
        console.log('Fetched balance:', balanceValue);
      } catch (balanceError) {
        console.error('Error fetching balance:', balanceError);
        // Still continue with connection even if balance fetch fails
      }
      
      // Force recheck of connection status
      setTimeout(() => {
        const wallet = window.wander || window.arweaveWallet;
        if (wallet) {
          wallet.getActiveAddress().then(activeAddr => {
            if (activeAddr) {
              console.log('Verified active address:', activeAddr);
              setConnected(true);
              setAddress(activeAddr);
            }
          }).catch(err => console.error('Error checking active address:', err));
        }
      }, 500);
      
      return walletAddress;
    } catch (error) {
      console.error('Error connecting wallet:', error);
      if (error instanceof Error) {
        if (error.message === 'WALLET_NOT_INSTALLED') {
          const errorMsg = isBraveBrowser 
            ? 'Arweave wallet extension not found. Please check browser extensions.'
            : 'Arweave wallet extension not found';
          setWalletError(errorMsg);
        } else if (error.message.includes('rejected')) {
          setWalletError('Connection rejected by user');
        } else {
          setWalletError(error.message);
        }
      } else {
        setWalletError('Failed to connect to wallet');
      }
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    try {
      // Clear wallet state first to provide immediate feedback
      setConnected(false);
      setAddress('');
      setBalance('0.0');
      
      // Then attempt to disconnect from the wallet
      if (isWanderWalletInstalled()) {
        await disconnectWallet();
      }
      
      console.log('Wallet disconnected successfully');
      
      // Clear any stored session data if needed
      localStorage.removeItem('arweave-wallet-address');
      sessionStorage.removeItem('arweave-wallet-connected');
      
      return true;
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      throw error;
    }
  };

  return {
    connected,
    address,
    balance,
    isConnecting,
    isWalletInstalled,
    isBraveBrowser,
    walletError,
    connect,
    disconnect
  };
}

// Type definition already provided in arweave-integration.ts
