'use client';

import { motion } from 'framer-motion';
import {
  Settings,
  Thermometer,
  ShieldCheck,
  Info,
  Lock,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet';

interface SettingsPanelProps {
  useCelsius: boolean;
  onToggleUnit: () => void;
  biometricLock: boolean;
  onToggleBiometric: () => void;
}

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const itemVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.08, duration: 0.3, ease: 'easeOut' },
  }),
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SettingsPanel({
  useCelsius,
  onToggleUnit,
  biometricLock,
  onToggleBiometric,
}: SettingsPanelProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl"
          aria-label="Open settings"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-[320px] sm:w-[380px] border-border/50 bg-background/90 backdrop-blur-xl"
      >
        <SheetHeader className="px-1">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5 text-primary" />
            Settings
          </SheetTitle>
          <SheetDescription>
            Customize your SkyGuard experience
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-1 pb-6">
          {/* --- Preferences section --- */}
          <motion.div
            custom={0}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
          >
            <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Thermometer className="h-3.5 w-3.5" />
              Preferences
            </h3>

            <div className="rounded-xl border border-border/50 bg-card/60 p-4 backdrop-blur-sm">
              {/* Temperature unit toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Thermometer className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Temperature Unit</p>
                    <p className="text-xs text-muted-foreground">
                      {useCelsius ? 'Celsius (°C)' : 'Fahrenheit (°F)'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-medium transition-colors ${
                      !useCelsius ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    °F
                  </span>
                  <Switch
                    checked={useCelsius}
                    onCheckedChange={onToggleUnit}
                    aria-label="Toggle temperature unit"
                  />
                  <span
                    className={`text-xs font-medium transition-colors ${
                      useCelsius ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    °C
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* --- Security section --- */}
          <motion.div
            custom={1}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="mt-6"
          >
            <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              Security
            </h3>

            <div className="rounded-xl border border-border/50 bg-card/60 p-4 backdrop-blur-sm">
              {/* Biometric lock toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Lock className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Biometric Lock</p>
                    <p className="text-xs text-muted-foreground">
                      Require authentication to open app
                    </p>
                  </div>
                </div>
                <Switch
                  checked={biometricLock}
                  onCheckedChange={onToggleBiometric}
                  aria-label="Toggle biometric lock"
                />
              </div>

              {biometricLock && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 rounded-lg bg-primary/5 px-3 py-2"
                >
                  <p className="flex items-center gap-1.5 text-xs text-primary">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Biometric lock is active
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>

          <Separator className="my-6" />

          {/* --- About section --- */}
          <motion.div
            custom={2}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
          >
            <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Info className="h-3.5 w-3.5" />
              About
            </h3>

            <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm">
              {/* Security info */}
              <div className="flex items-center gap-3 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Data Security</p>
                  <p className="text-xs text-muted-foreground">
                    All weather data is fetched securely via HTTPS
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>

              <Separator />

              {/* Privacy policy */}
              <button
                className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-accent/50"
                onClick={() => {
                  /* In a real app, navigate to privacy policy */
                }}
                type="button"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ExternalLink className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Privacy Policy</p>
                  <p className="text-xs text-muted-foreground">
                    Learn how we handle your data
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            </div>
          </motion.div>

          {/* Version info */}
          <motion.div
            custom={3}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="mt-6"
          >
            <div className="text-center text-xs text-muted-foreground">
              <p className="font-medium">SkyGuard Weather</p>
              <p>Version 1.0.0</p>
              <p className="mt-1">
                Built with Next.js &middot; Powered by OpenWeather
              </p>
            </div>
          </motion.div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
