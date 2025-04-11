"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "@/components/ui/use-toast"
import { 
  connectWallet,
  disconnectWallet,
  fetchArweaveBalance,
  getTestMode,
  setTestMode
} from "@/lib/arweave-integration"

/**
 * Custom hook for Arweave wallet interaction
 * Supports both test mode with mock tokens and real wallet mode
 */
export function useArweaveWallet() {
  const [connected, setConnected] = useState(false)
  const [address, setAddress] = useState("")
  const [balance, setBalance] = useState("0")
  const [isTestMode, setIsTestMode] = useState(true)
  const connectingRef = useRef(false) // Use ref to prevent race conditions

  // Check if window is defined (browser environment)
  const isClient = typeof window !== "undefined"

  // Update test mode state without causing re-renders
  useEffect(() => {
    const currentTestMode = getTestMode();
    if (isTestMode !== currentTestMode) {
      setIsTestMode(currentTestMode);
    }
  }, []);

  // Connect to Arweave wallet (supports both test and real modes)
  const connect = useCallback(async () => {
    if (connectingRef.current) return; // Prevent duplicate calls
    connectingRef.current = true;
    
    try {
      const walletAddress = await connectWallet();
      setAddress(walletAddress);
      setConnected(true);

      // Only fetch balance if we have an address
      if (walletAddress) {
        try {
          const walletBalance = await fetchArweaveBalance(walletAddress);
          setBalance(walletBalance);
        } catch (balanceError) {
          console.error("Error fetching balance:", balanceError);
          // Don't throw - just log the error
        }
      }

      const mode = getTestMode() ? "Test" : "Real"; // Use function directly to avoid stale state
      toast({
        title: `${mode} Wallet Connected`,
        description: `Connected to ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
      });
    } catch (error) {
      console.error("Error connecting to wallet:", error);
      toast({
        title: "Connection failed",
        description: error instanceof Error ? error.message : "Failed to connect wallet",
        variant: "destructive",
      });
      // Auto-switch to test mode on error
      setTestMode(true);
      setIsTestMode(true);
    } finally {
      connectingRef.current = false;
    }
  }, []); // Remove isTestMode dependency to avoid extra re-renders

  // Disconnect from wallet
  const disconnect = useCallback(async () => {
    try {
      await disconnectWallet();
      setConnected(false);
      setAddress("");
      setBalance("0");

      toast({
        title: "Wallet disconnected",
        description: "Successfully disconnected wallet",
      });
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
      toast({
        title: "Error disconnecting",
        description: "Failed to disconnect wallet",
        variant: "destructive",
      });
    }
  }, []);

  // Fetch wallet balance
  const fetchBalance = useCallback(async (walletAddress: string) => {
    if (!walletAddress) return;
    
    try {
      const walletBalance = await fetchArweaveBalance(walletAddress);
      setBalance(walletBalance);
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  }, []);

  return {
    connected,
    address,
    balance,
    isTestMode,
    connect,
    disconnect,
    fetchBalance
  }
}

// Type definition already provided in arweave-integration.ts
