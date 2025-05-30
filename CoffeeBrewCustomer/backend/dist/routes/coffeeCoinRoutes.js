"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/coffeeCoinRoutes.ts
const express_1 = require("express");
const blockchainService_1 = require("../services/blockchainService");
const authMiddleware_1 = require("../middleware/authMiddleware");
const ethers_1 = require("ethers");
const router = (0, express_1.Router)();
router.get('/info', (async (req, res, next) => {
    try {
        const name = await (0, blockchainService_1.getTokenName)();
        const symbol = await (0, blockchainService_1.getTokenSymbol)();
        return res.json({ name, symbol });
    }
    catch (error) {
        console.error('Error /info:', error);
        return res.status(500).json({ error: 'Failed to fetch token info' });
    }
}));
router.get('/total-supply', (async (req, res, next) => {
    try {
        const totalSupply = await (0, blockchainService_1.getTotalSupply)();
        return res.json({ totalSupply: totalSupply.toString() });
    }
    catch (error) {
        console.error('Error /total-supply:', error);
        return res.status(500).json({ error: 'Failed to fetch total supply' });
    }
}));
router.get('/balance/:userAddress', (async (req, res, next) => {
    const { userAddress } = req.params;
    if (!ethers_1.ethers.isAddress(userAddress))
        return res.status(400).json({ error: 'Invalid user address format.' });
    try {
        const balance = await (0, blockchainService_1.getCoffeeCoinBalance)(userAddress);
        return res.json({ userAddress, balance: balance.toString() });
    }
    catch (error) {
        console.error(`Error /balance/${userAddress}:`, error);
        if (error.message?.includes('Invalid user address'))
            return res.status(400).json({ error: error.message });
        return res.status(500).json({ error: 'Failed to fetch balance' });
    }
}));
router.post('/earn-points', authMiddleware_1.authenticateUser, (async (req, res, next) => {
    const user = req.user;
    if (!user?.wallet?.address) {
        return res.status(401).json({ error: 'User or wallet not authenticated/found.' });
    }
    const { pointsToEarn } = req.body;
    if (typeof pointsToEarn === 'undefined') {
        return res.status(400).json({ error: 'pointsToEarn is required in request body.' });
    }
    let dripResult = null;
    try {
        // --- Attempt ETH Drip BEFORE minting points ---
        // This is non-blocking for the main earn-points flow; if drip fails, minting still proceeds.
        console.log(`[Route /earn-points] Checking ETH drip eligibility for ${user.wallet.address}`);
        dripResult = await (0, blockchainService_1.attemptAutoEthDrip)(user.wallet.address);
        console.log(`[Route /earn-points] ETH Drip attempt result: ${dripResult.message}`);
        // We don't return based on dripResult here, just log it. The minting is the primary action.
    }
    catch (dripError) {
        console.error(`[Route /earn-points] Error during ETH drip attempt (non-critical for minting): ${dripError.message}`);
        // Log but don't stop the minting process for a drip failure
    }
    try {
        const amountBigInt = BigInt(String(pointsToEarn));
        if (amountBigInt <= 0n) {
            return res.status(400).json({ error: 'pointsToEarn must be a positive number.' });
        }
        const txHash = await (0, blockchainService_1.mintCoffeeCoins)(user.wallet.address, amountBigInt);
        const newBalance = await (0, blockchainService_1.getCoffeeCoinBalance)(user.wallet.address); // Fetch new CFC balance
        return res.status(200).json({
            message: `${amountBigInt} CoffeeCoins successfully minted!`,
            transactionHash: txHash,
            recipientAddress: user.wallet.address,
            newBalance: newBalance.toString(),
            ethDripStatus: dripResult ? dripResult.message : "ETH drip check not performed or errored." // Include drip status
        });
    }
    catch (error) {
        console.error('Error in /earn-points (mint) route:', error);
        return res.status(500).json({
            error: `Failed to mint CoffeeCoins: ${error.message || 'Unknown server error'}`,
            ethDripStatus: dripResult ? dripResult.message : "ETH drip check not performed or errored."
        });
    }
}));
router.post('/record-redemption', authMiddleware_1.authenticateUser, (async (req, res, next) => {
    const user = req.user;
    if (!user?.privyDid)
        return res.status(401).json({ error: 'User not authenticated.' });
    const { rewardId, pointsBurned, burnTransactionHash } = req.body;
    if (!rewardId || typeof pointsBurned === 'undefined' || !burnTransactionHash) {
        return res.status(400).json({ error: 'Missing required fields for redemption record.' });
    }
    try {
        const pointsBigInt = BigInt(String(pointsBurned));
        if (pointsBigInt <= 0n)
            return res.status(400).json({ error: 'pointsBurned must be positive.' });
        console.log(`Backend: Recording redemption for user ${user.privyDid}, reward ${rewardId}, points ${pointsBigInt}, tx ${burnTransactionHash}`);
        const voucherCode = `VOUCHER-${String(rewardId).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        return res.status(200).json({ message: `Redemption for '${rewardId}' recorded.`, voucherCode, rewardId, pointsBurned: pointsBigInt.toString() });
    }
    catch (error) {
        console.error('Error /record-redemption:', error);
        return res.status(500).json({ error: `Recording redemption failed: ${error.message || 'Server error'}` });
    }
}));
router.get('/transaction-history', authMiddleware_1.authenticateUser, (async (req, res, next) => {
    const user = req.user;
    if (!user?.wallet?.address)
        return res.status(401).json({ error: 'User/wallet not found for history.' });
    try {
        const history = await (0, blockchainService_1.getCoffeeCoinTransactionHistory)(user.wallet.address);
        return res.json(history);
    }
    catch (error) {
        console.error(`Error /transaction-history for ${user.wallet.address}:`, error);
        return res.status(500).json({ error: `History fetch failed: ${error.message || 'Server error'}` });
    }
}));
exports.default = router;
//# sourceMappingURL=coffeeCoinRoutes.js.map