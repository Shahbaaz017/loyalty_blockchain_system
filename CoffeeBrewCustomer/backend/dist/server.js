"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors")); // <<<<<<<<<<<<<<<<<<<<<< 1. IMPORT CORS
const authMiddleware_1 = require("./middleware/authMiddleware");
const coffeeCoinRoutes_1 = __importDefault(require("./routes/coffeeCoinRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes")); // <<< IMPORT NEW ADMIN ROUTES
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
// <<<<<<<<<<<<<<<<<<<<<< 2. USE CORS MIDDLEWARE *BEFORE* YOUR ROUTES
// This allows all origins. For development, this is usually fine.
// For production, you'd configure specific origins.
app.use((0, cors_1.default)());
// Middleware to parse JSON bodies - should come after CORS generally,
// though order with cors() isn't usually critical unless cors() itself needs req.body.
app.use(express_1.default.json());
// --- Health Check ---
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'UP', message: 'Backend is healthy!' });
});
// --- API Routes ---
app.use('/api/coffee-coin', coffeeCoinRoutes_1.default);
// backend/src/server.ts
// ...
app.get('/api/user/me', authMiddleware_1.authenticateUser, (req, res) => {
    const userFromRequest = req.user; // Use 'as any' or proper typing
    if (userFromRequest) {
        res.status(200).json({
            message: 'Successfully authenticated!',
            privyDid: userFromRequest.privyDid,
            wallet: userFromRequest.wallet,
        });
    }
    else {
        res.status(401).json({ error: 'User not authenticated or user data unavailable' });
    }
});
app.use('/api/admin', adminRoutes_1.default);
// ...
app.listen(port, () => {
    console.log(`Backend server is running on http://localhost:${port}`);
    setTimeout(() => {
        // Ensure blockchainService is required here so it initializes after env is loaded
        // and potentially after other initial setups if there were any.
        require('./services/blockchainService');
    }, 100);
});
//# sourceMappingURL=server.js.map