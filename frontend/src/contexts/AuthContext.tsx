import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Keypair } from '@solana/web3.js';

export interface User {
  walletAddress: string;
  publicKey: PublicKey;
  keypair?: Keypair; // Only available for email/social users
  authMethod: 'wallet' | 'email' | 'google' | 'facebook';
  email?: string;
  name?: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  loginWithEmail: (email: string, password: string) => Promise<boolean>;
  loginWithGoogle: (token: string, email: string, name: string, avatar?: string) => Promise<boolean>;
  loginWithFacebook: (token: string, email: string, name: string, avatar?: string) => Promise<boolean>;
  logout: () => void;
  isConnected: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { connected, publicKey, wallet } = useWallet();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const savedUser = localStorage.getItem('nft-evo-user');
        if (savedUser) {
          const userData = JSON.parse(savedUser);
          // Convert publicKey string back to PublicKey object
          userData.publicKey = new PublicKey(userData.publicKey);
          setUser(userData);
        }
      } catch (error) {
        console.error('Error loading saved session:', error);
        localStorage.removeItem('nft-evo-user');
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingSession();
  }, []);

  // Handle wallet connection changes
  useEffect(() => {
    if (connected && publicKey && wallet) {
      const walletUser: User = {
        walletAddress: publicKey.toBase58(),
        publicKey,
        authMethod: 'wallet',
      };
      setUser(walletUser);
      localStorage.setItem('nft-evo-user', JSON.stringify({
        ...walletUser,
        publicKey: publicKey.toBase58() // Store as string for localStorage
      }));
    } else if (!connected && user?.authMethod === 'wallet') {
      setUser(null);
      localStorage.removeItem('nft-evo-user');
    }
  }, [connected, publicKey, wallet]);

  const loginWithEmail = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        let message = 'Login failed. Please try again.';
        if (response.status === 401) {
          message = 'Invalid email or password. Please check your credentials.';
        } else if (response.status === 429) {
          message = 'Too many login attempts. Please wait a few minutes before trying again.';
        } else {
          try {
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
              const errorJson = await response.json();
              if (errorJson && (errorJson.error || errorJson.message)) {
                message = errorJson.error || errorJson.message;
              }
            } else {
              const text = await response.text();
              if (text) {
                message = text;
              }
            }
          } catch (_) {
            // Swallow parse errors and keep default message
          }
        }
        throw new Error(message);
      }

      const data = await response.json();
      const userData: User = {
        walletAddress: data.walletAddress,
        publicKey: new PublicKey(data.walletAddress),
        authMethod: 'email',
        email: data.email,
      };

      setUser(userData);
      localStorage.setItem('nft-evo-user', JSON.stringify({
        ...userData,
        publicKey: data.walletAddress // Store as string
      }));

      return true;
    } catch (error) {
      console.error('Email login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (token: string, email: string, name: string, avatar?: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, email, name, avatar }),
      });

      if (!response.ok) {
        throw new Error('Google authentication failed');
      }

      const data = await response.json();
      const userData: User = {
        walletAddress: data.walletAddress,
        publicKey: new PublicKey(data.walletAddress),
        authMethod: 'google',
        email: data.email,
        name: data.name,
        avatar: data.avatar,
      };

      setUser(userData);
      localStorage.setItem('nft-evo-user', JSON.stringify({
        ...userData,
        publicKey: data.walletAddress // Store as string
      }));

      return true;
    } catch (error) {
      console.error('Google login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithFacebook = async (token: string, email: string, name: string, avatar?: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/facebook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, email, name, avatar }),
      });

      if (!response.ok) {
        throw new Error('Facebook authentication failed');
      }

      const data = await response.json();
      const userData: User = {
        walletAddress: data.walletAddress,
        publicKey: new PublicKey(data.walletAddress),
        authMethod: 'facebook',
        email: data.email,
        name: data.name,
        avatar: data.avatar,
      };

      setUser(userData);
      localStorage.setItem('nft-evo-user', JSON.stringify({
        ...userData,
        publicKey: data.walletAddress // Store as string
      }));

      return true;
    } catch (error) {
      console.error('Facebook login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('nft-evo-user');
  };

  const isConnected = user !== null;

  const value: AuthContextType = {
    user,
    isLoading,
    loginWithEmail,
    loginWithGoogle,
    loginWithFacebook,
    logout,
    isConnected,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
