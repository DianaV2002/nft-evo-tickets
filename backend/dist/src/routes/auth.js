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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authService_js_1 = require("./authService.js");
const router = express_1.default.Router();
/**
 * POST /auth/email
 * Authenticate with email and password
 */
router.post('/email', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        const userAuth = yield (0, authService_js_1.authenticateWithEmail)(email, password);
        yield (0, authService_js_1.storeUserAuth)(userAuth);
        res.json({
            success: true,
            walletAddress: userAuth.walletAddress,
            authMethod: userAuth.authMethod,
            email: userAuth.email
        });
    }
    catch (error) {
        console.error('Email authentication error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
}));
/**
 * POST /auth/google
 * Authenticate with Google OAuth
 */
router.post('/google', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { token, email, name, avatar } = req.body;
        if (!token || !email || !name) {
            return res.status(400).json({ error: 'Google token, email, and name are required' });
        }
        const userAuth = yield (0, authService_js_1.authenticateWithSocial)({
            provider: 'google',
            token,
            email,
            name,
            avatar
        });
        yield (0, authService_js_1.storeUserAuth)(userAuth);
        res.json({
            success: true,
            walletAddress: userAuth.walletAddress,
            authMethod: userAuth.authMethod,
            email: userAuth.email,
            name: userAuth.name,
            avatar: userAuth.avatar
        });
    }
    catch (error) {
        console.error('Google authentication error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
}));
/**
 * POST /auth/facebook
 * Authenticate with Facebook OAuth
 */
router.post('/facebook', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { token, email, name, avatar } = req.body;
        if (!token || !email || !name) {
            return res.status(400).json({ error: 'Facebook token, email, and name are required' });
        }
        const userAuth = yield (0, authService_js_1.authenticateWithSocial)({
            provider: 'facebook',
            token,
            email,
            name,
            avatar
        });
        yield (0, authService_js_1.storeUserAuth)(userAuth);
        res.json({
            success: true,
            walletAddress: userAuth.walletAddress,
            authMethod: userAuth.authMethod,
            email: userAuth.email,
            name: userAuth.name,
            avatar: userAuth.avatar
        });
    }
    catch (error) {
        console.error('Facebook authentication error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
}));
/**
 * POST /auth/register/email
 * Register new user with email and password
 */
router.post('/register/email', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password, name } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        const userAuth = yield (0, authService_js_1.createEmailUser)(email, password, name);
        res.json({
            success: true,
            walletAddress: userAuth.walletAddress,
            authMethod: userAuth.authMethod,
            email: userAuth.email,
            name: userAuth.name
        });
    }
    catch (error) {
        console.error('Email registration error:', error);
        if (error.message === 'User already exists') {
            res.status(409).json({ error: 'User already exists' });
        }
        else {
            res.status(500).json({ error: 'Registration failed' });
        }
    }
}));
/**
 * POST /auth/register/google
 * Register new user with Google OAuth
 */
router.post('/register/google', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { token, email, name, avatar } = req.body;
        if (!token || !email || !name) {
            return res.status(400).json({ error: 'Google token, email, and name are required' });
        }
        const userAuth = yield (0, authService_js_1.createSocialUser)({
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
    }
    catch (error) {
        console.error('Google registration error:', error);
        if (error.message === 'User already exists') {
            res.status(409).json({ error: 'User already exists' });
        }
        else {
            res.status(500).json({ error: 'Registration failed' });
        }
    }
}));
/**
 * POST /auth/register/facebook
 * Register new user with Facebook OAuth
 */
router.post('/register/facebook', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { token, email, name, avatar } = req.body;
        if (!token || !email || !name) {
            return res.status(400).json({ error: 'Facebook token, email, and name are required' });
        }
        const userAuth = yield (0, authService_js_1.createSocialUser)({
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
    }
    catch (error) {
        console.error('Facebook registration error:', error);
        if (error.message === 'User already exists') {
            res.status(409).json({ error: 'User already exists' });
        }
        else {
            res.status(500).json({ error: 'Registration failed' });
        }
    }
}));
exports.default = router;
