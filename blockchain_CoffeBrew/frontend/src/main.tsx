import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css'; // Global styles
import { PrivyProvider } from '@privy-io/react-auth';

const privyAppId = import.meta.env.VITE_PRIVY_APP_ID;

if (!privyAppId) {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif', color: '#333', background: '#f9f9f9', border: '1px solid #ddd', borderRadius: '8px', margin: '20px auto', maxWidth: '600px' }}>
          <h1 style={{color: '#d9534f'}}>Application Configuration Error</h1>
          <p>The Privy App ID (<code>VITE_PRIVY_APP_ID</code>) is not configured.</p>
          <p>Please ensure you have a <code>.env</code> file in your 'frontend' directory with this variable set:</p>
          <pre style={{background: '#eee', padding: '10px', borderRadius: '4px', textAlign: 'left'}}><code>VITE_PRIVY_APP_ID=your_actual_privy_app_id</code></pre>
        </div>
      </React.StrictMode>
    );
  } else {
    console.error("Root element not found AND VITE_PRIVY_APP_ID is missing.");
    alert("CRITICAL ERROR: VITE_PRIVY_APP_ID is missing and root element for error display not found. Check console.");
  }
} else {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <PrivyProvider
        appId={privyAppId}
        // onSuccess={(user) => console.log(`Privy login success (main.tsx): ${user.id}`)}
        config={{
          loginMethods: ['email', 'google'], // Ensure these are enabled in Privy Dashboard
          appearance: {
            theme: 'light',
            accentColor: '#6F4E37', // Example coffee brown accent
            // logo: 'YOUR_COFFEE_SHOP_LOGO_URL_HERE', 
          },
          embeddedWallets: {
            createOnLogin: 'users-without-wallets',
            noPromptOnSignature: false,
            defaultChainId: 'eip155:11155111', // Sepolia
          },
        }}
      >
        <App />
      </PrivyProvider>
    </React.StrictMode>,
  );
}
