import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider, useWalletModal } from '@solana/wallet-adapter-react-ui';

interface EmailLoginProps {
  onSuccess?: () => void;
  isRegister?: boolean;
  setIsRegister?: (value: boolean) => void;
}

export function EmailLogin({ onSuccess, isRegister = false, setIsRegister }: EmailLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const { loginWithEmail } = useAuth();

  // Password validation function
  const validatePassword = (pwd: string) => {
    const errors: string[] = [];
    if (pwd.length < 8) errors.push('At least 8 characters');
    if (!/[a-z]/.test(pwd)) errors.push('One lowercase letter');
    if (!/[A-Z]/.test(pwd)) errors.push('One uppercase letter');
    if (!/\d/.test(pwd)) errors.push('One number');
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) errors.push('One special character');
    return errors;
  };

  const passwordErrors = validatePassword(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors([]);
    
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (isRegister && !name) {
      toast.error('Please enter your name');
      return;
    }

    // Check password validation for registration
    if (isRegister && passwordErrors.length > 0) {
      setValidationErrors(passwordErrors);
      toast.error('Password does not meet requirements');
      return;
    }

    setIsLoading(true);
    try {
      if (isRegister) {
        // Register new user
        const response = await fetch('/api/auth/register/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password, name }),
        });

        if (!response.ok) {
          let parsedError: any = null;
          try {
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
              parsedError = await response.json();
            } else {
              const text = await response.text();
              parsedError = text ? { error: text } : null;
            }
          } catch (_) {
            parsedError = null;
          }

          if (response.status === 409) {
            toast.error('An account with this email already exists. Please sign in instead.');
            setIsRegister?.(false);
            return;
          } else if (response.status === 400) {
            if (parsedError?.details && Array.isArray(parsedError.details)) {
              const backendErrors = parsedError.details.map((detail: any) => detail.message);
              setValidationErrors(backendErrors);
              toast.error('Please fix the validation errors below');
            } else {
              toast.error(parsedError?.error || 'Please check your input and try again');
            }
            return;
          } else if (response.status === 429) {
            toast.error('Too many attempts. Please wait a few minutes before trying again.');
            return;
          } else {
            toast.error(parsedError?.error || 'Registration failed. Please try again.');
            return;
          }
        }

        const data = await response.json();
        toast.success('Account created successfully! Please sign in.');
        // Switch to login mode
        setIsRegister(false);
        setName('');
        setPassword('');
        setValidationErrors([]);
      } else {
        // Login existing user
        try {
          const success = await loginWithEmail(email, password);
          if (success) {
            toast.success('Logged in successfully!');
            onSuccess?.();
          } else {
            toast.error('Login failed. Please check your credentials.');
          }
        } catch (error: any) {
          toast.error(error.message || 'Login failed. Please try again.');
        }
      }
    } catch (error) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">
          {isRegister ? 'Create Account' : 'Sign in with Email'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={validationErrors.some(error => error.includes('Name')) ? 'border-red-500' : ''}
                required
              />
              {validationErrors.some(error => error.includes('Name')) && (
                <div className="text-xs text-red-500 space-y-1">
                  {validationErrors.filter(error => error.includes('Name')).map((error, index) => (
                    <p key={index}>• {error}</p>
                  ))}
                </div>
              )}
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`pl-10 ${validationErrors.some(error => error.includes('email') || error.includes('Email')) ? 'border-red-500' : ''}`}
                required
              />
            </div>
            {validationErrors.some(error => error.includes('email') || error.includes('Email')) && (
              <div className="text-xs text-red-500 space-y-1">
                {validationErrors.filter(error => error.includes('email') || error.includes('Email')).map((error, index) => (
                  <p key={index}>• {error}</p>
                ))}
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`pl-10 pr-10 ${validationErrors.length > 0 ? 'border-red-500' : ''}`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            
            {/* Password requirements for registration */}
            {isRegister && password && (
              <div className="text-xs space-y-1">
                <p className="text-muted-foreground">Password must contain:</p>
                <ul className="space-y-1">
                  <li className={`flex items-center ${password.length >= 8 ? 'text-green-600' : 'text-red-500'}`}>
                    <span className="mr-2">{password.length >= 8 ? '✓' : '✗'}</span>
                    At least 8 characters
                  </li>
                  <li className={`flex items-center ${/[a-z]/.test(password) ? 'text-green-600' : 'text-red-500'}`}>
                    <span className="mr-2">{/[a-z]/.test(password) ? '✓' : '✗'}</span>
                    One lowercase letter
                  </li>
                  <li className={`flex items-center ${/[A-Z]/.test(password) ? 'text-green-600' : 'text-red-500'}`}>
                    <span className="mr-2">{/[A-Z]/.test(password) ? '✓' : '✗'}</span>
                    One uppercase letter
                  </li>
                  <li className={`flex items-center ${/\d/.test(password) ? 'text-green-600' : 'text-red-500'}`}>
                    <span className="mr-2">{/\d/.test(password) ? '✓' : '✗'}</span>
                    One number
                  </li>
                  <li className={`flex items-center ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? 'text-green-600' : 'text-red-500'}`}>
                    <span className="mr-2">{/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? '✓' : '✗'}</span>
                    One special character
                  </li>
                </ul>
              </div>
            )}
            
            {/* Validation error messages */}
            {validationErrors.length > 0 && (
              <div className="text-xs text-red-500 space-y-1">
                {validationErrors.map((error, index) => (
                  <p key={index}>• {error}</p>
                ))}
              </div>
            )}
          </div>

          <Button 
            type="submit" 
            className="w-full bg-gradient-primary" 
            disabled={isLoading || (isRegister && passwordErrors.length > 0)}
          >
            {isLoading ? (isRegister ? 'Creating Account...' : 'Signing in...') : (isRegister ? 'Create Account' : 'Sign In')}
          </Button>
          
          {/* Password strength indicator for registration */}
          {isRegister && password && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Password strength:</span>
                <span className={`font-medium ${
                  passwordErrors.length === 0 ? 'text-green-600' :
                  passwordErrors.length <= 2 ? 'text-yellow-600' :
                  'text-red-500'
                }`}>
                  {passwordErrors.length === 0 ? 'Strong' :
                   passwordErrors.length <= 2 ? 'Medium' :
                   'Weak'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    passwordErrors.length === 0 ? 'bg-green-500 w-full' :
                    passwordErrors.length <= 2 ? 'bg-yellow-500 w-2/3' :
                    'bg-red-500 w-1/3'
                  }`}
                />
              </div>
            </div>
          )}
        </form>

        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            {isRegister ? 'Already have an account? ' : "Don't have an account? "}
            <button 
              className="text-primary hover:underline"
              onClick={() => setIsRegister?.(!isRegister)}
            >
              {isRegister ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

interface SocialLoginProps {
  onSuccess?: () => void;
  isRegister?: boolean;
}

export function SocialLogin({ onSuccess, isRegister = false }: SocialLoginProps) {
  const { loginWithGoogle, loginWithFacebook } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      // Show OAuth development message
      toast.info('Google OAuth integration is currently in development. Please use email login or connect your wallet for now.', {
        duration: 5000,
      });
      
      // Optional: You could also show a modal with more details
      console.log('Google OAuth is being developed. Users should use email login or wallet connection.');
      
    } catch (error) {
      toast.error('Google authentication is not yet available');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    setIsLoading(true);
    try {
      // Show OAuth development message
      toast.info('Facebook OAuth integration is currently in development. Please use email login or connect your wallet for now.', {
        duration: 5000,
      });
      
      console.log('Facebook OAuth is being developed. Users should use email login or wallet connection.');
      
    } catch (error) {
      toast.error('Facebook authentication is not yet available');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={handleGoogleLogin}
        disabled={isLoading}
        className="w-full bg-white text-gray-500 hover:bg-gray-50 border border-gray-200 opacity-75 cursor-not-allowed"
      >
        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google (Coming Soon)
      </Button>

      <Button
        onClick={handleFacebookLogin}
        disabled={isLoading}
        className="w-full bg-[#1877F2] text-white hover:bg-[#166FE5]"
      >
        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
        Continue with Facebook (Coming Soon)
      </Button>
    </div>
  );
}

interface LoginOptionsProps {
  onSuccess?: () => void;
}

export function LoginOptions({ onSuccess }: LoginOptionsProps) {
  const [loginMethod, setLoginMethod] = useState<'wallet' | 'email' | 'social'>('wallet');
  const [isRegister, setIsRegister] = useState(false);
  const { setVisible } = useWalletModal();

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Login Method Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        <button
          onClick={() => setLoginMethod('wallet')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            loginMethod === 'wallet'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Wallet
        </button>
        <button
          onClick={() => setLoginMethod('email')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            loginMethod === 'email'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Email
        </button>
        <button
          onClick={() => setLoginMethod('social')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            loginMethod === 'social'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Social
        </button>
      </div>

      {/* Login Content */}
      {loginMethod === 'wallet' && (
        <div className="text-center space-y-4">
          <p className="text-muted-foreground mb-4">
            Connect your Solana wallet to get started
          </p>
          <div className="text-sm text-muted-foreground mb-6">
            <p>• Secure and decentralized</p>
            <p>• Full control of your assets</p>
            <p>• No personal data required</p>
            <p>• Supports Phantom & Solflare</p>
          </div>
          <Button
            onClick={() => setVisible(true)}
            className="bg-gradient-primary hover:opacity-90 transition-opacity rounded-lg px-8 py-6 text-lg font-medium"
          >
            Connect Wallet
          </Button>
        </div>
      )}

      {loginMethod === 'email' && (
        <EmailLogin onSuccess={onSuccess} isRegister={isRegister} setIsRegister={setIsRegister} />
      )}

      {loginMethod === 'social' && (
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-muted-foreground mb-2">
              {isRegister ? 'Sign up with your social account' : 'Sign in with your social account'}
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800">
                <strong>OAuth Integration in Development</strong>
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Google and Facebook login are being developed. Please use email login or connect your wallet for now.
              </p>
            </div>
          </div>
          <SocialLogin onSuccess={onSuccess} isRegister={isRegister} />
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              We'll create a wallet address for you automatically once OAuth is ready
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
