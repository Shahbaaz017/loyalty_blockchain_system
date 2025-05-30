// backend/src/routes/adminRoutes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { ethers } from 'ethers'; // For address validation and BigInt conversion
import {
    getAdminContractOverview,
    getAdminRecentContractInteractions,
    mintCoffeeCoins,
    getCoffeeCoinBalance,
    getCoffeeCoinTransactionHistory,
    attemptAutoEthDrip,
    // Import other admin-related service functions as you create them
} from '../services/blockchainService';
// import { requireAdminAuth } from '../middleware/adminAuthMiddleware'; // Placeholder for your admin auth

const router = Router();

// Define a generic async handler type for cleaner routes
type AdminAsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;

// --- TODO: Apply admin authentication middleware to all routes in this file ---
// Example:
// import { requireAdminAuth } from '../middleware/adminAuthMiddleware'; // Assume you create this
// router.use(requireAdminAuth);
// For now, we'll proceed without auth for easier testing, but this is CRITICAL for production.
// Ensure all POST/sensitive GET routes are protected.
// A simple placeholder middleware (REMOVE FOR PRODUCTION if not using a real one):
const placeholderAdminAuth = (req: Request, res: Response, next: NextFunction) => {
    console.warn('[AdminRoutes] WARNING: Using placeholder admin auth. Implement real authentication for production!');
    // In a real middleware, you'd check for a valid admin session/token
    // For example: if (!req.session.isAdmin) return res.status(401).json({ error: "Unauthorized" });
    next();
};
router.use(placeholderAdminAuth); // Apply placeholder for now

// --- Contract & General Admin Info Routes ---
router.get('/contract-overview', (async (req, res, next) => {
    try {
        const overview = await getAdminContractOverview();
        res.json(overview);
    } catch (error: any) {
        console.error("[AdminRoutes] Error fetching contract overview:", error.message, error.stack);
        res.status(500).json({ error: `Failed to fetch contract overview: ${error.message}` });
    }
}) as AdminAsyncHandler);

router.get('/contract-interactions', (async (req, res, next) => {
    try {
        const page = req.query.page ? parseInt(String(req.query.page)) : 1;
        const offset = req.query.offset ? parseInt(String(req.query.offset)) : 10;

        if (isNaN(page) || page < 1) {
            return res.status(400).json({ error: "Invalid 'page' parameter. Must be a number greater than or equal to 1." });
        }
        if (isNaN(offset) || offset < 1 || offset > 100) { // Etherscan usually limits offset
            return res.status(400).json({ error: "Invalid 'offset' parameter. Must be a number between 1 and 100." });
        }

        const interactions = await getAdminRecentContractInteractions(page, offset);
        res.json(interactions);
    } catch (error: any) {
        console.error("[AdminRoutes] Error fetching contract interactions:", error.message, error.stack);
        res.status(500).json({ error: `Failed to fetch contract interactions: ${error.message}` });
    }
}) as AdminAsyncHandler);


// --- Token Management Routes (Admin Only) ---

/**
 * @route   POST /api/admin/mint
 * @desc    Admin mints new CoffeeCoin tokens to a recipient
 * @access  Private (Admin Only - ensure auth middleware is applied)
 * @body    { "recipientAddress": "0x...", "amount": "100" } (amount in whole tokens)
 */
router.post('/mint', (async (req: Request, res: Response, next: NextFunction) => {
    const { recipientAddress, amount } = req.body;

    if (!recipientAddress || amount === undefined || amount === null) { // Check for amount presence
        return res.status(400).json({ error: "Missing 'recipientAddress' or 'amount' in request body." });
    }
    if (!ethers.isAddress(recipientAddress)) {
        return res.status(400).json({ error: "Invalid 'recipientAddress'." });
    }

    let amountBigInt: bigint;
    try {
        amountBigInt = BigInt(String(amount)); // Ensure amount is treated as string before BigInt
        if (amountBigInt <= 0n) {
            return res.status(400).json({ error: "'amount' must be a positive whole number." });
        }
    } catch (e) {
        return res.status(400).json({ error: "'amount' must be a valid whole number string." });
    }

    try {
        console.log(`[AdminRoutes] Admin attempting to mint ${amountBigInt.toString()} tokens to ${recipientAddress}`);
        const txHash = await mintCoffeeCoins(recipientAddress, amountBigInt);
        res.json({ success: true, message: `Successfully initiated minting of ${amountBigInt.toString()} tokens to ${recipientAddress}.`, transactionHash: txHash });
    } catch (error: any) {
        console.error("[AdminRoutes] Error minting tokens:", error.message, error.stack);
        res.status(500).json({ error: `Failed to mint tokens: ${error.message}` });
    }
}) as AdminAsyncHandler);


