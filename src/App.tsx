import React, { useState, useEffect, lazy, Suspense } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, loginWithGoogle } from './firebase';
import { View } from './types';
import { Layout } from './components/Layout';
import { motion, AnimatePresence } from 'motion/react';
import { dbService } from './services/db';

const Dashboard = lazy(() => import('./components/Dashboard').then((m) => ({ default: m.Dashboard })));
const Plan = lazy(() => import('./components/Plan').then((m) => ({ default: m.Plan })));
const AIInsights = lazy(() => import('./components/AIInsights').then((m) => ({ default: m.AIInsights })));
const Health = lazy(() => import('./components/Health').then((m) => ({ default: m.Health })));
const Growth = lazy(() => import('./components/Growth').then((m) => ({ default: m.Growth })));

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('DASH');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        try {
          // Ensure user profile exists
          const profile = await dbService.getUserProfile(u.uid);
          if (!profile) {
            await dbService.updateUserProfile(u.uid, {
              uid: u.uid,
              displayName: u.displayName || 'User',
              email: u.email || '',
              photoURL: u.photoURL || '',
              lifeScore: 50,
              streak: 0,
              createdAt: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('Failed to initialize user profile:', error);
        }
      }
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="animate-pulse text-cyan-400 font-mono text-sm tracking-widest">
          INITIALIZING_LIFE_OS...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md space-y-8"
        >
          <div className="space-y-2">
            <h1 className="text-5xl font-bold tracking-tighter text-white">
              Life<span className="text-cyan-400 italic">OS</span>
            </h1>
            <p className="text-zinc-500 font-medium">
              High-performance personal optimization dashboard.
            </p>
          </div>
          
          <button 
            onClick={loginWithGoogle}
            className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors flex items-center justify-center gap-3"
          >
            <span className="w-5 h-5 rounded-full bg-black text-white text-[10px] grid place-items-center font-bold">G</span>
            Connect with Google
          </button>
        </motion.div>
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'DASH': return <Dashboard />;
      case 'PLAN': return <Plan />;
      case 'AI': return <AIInsights />;
      case 'HEALTH': return <Health />;
      case 'GROWTH': return <Growth />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout currentView={currentView} setView={setCurrentView} user={user}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentView}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
          className="pb-24"
        >
          <Suspense
            fallback={
              <div className="min-h-[40vh] flex items-center justify-center text-zinc-500 text-xs tracking-widest">
                LOADING_MODULE...
              </div>
            }
          >
            {renderView()}
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
}
