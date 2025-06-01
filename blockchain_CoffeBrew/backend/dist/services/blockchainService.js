"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminRecentContractInteractions = exports.getAdminContractOverview = exports.attemptAutoEthDrip = exports.getCoffeeCoinTransactionHistory = exports.mintCoffeeCoins = exports.getCoffeeCoinBalance = exports.getTotalSupply = exports.getTokenSymbol = exports.getTokenName = void 0;
// backend/src/services/blockchainService.ts
const ethers_1 = require("ethers");
const dotenv_1 = __importDefault(require("dotenv"));
const axios_1 = __importDefault(require("axios"));
const CoffeeCoin_json_1 = __importDefault(require("../config/CoffeeCoin.json")); // Ensure this path is correct
dotenv_1.default.config();
// --- Environment Variables ---
const sepoliaRpcUrl = process.env.SEPOLIA_RPC_URL;
const coffeeCoinContractAddress = process.env.COFFEE_COIN_CONTRACT_ADDRESS;
const serverWalletPrivateKey = process.env.SERVER_WALLET_PRIVATE_KEY;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const ETHERSCAN_API_URL_SEPOLIA = 'https://api-sepolia.etherscan.io/api';
// --- CRITICAL STARTUP CHECKS ---
if (!sepoliaRpcUrl) {
    console.error("CRITICAL: SEPOLIA_RPC_URL is not defined in .env");
    throw new Error('SEPOLIA_RPC_URL is not defined in .env');
}
if (!coffeeCoinContractAddress) {
    console.error("CRITICAL: COFFEE_COIN_CONTRACT_ADDRESS is not defined in .env");
    throw new Error('COFFEE_COIN_CONTRACT_ADDRESS is not defined in .env');
}
if (!CoffeeCoin_json_1.default || !CoffeeCoin_json_1.default.abi) {
    console.error("CRITICAL: CoffeeCoin ABI is not loaded correctly or is missing the .abi property. Check path and file content.");
    throw new Error('CoffeeCoin ABI is not loaded correctly or is missing the .abi property');
}
if (!serverWalletPrivateKey && process.env.NODE_ENV !== 'test') {
    console.warn("WARNING: SERVER_WALLET_PRIVATE_KEY is not defined in .env. Minting and ETH Drip will fail if attempted.");
}
if (!ETHERSCAN_API_KEY && process.env.NODE_ENV !== 'test') {
    console.warn("WARNING: ETHERSCAN_API_KEY is not defined in .env. Enhanced admin overview and Etherscan-dependent features will fail or be limited.");
}
console.log("BlockchainService: Initial .env checks complete.");
// --- END CRITICAL STARTUP CHECKS ---
const provider = new ethers_1.JsonRpcProvider(sepoliaRpcUrl);
const coffeeCoinContract = new ethers_1.Contract(coffeeCoinContractAddress, CoffeeCoin_json_1.default.abi, provider);
const contractInterface = new ethers_1.Interface(CoffeeCoin_json_1.default.abi);
// --- Function Signatures for Parsing ---
const MINT_FUNCTION_SIG = 'mint(address,uint256)';
// This is optional, used if you want to track a specific burn function beyond just transfers to 0x0
const SPECIFIC_BURN_FUNCTION_SIG = 'redeemAndBurn(address,uint256)';
let MINT_FUNCTION_SIG_HASH = null;
let SPECIFIC_BURN_FUNCTION_SIG_HASH = null;
try {
    const mintFunction = contractInterface.getFunction(MINT_FUNCTION_SIG);
    if (mintFunction) {
        MINT_FUNCTION_SIG_HASH = mintFunction.selector;
        console.log(`[Service] Derived MINT_FUNCTION_SIG_HASH: ${MINT_FUNCTION_SIG_HASH} for ${MINT_FUNCTION_SIG}`);
    }
    else {
        console.warn(`[Service] Function signature '${MINT_FUNCTION_SIG}' not found in ABI. Total minted amount from this function won't be calculated via tx.input parsing.`);
    }
}
catch (e) {
    console.warn(`[Service] Error deriving MINT_FUNCTION_SIG_HASH for '${MINT_FUNCTION_SIG}'. Error: ${e.message}`);
}
try {
    const burnFunction = contractInterface.getFunction(SPECIFIC_BURN_FUNCTION_SIG);
    if (burnFunction) {
        SPECIFIC_BURN_FUNCTION_SIG_HASH = burnFunction.selector;
        console.log(`[Service] Derived SPECIFIC_BURN_FUNCTION_SIG_HASH: ${SPECIFIC_BURN_FUNCTION_SIG_HASH} for ${SPECIFIC_BURN_FUNCTION_SIG}`);
    }
    else {
        console.warn(`[Service] Function signature '${SPECIFIC_BURN_FUNCTION_SIG}' not found in ABI. It won't be specifically tracked for burn amounts if it has unique logic beyond sending to 0x0.`);
    }
}
catch (e) {
    console.warn(`[Service] Error deriving SPECIFIC_BURN_FUNCTION_SIG_HASH for '${SPECIFIC_BURN_FUNCTION_SIG}'. Error: ${e.message}`);
}
// --- STANDARD USER-FACING BLOCKCHAIN INTERACTION FUNCTIONS (using RPC) ---
const getTokenName = async () => {
    try {
        return await coffeeCoinContract.name();
    }
    catch (error) {
        console.error('[Service] Error fetching token name (RPC):', error);
        throw error;
    }
};
exports.getTokenName = getTokenName;
const getTokenSymbol = async () => {
    try {
        return await coffeeCoinContract.symbol();
    }
    catch (error) {
        console.error('[Service] Error fetching token symbol (RPC):', error);
        throw error;
    }
};
exports.getTokenSymbol = getTokenSymbol;
const getTotalSupply = async () => {
    try {
        return await coffeeCoinContract.totalSupply();
    }
    catch (error) {
        console.error('[Service] Error fetching total supply (RPC):', error);
        throw error;
    }
};
exports.getTotalSupply = getTotalSupply;
const getCoffeeCoinBalance = async (userAddress) => {
    if (!ethers_1.ethers.isAddress(userAddress))
        throw new Error('Invalid user address for balance check.');
    try {
        return await coffeeCoinContract.balanceOf(userAddress);
    }
    catch (error) {
        console.error(`[Service] Error fetching CFC balance for ${userAddress} (RPC): ${error.message}`);
        throw error;
    }
};
exports.getCoffeeCoinBalance = getCoffeeCoinBalance;
const mintCoffeeCoins = async (recipientAddress, amountInWholeTokens) => {
    if (!serverWalletPrivateKey)
        throw new Error('Minting service not configured: SERVER_WALLET_PRIVATE_KEY missing.');
    if (!ethers_1.ethers.isAddress(recipientAddress))
        throw new Error('Invalid recipient address for minting.');
    if (amountInWholeTokens <= 0n)
        throw new Error('Mint amount must be positive.');
    const signerWallet = new ethers_1.Wallet(serverWalletPrivateKey, provider);
    const contractWithSigner = coffeeCoinContract.connect(signerWallet);
    console.log(`[Service] Minting ${amountInWholeTokens} tokens to ${recipientAddress} via RPC...`);
    try {
        const tx = await contractWithSigner.mint(recipientAddress, amountInWholeTokens);
        console.log(`[Service] Minting tx sent (RPC): ${tx.hash}. Waiting for confirmation...`);
        const receipt = await tx.wait(1);
        if (receipt && receipt.status === 1) {
            console.log(`[Service] Mint successful (RPC). Tx: ${tx.hash}`);
            return tx.hash;
        }
        else {
            console.error(`[Service] Mint tx failed/reverted (RPC). Hash: ${tx.hash}, Status: ${receipt?.status}`);
            throw new Error(`Minting tx failed on-chain. Status: ${receipt?.status}. Hash: ${tx.hash}`);
        }
    }
    catch (error) {
        console.error(`[Service] Error during minting (RPC): ${error.message}`, error);
        const reason = error.reason || (error.data ? contractInterface.parseError(error.data)?.name : null) || error.message || 'Unknown RPC error';
        throw new Error(`Failed to mint tokens: ${reason}`);
    }
};
exports.mintCoffeeCoins = mintCoffeeCoins;
const getCoffeeCoinTransactionHistory = async (userAddress) => {
    console.log(`[Service TX_HISTORY_ETHERSCAN] For user: ${userAddress}`);
    if (!ETHERSCAN_API_KEY)
        throw new Error("Etherscan API key not configured for transaction history.");
    if (!coffeeCoinContractAddress)
        throw new Error("Contract address not configured for transaction history.");
    if (!ethers_1.ethers.isAddress(userAddress))
        throw new Error('Invalid user address for history.');
    const params = {
        module: 'account', action: 'tokentx', contractaddress: coffeeCoinContractAddress,
        address: userAddress, page: 1, offset: 100, // Get recent 100 token transactions
        startblock: 0, endblock: 99999999,
        sort: 'desc', apikey: ETHERSCAN_API_KEY,
    };
    try {
        const response = await axios_1.default.get(ETHERSCAN_API_URL_SEPOLIA, { params });
        if (response.data.status === "0") {
            if (response.data.message === "No transactions found" || response.data.message === "No records found")
                return [];
            console.error(`[Service TX_HISTORY_ETHERSCAN] Etherscan API error (tokentx): ${response.data.message}, Result: ${response.data.result}`);
            throw new Error(`Etherscan API error (tokentx): ${response.data.message}`);
        }
        const transactions = response.data.result;
        if (!Array.isArray(transactions)) {
            console.error("[Service TX_HISTORY_ETHERSCAN] Etherscan 'result' not an array:", response.data);
            return [];
        }
        return transactions.map((tx) => {
            let type;
            const amountString = BigInt(tx.value).toString();
            const userAddrLower = userAddress.toLowerCase();
            const txFromLower = tx.from.toLowerCase();
            const txToLower = tx.to.toLowerCase();
            if (txFromLower === ethers_1.ethers.ZeroAddress && txToLower === userAddrLower)
                type = 'earned';
            else if (txToLower === ethers_1.ethers.ZeroAddress && txFromLower === userAddrLower)
                type = 'redeemed';
            else if (txToLower === userAddrLower)
                type = 'received';
            else if (txFromLower === userAddrLower)
                type = 'sent';
            else {
                type = 'unknown_transfer';
            }
            return {
                transactionHash: tx.hash, blockNumber: parseInt(tx.blockNumber),
                timestamp: parseInt(tx.timeStamp), type: type, amount: amountString,
                from: tx.from, to: tx.to, tokenSymbol: tx.tokenSymbol || "CFC",
            };
        });
    }
    catch (error) {
        let errMsg = 'Unknown error fetching user tx history via Etherscan.';
        if (axios_1.default.isAxiosError(error))
            errMsg = `Axios error (tokentx): ${error.message}${error.response ? ` (Status: ${error.response.status})` : ''}`;
        else if (error instanceof Error)
            errMsg = error.message;
        console.error(`[Service TX_HISTORY_ETHERSCAN] Error: ${errMsg}`, error);
        throw new Error(errMsg);
    }
};
exports.getCoffeeCoinTransactionHistory = getCoffeeCoinTransactionHistory;
// --- AUTOMATED ETH DRIP / FAUCET SERVICE ---
const ETH_DRIP_AMOUNT_WEI = ethers_1.ethers.parseEther("0.01");
const MIN_ETH_BALANCE_FOR_NO_DRIP_WEI = ethers_1.ethers.parseEther("0.005");
const MAX_TX_COUNT_FOR_DRIP = 5;
async function checkWalletForDripEligibility(userAddress) {
    if (!ETHERSCAN_API_KEY)
        return { shouldDrip: false, ethBalanceWei: 0n, txCount: -1, message: "Etherscan API key missing for drip check." };
    if (!serverWalletPrivateKey)
        return { shouldDrip: false, ethBalanceWei: 0n, txCount: -1, message: "Server wallet missing for drip." };
    if (!ethers_1.ethers.isAddress(userAddress))
        return { shouldDrip: false, ethBalanceWei: 0n, txCount: -1, message: "Invalid user address for drip check." };
    try {
        const balanceParams = { module: 'account', action: 'balance', address: userAddress, tag: 'latest', apikey: ETHERSCAN_API_KEY };
        const balanceRes = await axios_1.default.get(ETHERSCAN_API_URL_SEPOLIA, { params: balanceParams });
        if (balanceRes.data.status !== "1")
            throw new Error(`Etherscan balance check error: ${balanceRes.data.message}`);
        const ethBalanceWei = BigInt(balanceRes.data.result);
        const txListParams = { module: 'account', action: 'txlist', address: userAddress, startblock: 0, endblock: 99999999, page: 1, offset: MAX_TX_COUNT_FOR_DRIP + 1, sort: 'asc', apikey: ETHERSCAN_API_KEY };
        const txListRes = await axios_1.default.get(ETHERSCAN_API_URL_SEPOLIA, { params: txListParams });
        if (txListRes.data.status !== "1" && txListRes.data.message !== "No transactions found") {
            throw new Error(`Etherscan txlist error: ${txListRes.data.message}`);
        }
        const txCount = Array.isArray(txListRes.data.result) ? txListRes.data.result.length : 0;
        console.log(`[Service ETH_DRIP_CHECK] User: ${userAddress}, ETH: ${ethers_1.ethers.formatEther(ethBalanceWei)}, TXs: ${txCount}`);
        if (ethBalanceWei < MIN_ETH_BALANCE_FOR_NO_DRIP_WEI && txCount < MAX_TX_COUNT_FOR_DRIP) {
            return { shouldDrip: true, ethBalanceWei, txCount, message: "Eligible for ETH drip." };
        }
        let reason = "";
        if (ethBalanceWei >= MIN_ETH_BALANCE_FOR_NO_DRIP_WEI)
            reason += `Has ${ethers_1.ethers.formatEther(ethBalanceWei)} ETH. `;
        if (txCount >= MAX_TX_COUNT_FOR_DRIP)
            reason += `Has ${txCount} TXs.`;
        return { shouldDrip: false, ethBalanceWei, txCount, message: `Not eligible. ${reason.trim()}` };
    }
    catch (error) {
        console.error(`[Service ETH_DRIP_CHECK] Error for ${userAddress}: ${error.message}`);
        return { shouldDrip: false, ethBalanceWei: 0n, txCount: -1, message: `Eligibility check error: ${error.message}` };
    }
}
const attemptAutoEthDrip = async (recipientAddress) => {
    console.log(`[Service AUTO_ETH_DRIP] Attempting for ${recipientAddress}`);
    if (!serverWalletPrivateKey)
        return { dripped: false, message: "Faucet (server wallet) not configured." };
    if (!ethers_1.ethers.isAddress(recipientAddress))
        return { dripped: false, message: "Invalid recipient address for ETH drip." };
    const eligibility = await checkWalletForDripEligibility(recipientAddress);
    if (!eligibility.shouldDrip) {
        console.log(`[Service AUTO_ETH_DRIP] Not eligible for ${recipientAddress}: ${eligibility.message}`);
        return { dripped: false, message: eligibility.message };
    }
    const signerWallet = new ethers_1.Wallet(serverWalletPrivateKey, provider);
    try {
        const faucetBalanceWei = await provider.getBalance(signerWallet.address);
        if (faucetBalanceWei < ETH_DRIP_AMOUNT_WEI) {
            console.warn(`[Service AUTO_ETH_DRIP] Faucet wallet ${signerWallet.address} has insufficient funds.`);
            return { dripped: false, message: 'Faucet wallet has insufficient funds.' };
        }
        const txRequest = { to: recipientAddress, value: ETH_DRIP_AMOUNT_WEI };
        console.log(`[Service AUTO_ETH_DRIP] Sending ${ethers_1.ethers.formatEther(ETH_DRIP_AMOUNT_WEI)} ETH to ${recipientAddress} from ${signerWallet.address}...`);
        const txResponse = await signerWallet.sendTransaction(txRequest);
        console.log(`[Service AUTO_ETH_DRIP] Test ETH tx sent: ${txResponse.hash}. Waiting for confirmation...`);
        await txResponse.wait(1);
        console.log(`[Service AUTO_ETH_DRIP] ETH drip confirmed for tx ${txResponse.hash}`);
        return { dripped: true, hash: txResponse.hash, message: `Successfully dripped ${ethers_1.ethers.formatEther(ETH_DRIP_AMOUNT_WEI)} ETH. Tx: ${txResponse.hash}` };
    }
    catch (error) {
        console.error(`[Service AUTO_ETH_DRIP] Error sending test ETH:`, error);
        return { dripped: false, message: `Failed to send test ETH: ${error.reason || error.message || 'Unknown error'}` };
    }
};
exports.attemptAutoEthDrip = attemptAutoEthDrip;
// Helper to fetch all paginated results from Etherscan
async function fetchAllEtherscanPages(baseUrl, initialParams, maxPages = 5) {
    let allResults = [];
    let currentPage = initialParams.page || 1;
    const offset = initialParams.offset || 1000;
    const action = initialParams.action;
    console.log(`[fetchAllEtherscanPages] Starting fetch for action '${action}', target '${initialParams.contractaddress || initialParams.address}', max ${maxPages} pages, offset ${offset}.`);
    for (let i = 0; i < maxPages; i++) {
        const params = { ...initialParams, page: currentPage, offset };
        try {
            const response = await axios_1.default.get(baseUrl, { params });
            if (response.data.status === "1" && Array.isArray(response.data.result) && response.data.result.length > 0) {
                allResults = allResults.concat(response.data.result);
                if (response.data.result.length < offset) {
                    console.log(`[fetchAllEtherscanPages] Fetched last page (${currentPage}) with ${response.data.result.length} results for ${action} (offset was ${offset}).`);
                    break;
                }
                currentPage++;
            }
            else if (response.data.status === "0" && (response.data.message === "No transactions found" || response.data.message === "No records found" || response.data.message.includes("Result window is too large"))) {
                console.log(`[fetchAllEtherscanPages] No (more) transactions found or Etherscan limitation for action '${action}' on page ${currentPage}. Message: ${response.data.message}`);
                break;
            }
            else if (response.data.status === "0") {
                console.warn(`[fetchAllEtherscanPages] Etherscan API error for action '${action}' on page ${currentPage}: ${response.data.message}. Result: ${response.data.result}. Stopping pagination.`);
                break;
            }
            else {
                console.warn(`[fetchAllEtherscanPages] Unexpected Etherscan response for action '${action}' on page ${currentPage}. Status: ${response.data.status}, Message: ${response.data.message}. Stopping pagination.`);
                break;
            }
        }
        catch (error) {
            console.error(`[fetchAllEtherscanPages] Axios error fetching page ${currentPage} for action '${action}': ${error.message}. Stopping pagination.`);
            break;
        }
        if (i < maxPages - 1) { // Don't sleep after the last attempt
            await new Promise(resolve => setTimeout(resolve, 300)); // Etherscan rate limit: ~5 req/sec. Be conservative.
        }
    }
    console.log(`[fetchAllEtherscanPages] Fetched ${allResults.length} total items for action '${action}' over ${currentPage - (initialParams.page || 1) + 1} attempted pages.`);
    return allResults;
}
const getAdminContractOverview = async () => {
    if (!coffeeCoinContractAddress) {
        throw new Error("Contract address not configured for admin overview.");
    }
    if (!ETHERSCAN_API_KEY) {
        console.warn("[AdminService] ETHERSCAN_API_KEY not set. Overview will be limited (no creator info, mint/burn stats, holder count, or tx count).");
        const [rpcTotalSupply, tokenName, tokenSymbol] = await Promise.all([
            (0, exports.getTotalSupply)(), (0, exports.getTokenName)(), (0, exports.getTokenSymbol)()
        ]);
        return {
            contractAddress: coffeeCoinContractAddress,
            creatorAddress: null,
            creationTxHash: null,
            totalSupply: rpcTotalSupply.toString(),
            tokenName,
            tokenSymbol,
        };
    }
    console.log(`[AdminService] Fetching full contract overview for ${coffeeCoinContractAddress}`);
    const [rpcTotalSupply, tokenName, tokenSymbol] = await Promise.all([
        (0, exports.getTotalSupply)(), (0, exports.getTokenName)(), (0, exports.getTokenSymbol)()
    ]);
    let creatorInfo = null;
    try {
        const params = { module: 'contract', action: 'getcontractcreation', contractaddresses: coffeeCoinContractAddress, apikey: ETHERSCAN_API_KEY };
        const response = await axios_1.default.get(ETHERSCAN_API_URL_SEPOLIA, { params });
        if (response.data.status === "1" && response.data.result?.[0]) {
            creatorInfo = response.data.result[0];
        }
        else
            console.warn("[AdminService] Could not fetch contract creation from Etherscan:", response.data.message);
    }
    catch (e) {
        console.warn("[AdminService] Error fetching contract creation from Etherscan:", e.message);
    }
    let totalMinted = 0n;
    let totalRedeemedToZeroAddress = 0n;
    let totalContractTransactions = 0;
    const MAX_PAGES_TXLIST_OVERVIEW = 5;
    console.log(`[AdminService] Fetching contract normal transactions (txlist for contract address), max ${MAX_PAGES_TXLIST_OVERVIEW} pages for mint sum...`);
    const txListParams = {
        module: 'account', action: 'txlist', address: coffeeCoinContractAddress,
        startblock: 0, endblock: 99999999, page: 1, offset: 1000,
        sort: 'asc', apikey: ETHERSCAN_API_KEY,
    };
    const contractTransactions = await fetchAllEtherscanPages(ETHERSCAN_API_URL_SEPOLIA, txListParams, MAX_PAGES_TXLIST_OVERVIEW);
    totalContractTransactions = contractTransactions.length;
    for (const tx of contractTransactions) {
        if (tx.isError === "0" && tx.input && tx.input !== "0x" && tx.input.length >= 10) {
            const sighash = tx.input.substring(0, 10);
            try {
                if (MINT_FUNCTION_SIG_HASH && sighash === MINT_FUNCTION_SIG_HASH) {
                    const decodedInput = contractInterface.decodeFunctionData(MINT_FUNCTION_SIG, tx.input);
                    if (decodedInput && decodedInput[1] !== undefined) { // amount is usually the second param (index 1)
                        totalMinted += BigInt(decodedInput[1].toString());
                    }
                }
                // If you have a SPECIFIC_BURN_FUNCTION_SIG_HASH and want to sum its amounts separately (e.g., it doesn't send to 0x0)
                // else if (SPECIFIC_BURN_FUNCTION_SIG_HASH && sighash === SPECIFIC_BURN_FUNCTION_SIG_HASH) { ... }
            }
            catch (e) {
                // console.warn(`[AdminService] Minor error decoding input for tx ${tx.hash} (sighash ${sighash}): ${e.message}`);
            }
        }
    }
    console.log(`[AdminService] Calculated from ${totalContractTransactions} contract txs: totalMinted (via mint func)=${totalMinted.toString()}`);
    // For totalRedeemedToZeroAddress and numberOfHolders, use 'tokentx' which tracks ERC20 Transfer events
    let numberOfHolders = 0;
    const MAX_PAGES_TOKENTX_OVERVIEW = 10;
    console.log(`[AdminService] Fetching all token transfers (tokentx for contract), max ${MAX_PAGES_TOKENTX_OVERVIEW} pages for redeemed/holder count...`);
    const tokenTxParams = {
        module: 'account', action: 'tokentx', contractaddress: coffeeCoinContractAddress,
        page: 1, offset: 1000,
        startblock: 0, endblock: 99999999,
        sort: 'asc', apikey: ETHERSCAN_API_KEY,
    };
    const allTokenTransfers = await fetchAllEtherscanPages(ETHERSCAN_API_URL_SEPOLIA, tokenTxParams, MAX_PAGES_TOKENTX_OVERVIEW);
    const uniqueAddresses = new Set();
    allTokenTransfers.forEach(tx => {
        if (tx.to && tx.to.toLowerCase() !== ethers_1.ethers.ZeroAddress.toLowerCase()) {
            uniqueAddresses.add(tx.to.toLowerCase());
        }
        // Sum up values for transfers TO the ZeroAddress
        if (tx.to && tx.to.toLowerCase() === ethers_1.ethers.ZeroAddress.toLowerCase()) {
            totalRedeemedToZeroAddress += BigInt(tx.value);
        }
    });
    numberOfHolders = uniqueAddresses.size;
    console.log(`[AdminService] Calculated from ${allTokenTransfers.length} token transfer events: totalRedeemedToZeroAddress=${totalRedeemedToZeroAddress.toString()}, numberOfHolders=${numberOfHolders}`);
    return {
        contractAddress: coffeeCoinContractAddress,
        creatorAddress: creatorInfo?.contractCreator || null,
        creationTxHash: creatorInfo?.txHash || null,
        totalSupply: rpcTotalSupply.toString(),
        tokenName,
        tokenSymbol,
        totalMinted: totalMinted > 0n ? totalMinted.toString() : undefined,
        totalRedeemedToZeroAddress: totalRedeemedToZeroAddress > 0n ? totalRedeemedToZeroAddress.toString() : undefined,
        numberOfHolders: numberOfHolders > 0 ? numberOfHolders : undefined,
        totalContractTransactions: totalContractTransactions > 0 ? totalContractTransactions : undefined,
    };
};
exports.getAdminContractOverview = getAdminContractOverview;
const getAdminRecentContractInteractions = async (page = 1, offset = 10) => {
    if (!ETHERSCAN_API_KEY)
        throw new Error("Etherscan API key not configured for recent interactions.");
    if (!coffeeCoinContractAddress)
        throw new Error("Contract Address missing for recent interactions.");
    if (!CoffeeCoin_json_1.default?.abi)
        throw new Error("CoffeeCoin ABI missing for decoding recent interactions.");
    console.log(`[AdminService] Fetching recent contract interactions for ${coffeeCoinContractAddress}, page: ${page}, offset: ${offset}`);
    try {
        const params = {
            module: 'account', action: 'txlist', address: coffeeCoinContractAddress,
            startblock: 0, endblock: 99999999, page: page, offset: offset,
            sort: 'desc', apikey: ETHERSCAN_API_KEY,
        };
        const response = await axios_1.default.get(ETHERSCAN_API_URL_SEPOLIA, { params });
        if (response.data.status === "1" && Array.isArray(response.data.result)) {
            return response.data.result.map((tx) => {
                let decodedFunctionName = "ETH Transfer or Direct Call";
                let methodId = tx.methodId || tx.input?.substring(0, 10) || "";
                if (tx.input && tx.input !== "0x" && tx.input.length >= 10) {
                    const sighash = tx.input.substring(0, 10);
                    methodId = sighash;
                    try {
                        const txDescription = contractInterface.getFunction(sighash);
                        // For mint, try to include the amount in the functionName for easier frontend display
                        if (txDescription?.name.toLowerCase() === 'mint' && MINT_FUNCTION_SIG_HASH && sighash === MINT_FUNCTION_SIG_HASH) {
                            const decodedInput = contractInterface.decodeFunctionData(MINT_FUNCTION_SIG, tx.input);
                            if (decodedInput && decodedInput[1] !== undefined) {
                                decodedFunctionName = `mint(..., ${decodedInput[1].toString()})`; // Shortened for display
                            }
                            else {
                                decodedFunctionName = `${txDescription.name}(...)`;
                            }
                        }
                        else {
                            decodedFunctionName = txDescription ? `${txDescription.name}(...)` : `${sighash} (Unknown)`;
                        }
                    }
                    catch (e) {
                        decodedFunctionName = `${sighash} (Unknown)`;
                    }
                }
                return {
                    blockNumber: tx.blockNumber,
                    timeStamp: tx.timeStamp,
                    hash: tx.hash,
                    from: tx.from,
                    to: tx.to,
                    value: tx.value,
                    contractAddress: tx.contractAddress || coffeeCoinContractAddress,
                    input: tx.input,
                    methodId: methodId,
                    functionName: decodedFunctionName,
                    isError: tx.isError,
                    gasUsed: tx.gasUsed,
                };
            });
        }
        else if (response.data.status === "0" && (response.data.message === "No transactions found" || response.data.message === "No records found")) {
            return [];
        }
        console.error(`[AdminService] Etherscan API error (txlist for recent interactions): ${response.data.message}, Result: ${response.data.result}`);
        throw new Error(response.data.message || "Could not fetch recent contract interactions from Etherscan.");
    }
    catch (error) {
        console.error("[AdminService] Error in getAdminRecentContractInteractions:", error.message, error);
        throw error;
    }
};
exports.getAdminRecentContractInteractions = getAdminRecentContractInteractions;
//# sourceMappingURL=blockchainService.js.map