// --- User Specific Information Routes (Admin Access) ---

/**
 * @route   GET /api/admin/user/:address/balance
 * @desc    Admin checks a user's CoffeeCoin balance
 * @access  Private (Admin Only - ensure auth middleware is applied)
 * @param   address - The user's Ethereum address
 */
router.get('/user/:address/balance', (async (req: Request, res: Response, next: NextFunction) => {
    const { address } = req.params;

    if (!ethers.isAddress(address)) {
        return res.status(400).json({ error: "Invalid user address provided in path." });
    }

    try {
        const balance = await getCoffeeCoinBalance(address);
        // Balance is a BigInt, convert to string for JSON response.
        // Frontend will handle display (e.g., formatting with decimals if applicable).
        res.json({ address, balance: balance.toString() });
    } catch (error: any) {
        console.error(`[AdminRoutes] Error fetching balance for ${address}:`, error.message, error.stack);
        res.status(500).json({ error: `Failed to fetch balance for ${address}: ${error.message}` });
    }
}) as AdminAsyncHandler);

/**
 * @route   GET /api/admin/user/:address/history
 * @desc    Admin retrieves a user's CoffeeCoin transaction history
 * @access  Private (Admin Only - ensure auth middleware is applied)
 * @param   address - The user's Ethereum address
 */
router.get('/user/:address/history', (async (req: Request, res: Response, next: NextFunction) => {
    const { address } = req.params;

    if (!ethers.isAddress(address)) {
        return res.status(400).json({ error: "Invalid user address provided in path." });
    }

    try {
        const history = await getCoffeeCoinTransactionHistory(address);
        res.json(history); // history is already an array of FormattedEvent
    } catch (error: any) {
        console.error(`[AdminRoutes] Error fetching transaction history for ${address}:`, error.message, error.stack);
        res.status(500).json({ error: `Failed to fetch transaction history for ${address}: ${error.message}` });
    }
}) as AdminAsyncHandler);

// --- Faucet Management (Admin Only) ---

/**
 * @route   POST /api/admin/faucet/drip
 * @desc    Admin manually triggers an ETH drip to a recipient (e.g., for testing or specific user assistance)
 * @access  Private (Admin Only - ensure auth middleware is applied)
 * @body    { "recipientAddress": "0x..." }
 */
router.post('/faucet/drip', (async (req: Request, res: Response, next: NextFunction) => {
    const { recipientAddress } = req.body;

    if (!recipientAddress) {
        return res.status(400).json({ error: "Missing 'recipientAddress' in request body." });
    }
    if (!ethers.isAddress(recipientAddress)) {
        return res.status(400).json({ error: "Invalid 'recipientAddress'." });
    }

    try {
        console.log(`[AdminRoutes] Admin attempting manual ETH drip to ${recipientAddress}`);
        const dripResult = await attemptAutoEthDrip(recipientAddress);

        // Respond based on the outcome of the drip attempt
        if (dripResult.dripped) {
            res.json({ success: true, ...dripResult });
        } else {
            // If not dripped, the message field contains the reason.
            // Decide on appropriate status code: 422 if not eligible, 503 if faucet issue, etc.
            // For simplicity, returning 200 with success:false and the message.
            // A more specific error like 409 (Conflict if user already has ETH) or 422 (Unprocessable if not new) could be used.
            let statusCode = 200;
            if (dripResult.message.includes("Faucet wallet has insufficient funds")) {
                statusCode = 503; // Service Unavailable
            } else if (dripResult.message.includes("Not eligible")) {
                statusCode = 409; // Conflict or 422 Unprocessable Entity
            }
            res.status(statusCode).json({ success: false, ...dripResult });
        }
    } catch (error: any) {
        console.error("[AdminRoutes] Error triggering ETH drip:", error.message, error.stack);
        res.status(500).json({ error: `Failed to trigger ETH drip: ${error.message}` });
    }
}) as AdminAsyncHandler);

export default router;