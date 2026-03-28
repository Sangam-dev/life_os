import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { View, UserProfile } from '../types';
import { 
  LayoutDashboard, 
  Calendar, 
  Bot, 
  Activity, 
  TrendingUp,
  Plus,
  X,
  Dumbbell,
  Droplets,
  Moon,
  CheckSquare,
  LogOut,
  Download,
  Loader2
} from 'lucide-react';
import { cn, getLifeScoreColor } from '../lib/utils';
import { logout } from '../firebase';
import { dbService } from '../services/db';
import { aiService } from '../services/ai';
import { motion, AnimatePresence } from 'motion/react';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { DailyReportTemplate } from './DailyReportTemplate';

interface LayoutProps {
  children: React.ReactNode;
  currentView: View;
  setView: (view: View) => void;
  user: User;
}

const getFallbackAvatar = (seed: string) => {
  const label = seed.slice(0, 2).toUpperCase() || 'U';
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop stop-color='%2306b6d4'/><stop offset='1' stop-color='%230893b8'/></linearGradient></defs><rect width='64' height='64' rx='32' fill='url(%23g)'/><text x='50%' y='54%' text-anchor='middle' dominant-baseline='middle' fill='white' font-size='22' font-family='sans-serif' font-weight='700'>${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const Layout: React.FC<LayoutProps> = ({ children, currentView, setView, user }) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    const unsubscribe = dbService.subscribeUserProfile(user.uid, setProfile);
    return () => unsubscribe();
  }, [user.uid]);

  const handleDownloadReport = async () => {
    if (!user || isGeneratingPDF) return;
    setIsGeneratingPDF(true);
    
    try {
      // 1. Fetch all data
      const data = await dbService.getAllUserData(user.uid);
      const today = new Date().toISOString().split('T')[0];
      const todayDeepWork = data.deepWork.find(t => t.date === today) || null;
      
      // 2. Generate insights based on this data
      const insights = await aiService.generateInsights({
        ...data,
        deepWork: todayDeepWork,
        timelineEvents: []
      });

      // 3. Create a hidden container
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      document.body.appendChild(container);

      // 4. Render the report template
      const root = createRoot(container);
      root.render(<DailyReportTemplate data={data} insights={insights} />);

      // 5. Wait for render and charts to draw
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 6. Capture canvas
      const canvas = await html2canvas(container.firstChild as HTMLElement, {
        scale: 2,
        backgroundColor: '#18181b', // zinc-900
        logging: false
      });

      // 7. Generate PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`LifeOS_Report_${today}.pdf`);

      // 8. Cleanup
      root.unmount();
      document.body.removeChild(container);
    } catch (error) {
      console.error("PDF Generation failed", error);
      alert("Failed to generate PDF report. Please try again.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const navItems = [
    { id: 'DASH' as View, label: 'DASH', icon: LayoutDashboard },
    { id: 'PLAN' as View, label: 'PLAN', icon: Calendar },
    { id: 'AI' as View, label: 'AI', icon: Bot },
    { id: 'HEALTH' as View, label: 'HEALTH', icon: Activity },
    { id: 'GROWTH' as View, label: 'GROWTH', icon: TrendingUp },
  ];

  const handleAddTask = async () => {
    const title = prompt('Enter task title:');
    if (title) {
      await dbService.addTask({
        userId: user.uid,
        title,
        priority: 'medium',
        completed: false,
        date: new Date().toISOString()
      });
      setIsAddOpen(false);
    }
  };

  const handleLogSleep = async () => {
    const hours = prompt('Enter sleep duration (hours):');
    if (hours) {
      await dbService.addSleepLog({
        userId: user.uid,
        hours: parseFloat(hours),
        quality: 80, // Default 1-100
        date: new Date().toISOString()
      });
      setIsAddOpen(false);
    }
  };

  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'long' });

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-cyan-500/30 overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <img 
            src={user.photoURL || getFallbackAvatar(user.uid)} 
            className="w-10 h-10 rounded-full border border-white/10"
            alt="Profile"
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider">{today}</div>
            <div className={cn("text-sm font-bold flex items-center gap-1", getLifeScoreColor(profile?.lifeScore || 0))}>
              {profile?.lifeScore || 0}/100 
              {profile?.lifeScoreDelta !== undefined && profile.lifeScoreDelta !== 0 && (
                <span className={cn(
                  "text-[10px] ml-1",
                  profile.lifeScoreDelta > 0 ? "text-green-400" : "text-red-400"
                )}>
                  {profile.lifeScoreDelta > 0 ? '↑' : '↓'} {Math.abs(profile.lifeScoreDelta)} pts
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleDownloadReport}
            disabled={isGeneratingPDF}
            className="p-2 rounded-full hover:bg-white/5 transition-colors text-cyan-400 disabled:opacity-50"
            title="Download Daily Report (PDF)"
          >
            {isGeneratingPDF ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
          </button>
          <button 
            onClick={() => logout()}
            className="p-2 rounded-full hover:bg-white/5 transition-colors text-zinc-400"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto pb-32">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#050505]/95 backdrop-blur-lg border-t border-white/5 px-6 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={cn(
                  "flex flex-col items-center gap-1 transition-all duration-200",
                  isActive ? "text-cyan-400" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <div className={cn(
                  "p-2 rounded-xl transition-all",
                  isActive && "bg-cyan-400/10"
                )}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold tracking-widest">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Global Add Button (Floating) */}
      <button 
        onClick={() => setIsAddOpen(true)}
        className="fixed bottom-24 right-6 z-40 p-4 bg-cyan-400 text-black rounded-2xl shadow-lg shadow-cyan-400/20 hover:scale-105 active:scale-95 transition-all"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Add Action Sheet */}
      <AnimatePresence>
        {isAddOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddOpen(false)}
              className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-[70] bg-[#0a0a0a] border-t border-white/10 rounded-t-[40px] px-8 pt-10 pb-12 max-w-lg mx-auto"
            >
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-2xl font-bold tracking-tighter">Log Protocol</h2>
                <button 
                  onClick={() => setIsAddOpen(false)}
                  className="p-2 bg-white/5 rounded-full text-zinc-500 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <AddOption 
                  icon={<Dumbbell className="w-6 h-6" />}
                  label="Workout"
                  desc="Log session"
                  color="text-green-400"
                  onClick={() => {
                    setView('HEALTH');
                    setIsAddOpen(false);
                  }}
                />
                <AddOption 
                  icon={<Droplets className="w-6 h-6" />}
                  label="Skincare"
                  desc="Daily snapshot"
                  color="text-cyan-400"
                  onClick={() => {
                    setView('GROWTH');
                    setIsAddOpen(false);
                  }}
                />
                <AddOption 
                  icon={<Moon className="w-6 h-6" />}
                  label="Sleep"
                  desc="Log quality"
                  color="text-purple-400"
                  onClick={handleLogSleep}
                />
                <AddOption 
                  icon={<CheckSquare className="w-6 h-6" />}
                  label="Task"
                  desc="New objective"
                  color="text-yellow-400"
                  onClick={handleAddTask}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const AddOption: React.FC<{
  icon: React.ReactNode;
  label: string;
  desc: string;
  color: string;
  onClick: () => void;
}> = ({ icon, label, desc, color, onClick }) => (
  <button 
    onClick={onClick}
    className="p-6 bg-white/5 border border-white/5 rounded-3xl flex flex-col items-start gap-4 hover:bg-white/10 transition-all group text-left"
  >
    <div className={cn("p-3 bg-white/5 rounded-2xl transition-transform group-hover:scale-110", color)}>
      {icon}
    </div>
    <div className="space-y-1">
      <div className="font-bold">{label}</div>
      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{desc}</div>
    </div>
  </button>
);
