"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateWalletFromEmail = generateWalletFromEmail;
exports.generateWalletFromSocial = generateWalletFromSocial;
exports.authenticateWithEmail = authenticateWithEmail;
exports.authenticateWithSocial = authenticateWithSocial;
exports.verifyWalletSignature = verifyWalletSignature;
exports.createEmailUser = createEmailUser;
exports.createSocialUser = createSocialUser;
exports.getUserByWalletAddress = getUserByWalletAddress;
exports.storeUserAuth = storeUserAuth;
const web3_js_1 = require("@solana/web3.js");
const crypto_1 = require("crypto");
const db_js_1 = require("../level-system/database/db.js");
function generateWalletFromEmail(email) {
    const seed = (0, crypto_1.createHash)('sha256').update(email.toLowerCase().trim()).digest();
    const keypair = web3_js_1.Keypair.fromSeed(seed);
    return {
        keypair,
        publicKey: keypair.publicKey
    };
}
function generateWalletFromSocial(provider, email, userId) {
    // Create a deterministic seed from provider + email + userId
    const seedData = `${provider}:${email}:${userId}`;
    const seed = (0, crypto_1.createHash)('sha256').update(seedData.toLowerCase().trim()).digest();
    // Generate keypair from seed
    const keypair = web3_js_1.Keypair.fromSeed(seed);
    return {
        keypair,
        publicKey: keypair.publicKey
    };
}

function authenticateWithEmail(email, password) {
    return __awaiter(this, void 0, void 0, function* () {
        const db = (0, db_js_1.getDatabase)();
        // Check if user exists
        const existingAuth = db.prepare(`
    SELECT * FROM user_auth 
    WHERE email = ? AND auth_method = 'email'
  `).get(email.toLowerCase().trim());
        if (!existingAuth) {
            throw new Error('User not found');
        }
        // Verify password (in a real implementation, you'd use bcrypt)
        const passwordHash = (0, crypto_1.createHash)('sha256').update(password).digest('hex');
        if (existingAuth.password_hash !== passwordHash) {
            throw new Error('Invalid password');
        }
        // Get or create user in users table
        let user = db.prepare(`
    SELECT * FROM users WHERE wallet_address = ?
  `).get(existingAuth.wallet_address);
        if (!user) {
            db.prepare(`
      INSERT INTO users (wallet_address) VALUES (?)
    `).run(existingAuth.wallet_address);
            user = { wallet_address: existingAuth.wallet_address, total_points: 0 };
        }
        const { keypair, publicKey } = generateWalletFromEmail(email);
        return {
            walletAddress: existingAuth.wallet_address,
            publicKey,
            keypair,
            authMethod: 'email',
            email: existingAuth.email,
            name: existingAuth.name,
            avatar: existingAuth.avatar_url
        };
    });
}
function authenticateWithSocial(request) {
    return __awaiter(this, void 0, void 0, function* () {
        const db = (0, db_js_1.getDatabase)();
        // Check if user exists
        const existingAuth = db.prepare(`
    SELECT * FROM user_auth 
    WHERE email = ? AND auth_method = ? AND social_provider_id = ?
  `).get(request.email.toLowerCase().trim(), request.provider, request.token);
        if (!existingAuth) {
            throw new Error('User not found');
        }
        // Get or create user in users table
        let user = db.prepare(`
    SELECT * FROM users WHERE wallet_address = ?
  `).get(existingAuth.wallet_address);
        if (!user) {
            db.prepare(`
      INSERT INTO users (wallet_address) VALUES (?)
    `).run(existingAuth.wallet_address);
            user = { wallet_address: existingAuth.wallet_address, total_points: 0 };
        }
        const { keypair, publicKey } = generateWalletFromSocial(request.provider, request.email, request.token);
        return {
            walletAddress: existingAuth.wallet_address,
            publicKey,
            keypair,
            authMethod: request.provider,
            email: existingAuth.email,
            name: existingAuth.name,
            avatar: existingAuth.avatar_url
        };
    });
}
function verifyWalletSignature(walletAddress, signature, message) {
    try {
        const publicKey = new web3_js_1.PublicKey(walletAddress);
        // TODO: Implement actual signature verification
        return true; // Placeholder
    }
    catch (error) {
        console.error('Signature verification error:', error);
        return false;
    }
}

