import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Droplets, 
  Sun, 
  Sparkles, 
  Camera,
  CheckCircle2,
  Circle,
  Smile,
  Zap,
  Moon,
  ChevronRight,
  X,
  Plus
} from 'lucide-react';
import { cn } from '../lib/utils';
import { dbService } from '../services/db';
import { auth } from '../firebase';
import { SkincareLog, UserProfile, RoutineTask } from '../types';
import { ImageModal } from './ImageModal';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { format } from 'date-fns';

export const Growth: React.FC = () => {
  const [activeRoutine, setActiveRoutine] = useState<'AM' | 'PM'>('AM');
  const [logs, setLogs] = useState<SkincareLog[]>([]);
  const [routineTasks, setRoutineTasks] = useState<RoutineTask[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLogging, setIsLogging] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [newTask, setNewTask] = useState({
    name: '',
    desc: '',
    icon: 'Droplets' as 'Droplets' | 'Sparkles' | 'Sun' | 'Moon'
  });
  const [newLog, setNewLog] = useState({
    hydration: 70,
    clarity: 70,
    texture: 70,
    mood: 'happy' as 'happy' | 'neutral' | 'tired' | 'stressed',
    stress: 20,
    lesson: '',
    notes: '',
    photo: null as File | null,
    photoPreview: ''
  });
  const user = auth.currentUser;

  useEffect(() => {
    if (user) {
      const unsubscribeLogs = dbService.subscribeSkincare(user.uid, setLogs);
      const unsubscribeProfile = dbService.subscribeUserProfile(user.uid, setProfile);
      const unsubscribeRoutine = dbService.subscribeRoutineTasks(user.uid, async (tasks) => {
        if (tasks.length > 0) {
          setRoutineTasks(tasks);
        } else {
          const defaultTasks: Omit<RoutineTask, 'id'>[] = [
            { userId: user.uid, name: 'Gentle Cleanser', desc: 'Hydrating PH Balanced', type: 'AM', icon: 'Droplets', completedToday: false, history: {} },
            { userId: user.uid, name: 'Vitamin C Serum', desc: 'Brightening Complex', type: 'AM', icon: 'Sparkles', completedToday: false, history: {} },
            { userId: user.uid, name: 'Hyaluronic Acid', desc: 'Deep Moisture', type: 'AM', icon: 'Droplets', completedToday: false, history: {} },
            { userId: user.uid, name: 'SPF 50+', desc: 'Daily Protection', type: 'AM', icon: 'Sun', completedToday: false, history: {} },
            { userId: user.uid, name: 'Oil Cleanser', desc: 'Double Cleanse Step 1', type: 'PM', icon: 'Droplets', completedToday: false, history: {} },
            { userId: user.uid, name: 'Water Cleanser', desc: 'Double Cleanse Step 2', type: 'PM', icon: 'Droplets', completedToday: false, history: {} },
            { userId: user.uid, name: 'Retinol', desc: 'Cellular Turnover', type: 'PM', icon: 'Sparkles', completedToday: false, history: {} },
            { userId: user.uid, name: 'Night Cream', desc: 'Barrier Repair', type: 'PM', icon: 'Moon', completedToday: false, history: {} },
          ];
          for (const task of defaultTasks) {
            await dbService.addRoutineTask(task);
          }
        }
      });

      return () => {
        unsubscribeLogs();
        unsubscribeProfile();
        unsubscribeRoutine();
      };
    }
  }, [user]);

  const latestLog = logs[0];

  const handleLogSnapshot = async () => {
    if (!user) return;
    
    let finalImageUrl = '';
    
    if (newLog.photoPreview) {
      finalImageUrl = newLog.photoPreview;
    }
    
    await dbService.addSkincareLog({
      userId: user.uid,
      date: new Date().toISOString(),
      imageUrl: finalImageUrl || undefined,
      notes: newLog.notes,
      mood: newLog.mood,
      stress: newLog.stress,
      lesson: newLog.lesson,
      metrics: {
        hydration: newLog.hydration,
        clarity: newLog.clarity,
        texture: newLog.texture
      }
    });
    
    setIsLogging(false);
    setNewLog({ 
      hydration: 70, 
      clarity: 70, 
      texture: 70, 
      mood: 'happy',
      stress: 20,
      lesson: '',
      notes: '', 
      photo: null, 
      photoPreview: '' 
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          
          setNewLog(prev => ({ 
            ...prev, 
            photo: file, 
            photoPreview: resizedDataUrl 
          }));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const parseDate = (date: any) => {
    if (!date) return new Date();
    if (typeof date.toDate === 'function') return date.toDate();
    const d = new Date(date);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const chartData = [...logs].reverse().map(log => ({
    date: format(parseDate(log.date), 'MMM dd'),
    hydration: log.metrics?.hydration || 0,
    clarity: log.metrics?.clarity || 0,
    texture: log.metrics?.texture || 0
  }));

  const last28Days = Array.from({ length: 28 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (27 - i));
    return format(d, 'yyyy-MM-dd');
  });

  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return format(d, 'yyyy-MM-dd');
  });

  const previous7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (i + 7));
    return format(d, 'yyyy-MM-dd');
  });

  let totalPossible = routineTasks.length * 7;
  let totalCompleted = 0;
  let prevCompleted = 0;
  
  routineTasks.forEach(task => {
    last7Days.forEach(date => {
      if (task.history?.[date]) totalCompleted++;
    });
    previous7Days.forEach(date => {
      if (task.history?.[date]) prevCompleted++;
    });
  });

  const consistency = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;
  const prevConsistency = totalPossible > 0 ? Math.round((prevCompleted / totalPossible) * 100) : 0;
  const ptsDiff = consistency - prevConsistency;
  const ptsText = ptsDiff >= 0 ? `+${ptsDiff}% this week` : `${ptsDiff}% this week`;
  const ptsColor = ptsDiff >= 0 ? 'text-green-400' : 'text-red-400';

  const level = consistency >= 90 ? 'Elite' :
                consistency >= 70 ? 'Pro' :
                consistency >= 50 ? 'Adept' :
                consistency >= 30 ? 'Novice' : 'Beginner';
  const levelColor = consistency >= 90 ? 'text-green-400' :
                     consistency >= 70 ? 'text-cyan-400' :
                     consistency >= 50 ? 'text-yellow-400' :
                     consistency >= 30 ? 'text-orange-400' : 'text-red-400';

  const logsByDate = logs.reduce((acc, log) => {
    const dateStr = format(parseDate(log.date), 'yyyy-MM-dd');
    if (!acc[dateStr]) acc[dateStr] = log;
    return acc;
  }, {} as Record<string, SkincareLog>);

  const handleToggleRoutine = (taskId: string, completed: boolean) => {
    dbService.toggleRoutineTask(taskId, !completed);
  };

  const handleAddRoutineTask = async () => {
    if (!user || !newTask.name) return;
    
    await dbService.addRoutineTask({
      userId: user.uid,
      name: newTask.name,
      desc: newTask.desc,
      type: activeRoutine,
      icon: newTask.icon,
      completedToday: false,
      history: {}
    });

    setIsAddingTask(false);
    setNewTask({ name: '', desc: '', icon: 'Droplets' });
  };

  const handleDeleteRoutineTask = async () => {
    if (taskToDelete) {
      await dbService.deleteRoutineTask(taskToDelete);
      setTaskToDelete(null);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const filteredRoutine = routineTasks.filter(t => t.type === activeRoutine);

  const lifeScore = profile?.lifeScore || 0;
  const phase = lifeScore >= 80 ? 'Radiance' : lifeScore >= 50 ? 'Balance' : 'Recovery';
  const phaseColor = lifeScore >= 80 ? 'text-purple-400' : lifeScore >= 50 ? 'text-cyan-400' : 'text-orange-400';

  return (
    <div className="px-6 py-8 space-y-10 pb-24">
      <header className="space-y-2">
        <div className="text-[10px] font-bold text-purple-400 uppercase tracking-[0.2em]">Personal Evolution</div>
        <h1 className="text-6xl font-bold tracking-tighter leading-tight">Growth Phase: <br /><span className={cn("italic", phaseColor)}>{phase}</span></h1>
      </header>

      <button 
        onClick={() => setIsLogging(true)}
        className="w-full py-4 bg-cyan-400 text-black font-bold rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] transition-transform"
      >
        <Camera className="w-5 h-5" />
        LOG DAILY SNAPSHOT
      </button>

      {/* Add Task Modal */}
      <AnimatePresence>
        {isAddingTask && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingTask(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold tracking-tight">Add Routine Step</h2>
                  <button onClick={() => setIsAddingTask(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Step Name</label>
                    <input 
                      type="text"
                      value={newTask.name}
                      onChange={(e) => setNewTask(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Niacinamide Serum"
                      className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-cyan-400/50 transition-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Description</label>
                    <input 
                      type="text"
                      value={newTask.desc}
                      onChange={(e) => setNewTask(prev => ({ ...prev, desc: e.target.value }))}
                      placeholder="e.g., Pore Refining & Oil Control"
                      className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-cyan-400/50 transition-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Icon</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['Droplets', 'Sparkles', 'Sun', 'Moon'] as const).map(icon => (
                        <button
                          key={icon}
                          onClick={() => setNewTask(prev => ({ ...prev, icon }))}
                          className={cn(
                            "p-4 rounded-2xl border transition-all flex items-center justify-center",
                            newTask.icon === icon ? "bg-cyan-400/10 border-cyan-400 text-cyan-400" : "bg-white/5 border-white/10 text-zinc-500"
                          )}
                        >
                          {icon === 'Droplets' && <Droplets className="w-5 h-5" />}
                          {icon === 'Sparkles' && <Sparkles className="w-5 h-5" />}
                          {icon === 'Sun' && <Sun className="w-5 h-5" />}
                          {icon === 'Moon' && <Moon className="w-5 h-5" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleAddRoutineTask}
                  disabled={!newTask.name}
                  className="w-full py-4 bg-cyan-400 text-black font-bold rounded-2xl hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Save Step
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {taskToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTaskToDelete(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-zinc-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8 space-y-6 text-center">
                <div className="mx-auto w-16 h-16 bg-red-400/10 rounded-full flex items-center justify-center text-red-400">
                  <X className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold">Delete Step?</h2>
                  <p className="text-sm text-zinc-500">This action cannot be undone.</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setTaskToDelete(null)}
                    className="flex-1 py-4 bg-white/5 font-bold rounded-2xl hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleDeleteRoutineTask}
                    className="flex-1 py-4 bg-red-400 text-black font-bold rounded-2xl hover:bg-red-300 transition-all"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isLogging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl p-8 space-y-8 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold tracking-tight">Daily Snapshot</h3>
              <button onClick={() => setIsLogging(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Skin Photo</label>
                <div className="relative group">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden" 
                    id="skin-photo-upload"
                  />
                  <label 
                    htmlFor="skin-photo-upload"
                    className="block w-full min-h-[200px] max-h-[60vh] bg-white/5 border-2 border-dashed border-white/10 rounded-2xl overflow-hidden cursor-pointer group-hover:border-cyan-400/50 transition-colors flex items-center justify-center"
                  >
                    {newLog.photoPreview ? (
                      <img src={newLog.photoPreview} className="max-w-full max-h-[60vh] object-contain" alt="Preview" />
                    ) : (
                      <div className="w-full h-full p-8 flex flex-col items-center justify-center gap-2 text-zinc-500">
                        <Camera className="w-8 h-8" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-center">Tap to capture / upload</span>
                      </div>
                    )}
                  </label>
                  {newLog.photoPreview && (
                    <button 
                      onClick={() => setNewLog(prev => ({ ...prev, photo: null, photoPreview: '' }))}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  <span>Hydration</span>
                  <span className="text-cyan-400">{newLog.hydration}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="100" 
                  value={newLog.hydration}
                  onChange={(e) => setNewLog(prev => ({ ...prev, hydration: parseInt(e.target.value) }))}
                  className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  <span>Clarity</span>
                  <span className="text-purple-400">{newLog.clarity}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="100" 
                  value={newLog.clarity}
                  onChange={(e) => setNewLog(prev => ({ ...prev, clarity: parseInt(e.target.value) }))}
                  className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-purple-400"
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  <span>Texture</span>
                  <span className="text-green-400">{newLog.texture}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="100" 
                  value={newLog.texture}
                  onChange={(e) => setNewLog(prev => ({ ...prev, texture: parseInt(e.target.value) }))}
                  className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-green-400"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Notes</label>
                <textarea 
                  value={newLog.notes}
                  onChange={(e) => setNewLog(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="How does your skin feel today?"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-cyan-400 transition-colors h-24 resize-none"
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Current Mood</label>
                <div className="flex justify-between p-2 bg-white/5 rounded-2xl border border-white/10">
                  {[
                    { id: 'happy', icon: Smile, color: 'text-yellow-400' },
                    { id: 'neutral', icon: Smile, color: 'text-zinc-400' },
                    { id: 'tired', icon: Moon, color: 'text-blue-400' },
                    { id: 'stressed', icon: Zap, color: 'text-orange-400' }
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setNewLog(prev => ({ ...prev, mood: m.id as any }))}
                      className={cn(
                        "p-3 rounded-xl transition-all",
                        newLog.mood === m.id ? "bg-white/10 scale-110" : "opacity-40 hover:opacity-100"
                      )}
                    >
                      <m.icon className={cn("w-6 h-6", m.color)} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  <span>Stress Level</span>
                  <span className={cn(
                    newLog.stress > 70 ? "text-red-400" : 
                    newLog.stress > 40 ? "text-yellow-400" : "text-green-400"
                  )}>{newLog.stress}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="100" 
                  value={newLog.stress}
                  onChange={(e) => setNewLog(prev => ({ ...prev, stress: parseInt(e.target.value) }))}
                  className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Lesson Learned</label>
                <textarea 
                  value={newLog.lesson}
                  onChange={(e) => setNewLog(prev => ({ ...prev, lesson: e.target.value }))}
                  placeholder="What did you learn about your skin or self today?"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-cyan-400 transition-colors h-20 resize-none"
                />
              </div>
            </div>

            <button 
              onClick={handleLogSnapshot}
              className="w-full py-4 bg-white text-black font-bold rounded-2xl hover:bg-zinc-200 transition-colors"
            >
              SAVE SNAPSHOT
            </button>
          </motion.div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="p-6 bg-white/5 border border-white/5 rounded-3xl space-y-4">
          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Consistency</div>
          <div className="text-4xl font-bold tracking-tighter">{consistency}%</div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-400 transition-all duration-1000" style={{ width: `${consistency}%` }} />
          </div>
        </div>
        <div className="p-6 bg-white/5 border border-white/5 rounded-3xl space-y-4">
          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Level</div>
          <div className={cn("text-4xl font-bold tracking-tighter italic", levelColor)}>{level}</div>
          <div className={cn("text-[10px] font-bold uppercase tracking-widest", ptsColor)}>{ptsText}</div>
        </div>
      </div>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-xl font-bold">Skincare Routine</h3>
            <button 
              onClick={() => setIsAddingTask(true)}
              className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest flex items-center gap-1 hover:text-cyan-300 transition-colors"
            >
              <Plus className="w-3 h-3" /> Add Step
            </button>
          </div>
          <div className="flex bg-white/5 p-1 rounded-xl">
            <button 
              onClick={() => setActiveRoutine('AM')}
              className={cn(
                "px-3 py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-widest transition-all",
                activeRoutine === 'AM' ? "bg-cyan-400 text-black" : "text-zinc-500"
              )}
            >
              AM Routine
            </button>
            <button 
              onClick={() => setActiveRoutine('PM')}
              className={cn(
                "px-3 py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-widest transition-all",
                activeRoutine === 'PM' ? "bg-cyan-400 text-black" : "text-zinc-500"
              )}
            >
              PM Routine
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {filteredRoutine.map(task => {
            const isCompleted = task.history?.[todayStr] || false;
            return (
              <RoutineItem 
                key={task.id}
                icon={task.icon === 'Droplets' ? <Droplets className="w-5 h-5" /> : 
                      task.icon === 'Sparkles' ? <Sparkles className="w-5 h-5" /> :
                      task.icon === 'Sun' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                name={task.name} 
                desc={task.desc} 
                completed={isCompleted}
                onToggle={() => handleToggleRoutine(task.id!, isCompleted)}
                onDelete={(e) => {
                  e.stopPropagation();
                  setTaskToDelete(task.id!);
                }}
              />
            );
          })}
          {filteredRoutine.length === 0 && (
            <div className="p-8 border border-dashed border-white/10 rounded-3xl text-center">
              <p className="text-xs text-zinc-500">No tasks for this routine.</p>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">Skin Trends</h3>
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Last 30 Logs</span>
        </div>
        <div className="p-6 bg-white/5 border border-white/5 rounded-3xl h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#71717a" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
              />
              <YAxis 
                stroke="#71717a" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                domain={[0, 100]}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '12px' }}
                itemStyle={{ fontSize: '12px' }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
              <Line 
                type="monotone" 
                dataKey="hydration" 
                stroke="#22d3ee" 
                strokeWidth={2} 
                dot={false} 
                activeDot={{ r: 4, strokeWidth: 0 }} 
              />
              <Line 
                type="monotone" 
                dataKey="clarity" 
                stroke="#a855f7" 
                strokeWidth={2} 
                dot={false} 
                activeDot={{ r: 4, strokeWidth: 0 }} 
              />
              <Line 
                type="monotone" 
                dataKey="texture" 
                stroke="#4ade80" 
                strokeWidth={2} 
                dot={false} 
                activeDot={{ r: 4, strokeWidth: 0 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="space-y-6">
        <h3 className="text-xl font-bold">Skin Log</h3>
        <div className="p-6 bg-white/5 border border-white/5 rounded-3xl space-y-6">
          <SkinMetric label="Hydration" value={latestLog?.metrics?.hydration ? Math.floor(latestLog.metrics.hydration / 10) : 0} color="bg-cyan-400" />
          <SkinMetric label="Clarity" value={latestLog?.metrics?.clarity ? Math.floor(latestLog.metrics.clarity / 10) : 0} color="bg-purple-400" />
          <SkinMetric label="Texture" value={latestLog?.metrics?.texture ? Math.floor(latestLog.metrics.texture / 10) : 0} color="bg-green-400" />
          
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {logs.map(log => (
              <div key={log.id} className="min-w-[60px] aspect-[3/4] rounded-xl overflow-hidden border border-white/10 shrink-0 cursor-pointer" onClick={() => setSelectedImage(log.imageUrl)}>
                <img src={log.imageUrl} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all" referrerPolicy="no-referrer" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <ImageModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />

      <section className="space-y-6">
        <div className="space-y-1">
          <h3 className="text-xl font-bold">Internal State</h3>
          <p className="text-xs text-zinc-500">Quantifying today's psychological baseline.</p>
        </div>
        <div className="p-6 bg-white/5 border border-white/5 rounded-3xl space-y-8">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Current Mood</span>
            <div className="flex gap-4">
              {[
                { id: 'happy', icon: Smile, color: 'text-yellow-400' },
                { id: 'neutral', icon: Smile, color: 'text-zinc-400' },
                { id: 'tired', icon: Moon, color: 'text-blue-400' },
                { id: 'stressed', icon: Zap, color: 'text-orange-400' }
              ].map((m) => (
                <m.icon 
                  key={m.id} 
                  className={cn(
                    "w-6 h-6 transition-all", 
                    latestLog?.mood === m.id ? m.color : "text-zinc-700 opacity-20"
                  )} 
                />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              <span>Stress Level</span>
              <span className={cn(
                (latestLog?.stress || 0) > 70 ? "text-red-400" : 
                (latestLog?.stress || 0) > 40 ? "text-yellow-400" : "text-green-400"
              )}>
                {(latestLog?.stress || 0) > 70 ? "High" : 
                 (latestLog?.stress || 0) > 40 ? "Moderate" : "Minimal"}
              </span>
            </div>
            <div className="relative h-1 bg-white/5 rounded-full">
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-cyan-400 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.5)] transition-all" 
                style={{ left: `${latestLog?.stress || 0}%` }}
              />
            </div>
            <div className="flex justify-between text-[8px] font-bold text-zinc-700 uppercase tracking-widest">
              <span>Zen</span>
              <span>Peak</span>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">Emotional Drift</h3>
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Last 30 Days</span>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {last28Days.map((date, i) => {
            const log = logsByDate[date];
            return (
              <div 
                key={i} 
                className={cn(
                  "aspect-square rounded-md transition-colors",
                  !log ? "bg-white/5" :
                  log.mood === 'happy' ? "bg-green-400/50" :
                  log.mood === 'neutral' ? "bg-zinc-400/30" :
                  log.mood === 'tired' ? "bg-blue-400/40" :
                  log.mood === 'stressed' ? "bg-orange-400/50" : "bg-white/5"
                )} 
                title={log ? `${format(parseDate(log.date), 'MMM dd')}: ${log.mood}` : `No log for ${format(new Date(date), 'MMM dd')}`}
              />
            );
          })}
        </div>
        <div className="flex gap-4 text-[8px] font-bold text-zinc-500 uppercase tracking-widest">
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-400" /> Happy</div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-zinc-400" /> Neutral</div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-400" /> Tired</div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-400" /> Stressed</div>
        </div>
      </section>

      <section className="space-y-6">
        <h3 className="text-xl font-bold">Lessons Learned</h3>
        <div className="space-y-4">
          {logs.filter(l => l.lesson).slice(0, 3).map((log, i) => (
            <LessonCard 
              key={log.id || i}
              icon={i % 2 === 0 ? <Sparkles className="w-4 h-4 text-purple-400" /> : <Droplets className="w-4 h-4 text-cyan-400" />}
              title={format(parseDate(log.date), 'MMMM dd')}
              desc={log.lesson!}
            />
          ))}
          {logs.filter(l => l.lesson).length === 0 && (
            <div className="p-8 border border-dashed border-white/10 rounded-3xl text-center space-y-2">
              <div className="text-sm font-bold text-zinc-500 italic">No lessons logged yet.</div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Lessons will appear here once you log them in your daily snapshot.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

const RoutineItem: React.FC<{ 
  icon: React.ReactNode; 
  name: string; 
  desc: string; 
  completed?: boolean; 
  onToggle?: () => void;
  onDelete?: (e: React.MouseEvent) => void;
}> = ({ icon, name, desc, completed, onToggle, onDelete }) => (
  <div 
    onClick={onToggle}
    className="p-5 bg-white/5 border border-white/5 rounded-3xl flex items-center justify-between group cursor-pointer hover:bg-white/[0.07] transition-colors"
  >
    <div className="flex items-center gap-4">
      <div className="p-3 bg-white/5 rounded-xl text-cyan-400">{icon}</div>
      <div className="space-y-1">
        <div className="font-bold text-sm">{name}</div>
        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{desc}</div>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <button 
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 p-2 text-zinc-600 hover:text-red-400 transition-all"
      >
        <X className="w-4 h-4" />
      </button>
      <div className={cn(
        "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0",
        completed ? "bg-cyan-400 border-cyan-400" : "border-zinc-700"
      )}>
        {completed && <CheckCircle2 className="w-4 h-4 text-black" />}
      </div>
    </div>
  </div>
);

const SkinMetric: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="space-y-2">
    <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
      <span>{label}</span>
      <span className="text-white">{value} / 10</span>
    </div>
    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
      <div className={cn("h-full", color)} style={{ width: `${value * 10}%` }} />
    </div>
  </div>
);

const LessonCard: React.FC<{ icon: React.ReactNode; title: string; desc: string }> = ({ icon, title, desc }) => (
  <div className="p-6 bg-white/5 border border-white/5 rounded-3xl space-y-4">
    <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">{icon}</div>
    <div className="space-y-2">
      <h4 className="font-bold">{title}</h4>
      <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
    </div>
  </div>
);
