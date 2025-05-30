"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateUser = void 0;
const privy_1 = __importDefault(require("../config/privy")); // Assuming privyClient is initialized here
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config(); // Ensure .env is loaded if not already globally
// Load the verification key from .env
const privyAppVerificationKey = process.env.PRIVY_APP_VERIFICATION_KEY;
const authenticateUser = async (req, res, next) => {
    if (!privy_1.default) {
        console.error("BACKEND DEBUG: Privy client is not initialized.");
        res.status(500).json({ error: 'Authentication service not configured (client).' });
        return;
    }
    // Check if verification key is loaded
    if (!privyAppVerificationKey) {
        console.error("BACKEND DEBUG: PRIVY_APP_VERIFICATION_KEY is not set in .env. Cannot verify tokens securely offline.");
        // Fallback to online verification or fail, depending on policy.
        // For now, let's try to proceed with online verification if key is missing,
        // but log a strong warning. Or you could choose to fail here.
        // For this test, let's make it mandatory to have the key.
        res.status(500).json({ error: 'Authentication service not configured (verification key missing).' });
        return;
    }
    console.log("BACKEND DEBUG: authenticateUser middleware entered. Using verification key.");
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log("BACKEND DEBUG: Auth header missing or not Bearer.");
        res.status(401).json({ error: 'Unauthorized: Missing or invalid Authorization header' });
        return;
    }
    const authToken = authHeader.substring(7);
    // console.log("BACKEND DEBUG: Extracted Auth Token (first 10 chars):", authToken.substring(0, 10) + "...");
    try {
        console.log("BACKEND DEBUG: Attempting to verify auth token with Privy using provided verification key...");
        // --- USE THE VERIFICATION KEY ---
        const verifiedClaims = await privy_1.default.verifyAuthToken(authToken, privyAppVerificationKey);
        console.log("BACKEND DEBUG: Auth token VERIFIED SUCCESSFULLY (with key)!");
        console.log("BACKEND DEBUG: Verified Claims (Privy DID):", verifiedClaims.userId);
        // console.log("BACKEND DEBUG: Verified Claims (App ID):", verifiedClaims.appId);
        // console.log("BACKEND DEBUG: Verified Claims (Issued At):", new Date(verifiedClaims.issuedAt).toISOString());
        // console.log("BACKEND DEBUG: Verified Claims (Expires At):", new Date(verifiedClaims.expiresAt).toISOString());
        req.verifiedPrivyDid = verifiedClaims.userId;
        // --- Re-enable fetching the full user object and wallet detection ---
        const privyUserObject = await privy_1.default.getUser(verifiedClaims.userId);
        if (!privyUserObject) {
            console.warn(`BACKEND DEBUG: User not found via getUser for DID: ${verifiedClaims.userId} (after token verification)`);
            // This shouldn't happen if token is valid, but good to check
            // Proceeding with just the DID from token for now.
            // Or you could choose to error out:
            // res.status(404).json({ error: 'User associated with token not found' });
            // return;
        }
        else {
            console.log("BACKEND DEBUG: Successfully fetched user object with privyClient.getUser()");
            let targetWalletForBackend = undefined;
            const expectedChainIdString = '11155111';
            const expectedChainIdCAIP = `eip155:${expectedChainIdString}`;
            const checkAndAssignWallet = (walletSource) => {
                if (walletSource && typeof walletSource.address === 'string' && walletSource.walletClientType === 'privy' && walletSource.chainType === 'ethereum') {
                    const currentChainId = String(walletSource.chainId); // Assuming chainId might exist
                    // For embedded wallet, the chainId on the object might be less reliable than the defaultChainId context
                    // But if it IS present and matches, or if it's absent and we rely on defaultChainId, it's okay.
                    // The key is that Privy ensures it's on the defaultChainId when created.
                    // We just need to ensure it's an EVM Privy wallet.
                    targetWalletForBackend = {
                        address: walletSource.address,
                        chainId: currentChainId || expectedChainIdString, // Fallback to our app's known chainId
                        walletType: walletSource.walletClientType,
                        chainType: walletSource.chainType,
                    };
                    return true;
                }
                return false;
            };
            if (privyUserObject.wallet) {
                checkAndAssignWallet(privyUserObject.wallet);
            }
            if (!targetWalletForBackend && privyUserObject.linkedAccounts && Array.isArray(privyUserObject.linkedAccounts)) {
                for (const account of privyUserObject.linkedAccounts) {
                    if (account.type === 'wallet') {
                        if (checkAndAssignWallet(account))
                            break;
                    }
                }
            }
            // Extend req object correctly (ensure this matches your global declaration if you split it)
            if (!req.user)
                req.user = {}; // Initialize if not present
            req.user.privyDid = privyUserObject.id;
            req.user.privyUserRaw = privyUserObject; // For debugging
            req.user.wallet = targetWalletForBackend;
            if (!req.user.wallet) {
                console.warn(`BACKEND DEBUG: User ${privyUserObject.id} - No specific Sepolia embedded wallet found to forward.`);
            }
            else {
                console.log(`BACKEND DEBUG: Forwarding wallet for ${privyUserObject.id}:`, req.user.wallet);
            }
        }
        // --- End re-enabled user object and wallet detection ---
        next();
    }
    catch (error) {
        console.error('BACKEND DEBUG: Auth token verification FAILED (with key).');
        console.error('BACKEND DEBUG: Privy verifyAuthToken error:', error.message || error);
        if (error.status)
            console.error('BACKEND DEBUG: Privy error status:', error.status);
        if (error.code)
            console.error('BACKEND DEBUG: Privy error code:', error.code);
        let errorMessage = 'Unauthorized: Invalid token or backend authentication failure.';
        // ... (rest of error message formatting)
        res.status(401).json({ error: errorMessage, privyErrorDetails: error.message });
        return;
    }
};
exports.authenticateUser = authenticateUser;
//# sourceMappingURL=authMiddleware.js.map