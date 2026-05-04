import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, 
  Send, 
  History, 
  Zap, 
  Moon, 
  Activity,
  ArrowUp,
  Lightbulb,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { cn } from '../lib/utils';
import { chatWithCoach } from '../services/ai';
import ReactMarkdown from 'react-markdown';
import { auth } from '../firebase';
import { dbService } from '../services/db';
import { Workout, SkincareLog, SleepLog, Habit, BodyMetrics, DeepWorkTarget } from '../types';

export const AIInsights: React.FC = () => {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [skincare, setSkincare] = useState<SkincareLog[]>([]);
  const [sleep, setSleep] = useState<SleepLog[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [bodyMetrics, setBodyMetrics] = useState<BodyMetrics[]>([]);
  const [deepWorkTargets, setDeepWorkTargets] = useState<DeepWorkTarget[]>([]);
  const user = auth.currentUser;

  useEffect(() => {
    if (user) {
      const unsubWorkouts = dbService.subscribeWorkouts(user.uid, setWorkouts);
      const unsubSkincare = dbService.subscribeSkincare(user.uid, setSkincare);
      const unsubSleep = dbService.subscribeSleep(user.uid, setSleep);
      const unsubHabits = dbService.subscribeHabits(user.uid, setHabits);
      const unsubMetrics = dbService.subscribeBodyMetrics(user.uid, setBodyMetrics);
      const unsubDeepWork = dbService.subscribeDeepWorkTargets(user.uid, setDeepWorkTargets);

      return () => {
        unsubWorkouts();
        unsubSkincare();
        unsubSleep();
        unsubHabits();
        unsubMetrics();
        unsubDeepWork();
      };
    }
  }, [user]);

  const [messages, setMessages] = useState([
    {
      role: 'ai',
      text: "System initialized. I have access to your biometric logs, habits, and deep work metrics. How can we optimize your trajectory today?",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg = {
      role: 'user',
      text: input,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const today = new Date().toISOString().split('T')[0];
      const todayDeepWork = deepWorkTargets.find(t => t.date === today) || null;
      
      const response = await chatWithCoach(input, {
        workouts,
        skincare,
        sleep,
        habits,
        bodyMetrics,
        deepWork: todayDeepWork
      }, user.uid);
      
      const aiMsg = {
        role: 'ai',
        text: response,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-160px)]">
      <header className="px-6 py-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <Bot className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">OS_COACH_V4</div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Active Intelligence</span>
            </div>
          </div>
        </div>
        <button className="p-2 text-zinc-500 hover:text-white transition-colors">
          <History className="w-5 h-5" />
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
        {messages.map((msg, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex gap-4",
              msg.role === 'user' ? "flex-row-reverse" : "flex-row"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-lg shrink-0 flex items-center justify-center",
              msg.role === 'ai' ? "bg-white/5 text-purple-400" : "bg-cyan-400 text-black"
            )}>
              {msg.role === 'ai' ? <Bot className="w-4 h-4" /> : <div className="text-[10px] font-bold">ME</div>}
            </div>
            <div className="space-y-2 max-w-[85%]">
              <div className={cn(
                "p-4 rounded-2xl text-sm leading-relaxed",
                msg.role === 'ai' ? "bg-white/5 text-zinc-300" : "bg-cyan-400/10 text-cyan-400 border border-cyan-400/20"
              )}>
                {msg.role === 'ai' ? (
                  <div className="markdown-body">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                ) : (
                  msg.text
                )}
              </div>
              <div className={cn(
                "text-[8px] font-bold text-zinc-600 uppercase tracking-widest",
                msg.role === 'user' && "text-right"
              )}>{msg.time}</div>
            </div>
          </motion.div>
        ))}
        {isTyping && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-lg bg-white/5 text-purple-400 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-4 bg-white/5 rounded-2xl flex gap-1 items-center">
              <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" />
            </div>
          </div>
        )}
      </div>

      <div className="px-6 py-4 space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button 
            onClick={() => setInput("How's my gym progress?")}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap hover:bg-white/10 transition-colors"
          >
            How's my gym progress?
          </button>
          <button 
            onClick={() => setInput("Sleep patterns analysis")}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap hover:bg-white/10 transition-colors"
          >
            Sleep patterns
          </button>
        </div>
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="relative"
        >
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Query the OS..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-cyan-400/50 transition-colors pr-16"
          />
          <button 
            type="submit"
            disabled={isTyping || !input.trim()}
            className="absolute right-2 top-2 p-3 bg-purple-400 text-black rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

const InsightCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  title: string;
  desc: string;
  color: string;
}> = ({ icon, label, title, desc, color }) => (
  <div className="p-6 bg-white/5 border border-white/5 rounded-3xl space-y-3">
    <div className={cn("flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest", color)}>
      {icon} {label}
    </div>
    <div className="space-y-1">
      <h4 className="font-bold text-lg">{title}</h4>
      <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
    </div>
  </div>
);
