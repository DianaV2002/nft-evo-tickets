import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { EmailWalletAdapter } from '@/wallet/EmailWalletAdapter';
import { connectEmailWallet, clearEmailWalletCache } from '@/wallet/emailWalletService';

export function useEmailWallet() {
  const { user, isConnected } = useAuth();
  const [emailWallet, setEmailWallet] = useState<EmailWalletAdapter | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasAttemptedConnection, setHasAttemptedConnection] = useState(false);

  useEffect(() => {
    const connectEmailUserWallet = async () => {
      // Prevent duplicate connection attempts
      if (isConnecting || hasAttemptedConnection || emailWallet) {
        return;
      }

      // If email user is logged in, create and connect their wallet adapter
      if (isConnected && user && user.authMethod !== 'wallet') {
        try {
          setIsConnecting(true);
          setHasAttemptedConnection(true);
          console.log('Auto-connecting email user wallet:', user.walletAddress);
          
          const emailWalletAdapter = await connectEmailWallet(user.walletAddress);
          setEmailWallet(emailWalletAdapter);
          
          console.log('Email user wallet connected successfully');
        } catch (error) {
          console.error('Failed to auto-connect email wallet:', error);
          // Reset the attempt flag after a delay to allow retry
          setTimeout(() => setHasAttemptedConnection(false), 30000); // 30 second cooldown
        } finally {
          setIsConnecting(false);
        }
      }
    };

    connectEmailUserWallet();
  }, [isConnected, user, emailWallet, isConnecting, hasAttemptedConnection]);

  // Clean up email wallet when user logs out
  useEffect(() => {
    if (!isConnected && emailWallet) {
      emailWallet.disconnect();
      setEmailWallet(null);
      setHasAttemptedConnection(false);
      clearEmailWalletCache(); // Clear cache on logout
    }
  }, [isConnected, emailWallet]);

  return {
    emailWallet,
    isConnecting,
    hasAttemptedConnection
  };
}
