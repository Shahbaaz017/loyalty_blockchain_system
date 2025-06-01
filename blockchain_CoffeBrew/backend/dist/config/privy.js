"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/config/privy.ts
const server_auth_1 = require("@privy-io/server-auth");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const privyAppId = process.env.PRIVY_APP_ID;
const privyAppSecret = process.env.PRIVY_APP_SECRET;
if (!privyAppId || !privyAppSecret) {
    console.error('CRITICAL ERROR: Privy App ID or Secret is not defined in .env file for backend.');
    // Consider throwing an error or exiting if these are critical for app startup
    // For now, client will be null and features will fail.
}
// Initialize with null check for robustness, though they should be set
const privyClient = (privyAppId && privyAppSecret)
    ? new server_auth_1.PrivyClient(privyAppId, privyAppSecret)
    : null;
if (!privyClient) {
    console.warn("Privy client could not be initialized due to missing App ID or Secret. Backend auth features will be disabled.");
}
exports.default = privyClient;
//# sourceMappingURL=privy.js.map