function createEmailUser(email, password, name) {
    return __awaiter(this, void 0, void 0, function* () {
        const db = (0, db_js_1.getDatabase)();
        // Check if user already exists
        const existingAuth = db.prepare(`
    SELECT * FROM user_auth WHERE email = ?
  `).get(email.toLowerCase().trim());
        if (existingAuth) {
            throw new Error('User already exists');
        }
        // Generate wallet address
        const { keypair, publicKey } = generateWalletFromEmail(email);
        const walletAddress = publicKey.toBase58();
        // Hash password
        const passwordHash = (0, crypto_1.createHash)('sha256').update(password).digest('hex');
        // Insert into user_auth table
        db.prepare(`
    INSERT INTO user_auth (wallet_address, auth_method, email, password_hash, name)
    VALUES (?, 'email', ?, ?, ?)
  `).run(walletAddress, email.toLowerCase().trim(), passwordHash, name || null);
        // Insert into users table
        db.prepare(`
    INSERT INTO users (wallet_address) VALUES (?)
  `).run(walletAddress);
        return {
            walletAddress,
            publicKey,
            keypair,
            authMethod: 'email',
            email: email.toLowerCase().trim(),
            name: name || null
        };
    });
}

function createSocialUser(request) {
    return __awaiter(this, void 0, void 0, function* () {
        const db = (0, db_js_1.getDatabase)();
        // Check if user already exists
        const existingAuth = db.prepare(`
    SELECT * FROM user_auth 
    WHERE email = ? AND auth_method = ? AND social_provider_id = ?
  `).get(request.email.toLowerCase().trim(), request.provider, request.token);
        if (existingAuth) {
            throw new Error('User already exists');
        }
        // Generate wallet address
        const { keypair, publicKey } = generateWalletFromSocial(request.provider, request.email, request.token);
        const walletAddress = publicKey.toBase58();
        // Insert into user_auth table
        db.prepare(`
    INSERT INTO user_auth (wallet_address, auth_method, email, name, avatar_url, social_provider_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(walletAddress, request.provider, request.email.toLowerCase().trim(), request.name, request.avatar || null, request.token);
        // Insert into users table
        db.prepare(`
    INSERT INTO users (wallet_address) VALUES (?)
  `).run(walletAddress);
        return {
            walletAddress,
            publicKey,
            keypair,
            authMethod: request.provider,
            email: request.email.toLowerCase().trim(),
            name: request.name,
            avatar: request.avatar
        };
    });
}
function getUserByWalletAddress(walletAddress) {
    const db = (0, db_js_1.getDatabase)();
    const authData = db.prepare(`
    SELECT * FROM user_auth WHERE wallet_address = ?
  `).get(walletAddress);
    if (!authData) {
        return null;
    }
    return {
        walletAddress: authData.wallet_address,
        publicKey: new web3_js_1.PublicKey(authData.wallet_address),
        authMethod: authData.auth_method,
        email: authData.email,
        name: authData.name,
        avatar: authData.avatar_url
    };
}
function storeUserAuth(userAuth) {
    return __awaiter(this, void 0, void 0, function* () {
        const db = (0, db_js_1.getDatabase)();
        // Check if auth record exists
        const existingAuth = db.prepare(`
    SELECT * FROM user_auth WHERE wallet_address = ?
  `).get(userAuth.walletAddress);
        if (!existingAuth) {
            // Insert auth record
            db.prepare(`
      INSERT INTO user_auth (wallet_address, auth_method, email, name, avatar_url)
      VALUES (?, ?, ?, ?, ?)
    `).run(userAuth.walletAddress, userAuth.authMethod, userAuth.email || null, userAuth.name || null, userAuth.avatar || null);
        }
        // Ensure user exists in users table
        const existingUser = db.prepare(`
    SELECT * FROM users WHERE wallet_address = ?
  `).get(userAuth.walletAddress);
        if (!existingUser) {
            db.prepare(`
      INSERT INTO users (wallet_address) VALUES (?)
    `).run(userAuth.walletAddress);
        }
    });
}
