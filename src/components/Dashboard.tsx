import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  Zap, 
  Dumbbell, 
  Moon, 
  Sparkles,
  ArrowUpRight,
  ChevronRight,
  Bot,
  TrendingUp,
  Activity,
  Scale,
  RefreshCw
} from 'lucide-react';
import { cn, getLifeScoreColor } from '../lib/utils';
import { dbService } from '../services/db';
import { auth } from '../firebase';
import { UserProfile, Workout, SkincareLog, SleepLog, Habit, BodyMetrics, DeepWorkTarget } from '../types';
import { aiService } from '../services/ai';

export const Dashboard: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [skincare, setSkincare] = useState<SkincareLog[]>([]);
  const [sleep, setSleep] = useState<SleepLog[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [bodyMetrics, setBodyMetrics] = useState<BodyMetrics[]>([]);
  const [deepWorkTargets, setDeepWorkTargets] = useState<DeepWorkTarget[]>([]);
  const [aiInsights, setAiInsights] = useState<{ title: string; description: string; type: string; impact: string; action: string }[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const user = auth.currentUser;

  useEffect(() => {
    if (user) {
      const unsubProfile = dbService.subscribeUserProfile(user.uid, setProfile);
      const unsubWorkouts = dbService.subscribeWorkouts(user.uid, setWorkouts);
      const unsubSkincare = dbService.subscribeSkincare(user.uid, setSkincare);
      const unsubSleep = dbService.subscribeSleep(user.uid, setSleep);
      const unsubHabits = dbService.subscribeHabits(user.uid, setHabits);
      const unsubMetrics = dbService.subscribeBodyMetrics(user.uid, setBodyMetrics);
      const unsubDeepWork = dbService.subscribeDeepWorkTargets(user.uid, setDeepWorkTargets);

      return () => {
        unsubProfile();
        unsubWorkouts();
        unsubSkincare();
        unsubSleep();
        unsubHabits();
        unsubMetrics();
        unsubDeepWork();
      };
    }
  }, [user]);

  const fetchAI = async () => {
    setLoadingAI(true);
    const today = new Date().toISOString().split('T')[0];
    const todayDeepWork = deepWorkTargets.find(t => t.date === today) || null;
    const insights = await aiService.generateInsights({ 
      workouts, 
      skincare, 
      sleep, 
      habits,
      bodyMetrics,
      timelineEvents: [], // Add timeline events when needed
      deepWork: todayDeepWork
    });
    setAiInsights(insights);
    setLoadingAI(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (aiInsights.length === 0 && !loadingAI && (workouts.length > 0 || skincare.length > 0 || sleep.length > 0 || habits.length > 0 || bodyMetrics.length > 0 || deepWorkTargets.length > 0)) {
        fetchAI();
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [workouts.length, skincare.length, sleep.length, habits.length, bodyMetrics.length, deepWorkTargets.length]);

  const latestWorkout = workouts[0];
  const latestSkincare = skincare[0];
  const latestSleep = sleep[0];
  const latestMetric = bodyMetrics[0];
  const today = new Date().toISOString().split('T')[0];
  const todayDeepWork = deepWorkTargets.find(t => t.date === today);

  const habitCompletion = habits.length > 0 
    ? Math.round((habits.filter(h => h.completedToday).length / habits.length) * 100) 
    : 0;

  const deepWorkProgress = todayDeepWork 
    ? Math.round((todayDeepWork.actualHours / todayDeepWork.targetHours) * 100)
    : 0;

  const moodScoreMap: Record<string, number> = {
    happy: 100,
    neutral: 75,
    tired: 50,
    stressed: 25
  };

  const moodScore = latestSkincare?.mood ? moodScoreMap[latestSkincare.mood] : 0;
  const sleepScore = latestSleep ? latestSleep.quality : 0;

  const activeMetricsCount = [
    habits.length > 0 ? 1 : 0,
    todayDeepWork ? 1 : 0,
    latestSleep ? 1 : 0,
    latestSkincare?.mood ? 1 : 0
  ].reduce((a, b) => a + b, 0);

  let lifeScore = profile?.lifeScore || 0;
  let lifeScoreDelta = profile?.lifeScoreDelta || 0;

  if (activeMetricsCount > 0) {
    const totalScore = 
      (habits.length > 0 ? habitCompletion : 0) +
      (todayDeepWork ? deepWorkProgress : 0) +
      (latestSleep ? sleepScore : 0) +
      (latestSkincare?.mood ? moodScore : 0);
    lifeScore = Math.round(totalScore / activeMetricsCount);

    // Calculate yesterday's score for delta
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const yesterdayDeepWork = deepWorkTargets.find(t => t.date === yesterdayStr);
    const yesterdaySleep = sleep.find(s => s.date.startsWith(yesterdayStr));
    const yesterdaySkincare = skincare.find(s => s.date.startsWith(yesterdayStr));
    
    const yesterdayHabitCompletion = habits.length > 0 
      ? Math.round((habits.filter(h => h.history?.[yesterdayStr]).length / habits.length) * 100) 
      : 0;
    const yesterdayDeepWorkProgress = yesterdayDeepWork 
      ? Math.round((yesterdayDeepWork.actualHours / yesterdayDeepWork.targetHours) * 100)
      : 0;
    const yesterdayMoodScore = yesterdaySkincare?.mood ? moodScoreMap[yesterdaySkincare.mood] : 0;
    const yesterdaySleepScore = yesterdaySleep ? yesterdaySleep.quality : 0;

    const yesterdayActiveMetricsCount = [
      habits.length > 0 ? 1 : 0,
      yesterdayDeepWork ? 1 : 0,
      yesterdaySleep ? 1 : 0,
      yesterdaySkincare?.mood ? 1 : 0
    ].reduce((a, b) => a + b, 0);

    if (yesterdayActiveMetricsCount > 0) {
      const yesterdayTotalScore = 
        (habits.length > 0 ? yesterdayHabitCompletion : 0) +
        (yesterdayDeepWork ? yesterdayDeepWorkProgress : 0) +
        (yesterdaySleep ? yesterdaySleepScore : 0) +
        (yesterdaySkincare?.mood ? yesterdayMoodScore : 0);
      const yesterdayLifeScore = Math.round(yesterdayTotalScore / yesterdayActiveMetricsCount);
      lifeScoreDelta = lifeScore - yesterdayLifeScore;
    }
  }

  useEffect(() => {
    if (user && profile && (lifeScore !== profile.lifeScore || lifeScoreDelta !== profile.lifeScoreDelta)) {
      dbService.updateUserProfile(user.uid, { lifeScore, lifeScoreDelta });
    }
  }, [lifeScore, lifeScoreDelta, profile?.lifeScore, profile?.lifeScoreDelta, user]);

  const trajectory = lifeScore >= 80 ? 'ascending' : lifeScore >= 50 ? 'maintaining' : 'declining';
  const trajectoryColor = lifeScore >= 80 ? 'text-green-400' : lifeScore >= 50 ? 'text-cyan-400' : 'text-orange-400';

  return (
    <div className="px-6 py-8 space-y-10 pb-24">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">System Status: <span className={trajectoryColor}>{trajectory === 'ascending' ? 'Optimal' : trajectory === 'maintaining' ? 'Stable' : 'Critical'}</span></div>
          <h1 className="text-4xl font-bold tracking-tighter">LifeOS — <span className="italic">v1.0</span></h1>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          <Zap className="w-6 h-6 text-cyan-400" />
        </div>
      </header>

      {/* Life Score Index */}
      <section className="flex flex-col items-center text-center space-y-6">
        <div className="relative w-64 h-64 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="128"
              cy="128"
              r="110"
              stroke="currentColor"
              strokeWidth="12"
              fill="transparent"
              className="text-white/5"
            />
            <motion.circle
              cx="128"
              cy="128"
              r="110"
              stroke="currentColor"
              strokeWidth="12"
              fill="transparent"
              strokeDasharray={2 * Math.PI * 110}
              initial={{ strokeDashoffset: 2 * Math.PI * 110 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 110 * (1 - lifeScore / 100) }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className={cn("transition-colors duration-500", getLifeScoreColor(lifeScore))}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-7xl font-bold tracking-tighter">{lifeScore.toFixed(0)}</span>
            <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase">Life Score Index</span>
          </div>
          {/* Glow effect */}
          <div className={cn("absolute inset-0 blur-[60px] rounded-full -z-10 opacity-20", getLifeScoreColor(lifeScore).replace('text-', 'bg-'))}></div>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-400/10 border border-cyan-400/20 rounded-full">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Optimizing</span>
        </div>
      </section>

      {/* Trajectory */}
      <section className="space-y-4">
        <h2 className="text-4xl font-bold tracking-tight leading-tight">
          Your trajectory is <br />
          <span className={cn("italic", trajectoryColor)}>{trajectory}.</span>
        </h2>
        <p className="text-zinc-500 text-sm leading-relaxed">
          Current performance is driven by your daily habits, deep work completion, and recovery metrics.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-1">
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Current Score</div>
            <div className={cn("text-2xl font-bold", trajectoryColor)}>{lifeScore}</div>
          </div>
          <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-1">
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Active Metrics</div>
            <div className="text-2xl font-bold text-cyan-400">{activeMetricsCount}/4</div>
          </div>
        </div>
      </section>

      {/* Vitals Grid */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">Vitals Grid</h3>
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Real-time Telemetry</span>
        </div>

        <div className="space-y-4">
          <VitalCard 
            id="01"
            icon={<Zap className="w-5 h-5" />}
            label="Habit Consistency"
            value={`${habitCompletion}%`}
            progress={habitCompletion}
            color="bg-cyan-400"
          />
          <VitalCard 
            id="02"
            icon={<Bot className="w-5 h-5" />}
            label="Deep Work"
            value={todayDeepWork ? `${todayDeepWork.actualHours}h / ${todayDeepWork.targetHours}h` : 'No target'}
            progress={deepWorkProgress}
            color="bg-purple-400"
          />
          <VitalCard 
            id="03"
            icon={<Moon className="w-5 h-5" />}
            label="Sleep Quality"
            value={latestSleep ? `${latestSleep.hours}h` : '—'}
            progress={latestSleep ? latestSleep.quality : 0}
            color="bg-cyan-400"
            segments={4}
          />
          <VitalCard 
            id="04"
            icon={<Scale className="w-5 h-5" />}
            label="Body Weight"
            value={latestMetric ? `${latestMetric.weight}kg` : '—'}
            subValue={latestMetric ? `BF: ${latestMetric.bodyFat}%` : 'No data'}
            progress={latestMetric ? 100 : 0}
            color="bg-green-400"
          />
        </div>
      </section>

      {/* AI Insight Card */}
      {aiInsights.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">AI Performance Insights</h3>
            <div className="flex items-center gap-3">
              {loadingAI && <div className="animate-pulse text-[10px] font-bold text-purple-400 uppercase tracking-widest">Analyzing Data...</div>}
              <button 
                onClick={fetchAI}
                disabled={loadingAI}
                className="p-2 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 rounded-full transition-colors disabled:opacity-50"
                title="Regenerate insights from current data"
              >
                <RefreshCw className={cn("w-4 h-4", loadingAI && "animate-spin")} />
              </button>
            </div>
          </div>
          <div className="space-y-4">
            {aiInsights.map((insight: any, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-6 bg-gradient-to-br from-purple-900/40 to-black border border-purple-500/20 rounded-[32px] space-y-4 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 p-4">
                  <div className={cn(
                    "px-2 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest border",
                    insight.impact === 'Critical' ? "bg-red-500/20 text-red-400 border-red-500/30" :
                    insight.impact === 'High' ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
                    "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                  )}>
                    {insight.impact}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center border border-purple-500/20">
                    {insight.type === 'health' ? <Activity className="w-6 h-6 text-purple-400" /> :
                     insight.type === 'growth' ? <Sparkles className="w-6 h-6 text-purple-400" /> :
                     <Zap className="w-6 h-6 text-purple-400" />}
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-purple-500 uppercase tracking-widest">PROTOCOL_{insight.type?.toUpperCase()}</div>
                    <h4 className="text-lg font-bold tracking-tight">{insight.title}</h4>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    {insight.description}
                  </p>
                  
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                      <ArrowUpRight className="w-3 h-3" /> Action Required
                    </div>
                    <div className="text-sm font-medium text-white">
                      {insight.action}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

const VitalCard: React.FC<{
  id: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  progress: number;
  color: string;
  segments?: number;
}> = ({ id, icon, label, value, subValue, progress, color, segments }) => (
  <div className="p-6 bg-white/5 border border-white/5 rounded-3xl space-y-4 relative overflow-hidden group hover:bg-white/[0.07] transition-colors">
    <span className="absolute top-6 right-6 text-[10px] font-bold text-zinc-700 tracking-widest">{id}</span>
    <div className="flex items-center gap-4">
      <div className={cn("p-3 rounded-xl", color.replace('bg-', 'bg-').concat('/10'), color.replace('bg-', 'text-'))}>
        {icon}
      </div>
      <div className="space-y-1">
        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{label}</div>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        {subValue && <div className="text-[10px] font-medium text-green-400">{subValue}</div>}
      </div>
    </div>
    <div className="h-1 bg-white/5 rounded-full overflow-hidden flex gap-1">
      {segments ? (
        Array.from({ length: segments }).map((_, i) => (
          <div 
            key={i} 
            className={cn(
              "h-full flex-1 rounded-full",
              i < (progress / 100) * segments ? color : "bg-white/5"
            )} 
          />
        ))
      ) : (
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className={cn("h-full rounded-full", color)} 
        />
      )}
    </div>
  </div>
);

const BotIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 8V4H8" />
    <rect width="16" height="12" x="4" y="8" rx="2" />
    <path d="M2 14h2" />
    <path d="M20 14h2" />
    <path d="M15 13v2" />
    <path d="M9 13v2" />
  </svg>
);
