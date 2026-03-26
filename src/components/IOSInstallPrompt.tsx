'use client';

import { useState, useEffect } from 'react';
import { X, Share, Plus } from 'lucide-react';

export default function IOSInstallPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only show on iOS Safari, not already installed, not dismissed before
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isInStandalone = window.matchMedia('(display-mode: standalone)').matches
      || ('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true);
    const dismissed = localStorage.getItem('pwa-prompt-dismissed');

    if (isIOS && !isInStandalone && !dismissed) {
      // Small delay so it doesn't flash on first paint
      const t = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem('pwa-prompt-dismissed', '1');
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 max-w-sm mx-auto">
        {/* Close */}
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 h-7 w-7 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-slate-200 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Icon + heading */}
        <div className="flex items-center gap-3 mb-3 pr-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="NutriLog" className="h-12 w-12 rounded-xl flex-shrink-0" />
          <div>
            <p className="font-bold text-slate-100 text-sm">Install NutriLog</p>
            <p className="text-xs text-slate-400">Add to your Home Screen for the best experience</p>
          </div>
        </div>

        {/* Steps */}
        <ol className="space-y-2 mb-4">
          <li className="flex items-center gap-2.5 text-sm text-slate-300">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-bold flex-shrink-0">
              1
            </span>
            <span>
              Tap the{' '}
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-700 rounded text-slate-200 text-xs font-medium">
                <Share className="h-3 w-3" /> Share
              </span>{' '}
              button in Safari
            </span>
          </li>
          <li className="flex items-center gap-2.5 text-sm text-slate-300">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-bold flex-shrink-0">
              2
            </span>
            <span>
              Scroll down and tap{' '}
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-700 rounded text-slate-200 text-xs font-medium">
                <Plus className="h-3 w-3" /> Add to Home Screen
              </span>
            </span>
          </li>
          <li className="flex items-center gap-2.5 text-sm text-slate-300">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-bold flex-shrink-0">
              3
            </span>
            <span>Tap <strong className="text-slate-100">Add</strong> to install</span>
          </li>
        </ol>

        <button
          onClick={dismiss}
          className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
