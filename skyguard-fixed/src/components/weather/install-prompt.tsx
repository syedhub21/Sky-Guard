'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ============================================================
// Types
// ============================================================

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// ============================================================
// Constants
// ============================================================

const DISMISSAL_KEY = 'skyguard-install-prompt-dismissed';

// ============================================================
// Animation
// ============================================================

const slideUpSpring = {
  initial: { y: 200, opacity: 0 },
  animate: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 260,
      damping: 26,
      mass: 0.8,
      delay: 1.2,
    },
  },
  exit: {
    y: 200,
    opacity: 0,
    transition: { duration: 0.25, ease: 'easeIn' },
  },
};

// ============================================================
// Hook: usePwaInstall
// ============================================================

export function usePwaInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  // Detect if already running as an installed PWA
  useEffect(() => {
    // Modern check: display-mode standalone
    const standaloneMql = window.matchMedia('(display-mode: standalone)');

    const checkInstalled = (): boolean => {
      if (standaloneMql.matches) return true;
      // iOS Safari check
      if (
        'standalone' in navigator &&
        (navigator as unknown as { standalone: boolean }).standalone
      ) {
        return true;
      }
      return false;
    };

    setIsInstalled(checkInstalled());

    // Listen for display-mode changes (user installs while page is open)
    const handleChange = (e: MediaQueryListEvent) => setIsInstalled(e.matches);
    standaloneMql.addEventListener('change', handleChange);

    return () => standaloneMql.removeEventListener('change', handleChange);
  }, []);

  // Capture the beforeinstallprompt event
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Listen for appinstalled event to clean up
  useEffect(() => {
    const handler = () => {
      deferredPromptRef.current = null;
      setCanInstall(false);
      setIsInstalled(true);
    };

    window.addEventListener('appinstalled', handler);
    return () => window.removeEventListener('appinstalled', handler);
  }, []);

  const promptInstall = useCallback(async () => {
    const prompt = deferredPromptRef.current;
    if (!prompt) return;

    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setCanInstall(false);
      }
    } catch {
      // Silently handle prompt errors
    } finally {
      deferredPromptRef.current = null;
    }
  }, []);

  return { canInstall, isInstalled, promptInstall };
}

// ============================================================
// Component: InstallPrompt
// ============================================================

export function InstallPrompt() {
  const { canInstall, isInstalled, promptInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISSAL_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Derived visibility — no setState in effects needed
  const shouldShow = canInstall && !isInstalled && !dismissed;

  const handleInstall = useCallback(async () => {
    await promptInstall();
  }, [promptInstall]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSAL_KEY, 'true');
    } catch {
      // Silently fail
    }
  }, []);

  // Never render anything once the app is running as an installed PWA
  if (isInstalled) return null;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          {...slideUpSpring}
          className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[env(safe-area-inset-bottom,16px)] pt-2"
          role="dialog"
          aria-label="Install SkyGuard"
        >
          <div className="mx-auto max-w-lg rounded-2xl border border-white/10 bg-white/[0.08] backdrop-blur-xl shadow-2xl">
            <div className="flex items-center gap-3 p-4 sm:p-5">
              {/* App Icon */}
              <div className="flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.10] border border-white/10 shadow-lg overflow-hidden">
                  <img
                    src="/icons/icon-192.png"
                    alt="SkyGuard"
                    width={40}
                    height={40}
                    className="rounded-lg"
                  />
                </div>
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-white">
                  Install SkyGuard
                </h3>
                <p className="mt-0.5 text-xs text-white/60 leading-relaxed">
                  Add to your home screen for quick access and offline weather
                  updates.
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  onClick={handleInstall}
                  className="bg-white/[0.14] hover:bg-white/[0.22] text-white border border-white/10 shadow-sm backdrop-blur-sm transition-all duration-200 h-9 px-4 gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  Install
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleDismiss}
                  className="h-8 w-8 text-white/40 hover:text-white/80 hover:bg-white/[0.08] transition-colors duration-200"
                  aria-label="Dismiss install prompt"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default InstallPrompt;
