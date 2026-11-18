import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import App from './App.tsx';
import { config } from './lib/config.ts';
import { initializeTheme } from './lib/theme.ts';
import { ThemeProvider } from './providers/ThemeProvider.tsx';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

initializeTheme();
const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </BrowserRouter>
  </StrictMode>,
);
