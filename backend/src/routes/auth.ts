import * as express from 'express';
import { authenticateWithEmail, authenticateWithSocial, storeUserAuth, createEmailUser, createSocialUser, getUserByWalletAddress } from '../authService';
import { 
  validateEmail, 
  validatePassword, 
  validateName, 
  validateToken, 
  handleValidationErrors,
  authRateLimit,
  walletConnectionRateLimit 
} from '../utils/security';
import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

const router = express.Router();

// Apply rate limiting to all auth routes
router.use(rateLimit(authRateLimit));

router.post('/email', 
  validateEmail(),
  validatePassword(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const userAuth = await authenticateWithEmail(email, password);
      await storeUserAuth(userAuth);
      
      res.json({
        success: true,
        walletAddress: userAuth.walletAddress,
        authMethod: userAuth.authMethod,
        email: userAuth.email
      });
    } catch (error: any) {
      console.error('Email authentication error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  }
);


router.post('/google', 
  validateEmail(),
  validateToken(),
  validateName(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { token, email, name, avatar } = req.body;
      
      const userAuth = await authenticateWithSocial({
        provider: 'google',
        token,
        email,
        name,
        avatar
      });
      
      await storeUserAuth(userAuth);
      
      res.json({
        success: true,
        walletAddress: userAuth.walletAddress,
        authMethod: userAuth.authMethod,
        email: userAuth.email,
        name: userAuth.name,
        avatar: userAuth.avatar
      });
    } catch (error: any) {
      console.error('Google authentication error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  }
);

router.post('/facebook', 
  validateEmail(),
  validateToken(),
  validateName(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { token, email, name, avatar } = req.body;
      
      const userAuth = await authenticateWithSocial({
        provider: 'facebook',
        token,
        email,
        name,
        avatar
      });
      
      await storeUserAuth(userAuth);
      
      res.json({
        success: true,
        walletAddress: userAuth.walletAddress,
        authMethod: userAuth.authMethod,
        email: userAuth.email,
        name: userAuth.name,
        avatar: userAuth.avatar
      });
    } catch (error: any) {
      console.error('Facebook authentication error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  }
);

router.post('/register/email', 
  validateEmail(),
  validatePassword(),
  validateName(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password, name } = req.body;
      
      const userAuth = await createEmailUser(email, password, name);
      
      res.json({
        success: true,
        walletAddress: userAuth.walletAddress,
        authMethod: userAuth.authMethod,
        email: userAuth.email,
        name: userAuth.name
      });
    } catch (error: any) {
      console.error('Email registration error:', error);
      if (error.message === 'User already exists') {
        res.status(409).json({ error: 'User already exists' });
      } else {
        res.status(500).json({ error: 'Registration failed' });
      }
    }
  }
);


router.post('/register/google', 
  validateEmail(),
  validateToken(),
  validateName(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { token, email, name, avatar } = req.body;
      
      const userAuth = await createSocialUser({
        provider: 'google',
        token,
        email,
        name,
        avatar
      });
      
      res.json({
        success: true,
        walletAddress: userAuth.walletAddress,
        authMethod: userAuth.authMethod,
        email: userAuth.email,
        name: userAuth.name,
        avatar: userAuth.avatar
      });
    } catch (error: any) {
      console.error('Google registration error:', error);
      if (error.message === 'User already exists') {
        res.status(409).json({ error: 'User already exists' });
      } else {
        res.status(500).json({ error: 'Registration failed' });
      }
    }
  }
);

router.post('/register/facebook', 
  validateEmail(),
  validateToken(),
  validateName(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { token, email, name, avatar } = req.body;
      
      const userAuth = await createSocialUser({
        provider: 'facebook',
        token,
        email,
        name,
        avatar
      });
      
      res.json({
        success: true,
        walletAddress: userAuth.walletAddress,
        authMethod: userAuth.authMethod,
        email: userAuth.email,
        name: userAuth.name,
        avatar: userAuth.avatar
      });
    } catch (error: any) {
      console.error('Facebook registration error:', error);
      if (error.message === 'User already exists') {
        res.status(409).json({ error: 'User already exists' });
      } else {
        res.status(500).json({ error: 'Registration failed' });
      }
    }
  }
);

/**
 * GET /auth/wallet-connection/:walletAddress
 * Get wallet connection data for email/social users
 */
router.get('/wallet-connection/:walletAddress', 
  rateLimit(walletConnectionRateLimit),
  async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;
    
    // Get user authentication data
    const userAuth = getUserByWalletAddress(walletAddress);
    if (!userAuth) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Only allow email/social users (not wallet users)
    if (userAuth.authMethod === 'wallet') {
      return res.status(400).json({ error: 'This endpoint is for email/social users only' });
    }
    
    if (!userAuth.keypair) {
      return res.status(400).json({ error: 'User keypair not available' });
    }
    
    // Return wallet connection data (excluding private key for security)
    res.json({
      success: true,
      walletAddress: userAuth.walletAddress,
      publicKey: userAuth.publicKey.toBase58(),
      authMethod: userAuth.authMethod,
      email: userAuth.email,
      name: userAuth.name,
      avatar: userAuth.avatar
    });
    
  } catch (error: any) {
    console.error('Error getting wallet connection data:', error);
    res.status(500).json({ 
      error: 'Failed to get wallet connection data',
      details: error.message 
    });
  }
});

export default router;
