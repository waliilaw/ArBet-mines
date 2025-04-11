"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "@/components/ui/use-toast"
import { 
  connectWallet,
  disconnectWallet,
  fetchArweaveBalance,
  getTestMode
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

  // Check if window is defined (browser environment)
  const isClient = typeof window !== "undefined"

  // Update test mode state
  useEffect(() => {
    setIsTestMode(getTestMode());
  }, []);

  // Connect to Arweave wallet (supports both test and real modes)
  const connect = useCallback(async () => {
    try {
      const walletAddress = await connectWallet();
      setAddress(walletAddress);
      setConnected(true);

      // Fetch balance
      const walletBalance = await fetchArweaveBalance(walletAddress);
      setBalance(walletBalance);

      const mode = isTestMode ? "Test" : "Real";
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
    }
  }, [isTestMode]);

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
    try {
      const walletBalance = await fetchArweaveBalance(walletAddress);
      setBalance(walletBalance);
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  }, []);

  // Refresh wallet state when test mode changes
  useEffect(() => {
    setIsTestMode(getTestMode());
    if (connected) {
      // Reconnect to refresh state
      disconnect().then(() => connect());
    }
  }, [connected, connect, disconnect]);

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
