// backend/src/config/privy.ts
import {PrivyClient} from '@privy-io/server-auth';
import dotenv from 'dotenv';

dotenv.config();

const privyAppId = process.env.PRIVY_APP_ID;
const privyAppSecret = process.env.PRIVY_APP_SECRET;

if (!privyAppId || !privyAppSecret) {
  console.error('CRITICAL ERROR: Privy App ID or Secret is not defined in .env file for backend.');
  // Consider throwing an error or exiting if these are critical for app startup
  // For now, client will be null and features will fail.
}

// Initialize with null check for robustness, though they should be set
const privyClient = (privyAppId && privyAppSecret) 
    ? new PrivyClient(privyAppId, privyAppSecret) 
    : null;

if (!privyClient) {
    console.warn("Privy client could not be initialized due to missing App ID or Secret. Backend auth features will be disabled.");
}

export default privyClient;