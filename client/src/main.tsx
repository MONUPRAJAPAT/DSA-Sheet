import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { queryClient } from '@/lib/query';
import { useTheme } from '@/stores/theme';
import { App } from './App';
import './index.css';

/** Toasts follow the app theme (light / dark / system). */
function ThemedToaster() {
  const theme = useTheme((s) => s.theme);
  return (
    <Toaster
      theme={theme}
      position="bottom-right"
      richColors
      closeButton
      offset={{ bottom: 24 }}
      mobileOffset={{ bottom: 88 }}
      toastOptions={{ className: 'font-sans', duration: 4500 }}
    />
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <App />
        <ThemedToaster />
      </TooltipProvider>
    </QueryClientProvider>
  </StrictMode>,
);
