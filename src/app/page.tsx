'use client';

import { useState, useEffect } from 'react';
import { LayoutDashboard, BookOpen, UtensilsCrossed, Dumbbell, Settings2, Sun, Moon } from 'lucide-react';
import { User } from '@/types';
import Onboarding from '@/components/Onboarding';
import Dashboard from '@/components/Dashboard';
import FoodDiary from '@/components/FoodDiary';
import FoodLogger from '@/components/FoodLogger';
import ActivityTracker from '@/components/ActivityTracker';
import Settings from '@/components/Settings';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

type Tab = 'dashboard' | 'diary' | 'log' | 'activity' | 'settings';

const NAV_ITEMS: { key: Tab; label: string; Icon: React.ElementType }[] = [
  { key: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { key: 'diary', label: 'Food Log', Icon: BookOpen },
  { key: 'log', label: 'Log Food', Icon: UtensilsCrossed },
  { key: 'activity', label: 'Activity', Icon: Dumbbell },
  { key: 'settings', label: 'Settings', Icon: Settings2 },
];

export default function Home() {
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved === 'true') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/profile?user_id=1');
        if (res.status === 404) {
          setProfile(null);
        } else if (res.ok) {
          const data = await res.json();
          setProfile(data.user || data);
        }
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', next.toString());
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" />
          <p className="text-slate-500 dark:text-slate-400 text-sm">Loading NutriLog...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <Onboarding onComplete={(user) => setProfile(user)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-indigo-500" />
            <span className="text-lg font-black tracking-tight text-indigo-600 dark:text-indigo-400">
              NUTRILOG
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">
              Hey, {profile.name}!
            </span>
            <button
              onClick={toggleDark}
              className="h-8 w-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-4 pb-24">
        {activeTab === 'dashboard' && <Dashboard user={profile} />}
        {activeTab === 'diary' && <FoodDiary user={profile} />}
        {activeTab === 'log' && (
          <FoodLogger
            user={profile}
            onLogged={() => setActiveTab('diary')}
          />
        )}
        {activeTab === 'activity' && <ActivityTracker user={profile} />}
        {activeTab === 'settings' && (
          <Settings user={profile} onUpdate={(updated) => setProfile(updated)} />
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-10">
        <div className="max-w-2xl mx-auto px-1 flex">
          {NAV_ITEMS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors relative ${
                activeTab === key
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{label}</span>
              {activeTab === key && (
                <span className="absolute bottom-0 h-0.5 w-8 bg-indigo-600 dark:bg-indigo-400 rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
