import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Plus,
  Zap,
  Coffee,
  User,
  Activity,
  ChevronRight,
  X,
  Trash2,
  Edit2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { dbService } from '../services/db';
import { auth } from '../firebase';
import { Task, Habit, TimelineEvent, DeepWorkTarget, UserProfile } from '../types';

export const Plan: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [deepWork, setDeepWork] = useState<DeepWorkTarget | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const user = auth.currentUser;

  // Modal States
  const [isSettingDeepWork, setIsSettingDeepWork] = useState(false);
  const [isLoggingDeepWork, setIsLoggingDeepWork] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isAddingHabit, setIsAddingHabit] = useState(false);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [deletingHabitId, setDeletingHabitId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);

  // Form States
  const [deepWorkTarget, setDeepWorkTarget] = useState('6');
  const [deepWorkLog, setDeepWorkLog] = useState('1');
  
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  
  const [habitName, setHabitName] = useState('');
  const [habitFrequency, setHabitFrequency] = useState('daily');
  
  const [eventTitle, setEventTitle] = useState('');
  const [eventStartTime, setEventStartTime] = useState('09:00');
  const [eventEndTime, setEventEndTime] = useState('10:00');
  const [eventType, setEventType] = useState<'health' | 'productivity' | 'human' | 'other'>('productivity');

  useEffect(() => {
    if (user) {
      const unsubscribeTasks = dbService.subscribeTasks(user.uid, setTasks);
      const unsubscribeEvents = dbService.subscribeTimelineEvents(user.uid, setEvents);
      const today = new Date().toISOString().split('T')[0];
      const unsubscribeDeepWork = dbService.subscribeDeepWorkTargets(user.uid, (targets) => {
        const todayTarget = targets.find(t => t.date === today);
        setDeepWork(todayTarget || null);
      });
      const unsubscribeProfile = dbService.subscribeUserProfile(user.uid, setProfile);

      const unsubscribeHabits = dbService.subscribeHabits(user.uid, async (fetchedHabits) => {
        if (fetchedHabits.length > 0) {
          setHabits(fetchedHabits);
        } else {
          // If no habits in DB, initialize them for the user
          const initialHabits = [
            { userId: user.uid, name: 'Daily Meditation', frequency: 'daily', streak: 0, completedToday: false, icon: 'Zap', history: {} },
            { userId: user.uid, name: 'Hydration (3L)', frequency: 'daily', streak: 0, completedToday: false, icon: 'Droplets', history: {} },
            { userId: user.uid, name: 'Vitamin D Intake', frequency: 'daily', streak: 0, completedToday: false, icon: 'Sun', history: {} },
          ];
          
          for (const habit of initialHabits) {
            await dbService.addHabit(habit);
          }
        }
      });
      return () => {
        unsubscribeTasks();
        unsubscribeHabits();
        unsubscribeEvents();
        unsubscribeDeepWork();
        unsubscribeProfile();
      };
    }
  }, [user]);

  const toggleTask = (taskId: string, completed: boolean) => {
    dbService.toggleTask(taskId, !completed);
  };

  const handleDeleteTask = async () => {
    if (deletingTaskId) {
      await dbService.deleteTask(deletingTaskId);
      setDeletingTaskId(null);
    }
  };

  const toggleHabit = (habitId: string, completed: boolean) => {
    dbService.toggleHabit(habitId, !completed);
  };

  const handleDeleteHabit = async () => {
    if (deletingHabitId) {
      await dbService.deleteHabit(deletingHabitId);
      setDeletingHabitId(null);
    }
  };

  const handleAddTask = async () => {
    if (!user || !taskTitle.trim()) return;
    await dbService.addTask({
      userId: user.uid,
      title: taskTitle,
      priority: taskPriority,
      completed: false,
      date: new Date().toISOString()
    });
    setIsAddingTask(false);
    setTaskTitle('');
    setTaskPriority('medium');
  };

  const handleUpdateTask = async () => {
    if (!user || !taskTitle.trim() || !editingTaskId) return;
    await dbService.updateTask(editingTaskId, {
      title: taskTitle,
      priority: taskPriority
    });
    setEditingTaskId(null);
    setTaskTitle('');
    setTaskPriority('medium');
  };

  const handleAddHabit = async () => {
    if (!user || !habitName.trim()) return;
    await dbService.addHabit({
      userId: user.uid,
      name: habitName,
      frequency: habitFrequency,
      streak: 0,
      completedToday: false,
      icon: 'Zap',
      history: {}
    });
    setIsAddingHabit(false);
    setHabitName('');
  };

  const handleUpdateHabit = async () => {
    if (!user || !habitName.trim() || !editingHabitId) return;
    await dbService.updateHabit(editingHabitId, {
      name: habitName,
      frequency: habitFrequency
    });
    setEditingHabitId(null);
    setHabitName('');
  };

  const handleAddEvent = async () => {
    if (!user || !eventTitle.trim() || !eventStartTime || !eventEndTime) return;
    const today = new Date().toISOString().split('T')[0];
    await dbService.addTimelineEvent({
      userId: user.uid,
      title: eventTitle,
      startTime: `${today}T${eventStartTime}:00Z`,
      endTime: `${today}T${eventEndTime}:00Z`,
      type: eventType as any,
      desc: ''
    });
    setIsAddingEvent(false);
    setEventTitle('');
    setEventStartTime('09:00');
    setEventEndTime('10:00');
  };

  const handleSetDeepWork = async () => {
    if (!user || !deepWorkTarget) return;
    const today = new Date().toISOString().split('T')[0];
    await dbService.setDeepWorkTarget({
      userId: user.uid,
      date: today,
      targetHours: parseFloat(deepWorkTarget),
      actualHours: deepWork?.actualHours || 0
    });
    setIsSettingDeepWork(false);
  };

  const handleLogDeepWork = async () => {
    if (!user || !deepWorkLog) return;
    const today = new Date().toISOString().split('T')[0];
    await dbService.setDeepWorkTarget({
      userId: user.uid,
      date: today,
      targetHours: deepWork?.targetHours || 6,
      actualHours: (deepWork?.actualHours || 0) + parseFloat(deepWorkLog)
    });
    setIsLoggingDeepWork(false);
    setDeepWorkLog('1');
  };

  const lifeScore = profile?.lifeScore || 0;
  const phase = lifeScore >= 80 ? 'Peak Performance' : lifeScore >= 50 ? 'Maintenance' : 'Recovery';
  const phaseColor = lifeScore >= 80 ? 'text-green-400' : lifeScore >= 50 ? 'text-cyan-400' : 'text-orange-400';

  return (
    <div className="px-6 py-8 space-y-10">
      <header className="space-y-2">
        <h1 className="text-6xl font-bold tracking-tighter">Daily <br /><span className="text-cyan-400 italic">Execution.</span></h1>
        <p className="text-zinc-500 text-sm leading-relaxed max-w-[280px]">
          Optimize your metabolic window for deep work. Currently in <span className={cn("font-bold", phaseColor)}>{phase}</span> phase.
        </p>
      </header>

      <div className="p-6 bg-white/5 border border-white/5 rounded-3xl space-y-4">
        <div className="flex justify-between items-center">
          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Deep Work Target</div>
          <button onClick={() => setIsSettingDeepWork(true)} className="text-[10px] text-cyan-400 font-bold uppercase">Set Target</button>
        </div>
        <div className="flex items-end justify-between">
          <div className="text-5xl font-bold tracking-tighter text-cyan-400">
            {deepWork ? `${deepWork.actualHours.toFixed(1)}` : '0.0'}
            <span className="text-xl ml-1 text-zinc-500">/ {deepWork?.targetHours || 6}h</span>
          </div>
          <button 
            onClick={() => setIsLoggingDeepWork(true)}
            className="px-4 py-2 bg-cyan-400 text-black text-[10px] font-bold rounded-xl uppercase tracking-widest"
          >
            Log Session
          </button>
        </div>
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-cyan-400 transition-all duration-500" 
            style={{ width: `${deepWork ? Math.min(100, (deepWork.actualHours / deepWork.targetHours) * 100) : 0}%` }}
          />
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {isSettingDeepWork && (
          <ModalWrapper onClose={() => setIsSettingDeepWork(false)} title="Set Deep Work Target">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Target Hours</label>
                <input 
                  type="number"
                  value={deepWorkTarget}
                  onChange={(e) => setDeepWorkTarget(e.target.value)}
                  placeholder="e.g., 6"
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-cyan-400/50 transition-colors"
                />
              </div>
              <button 
                onClick={handleSetDeepWork}
                className="w-full py-4 bg-cyan-400 text-black font-bold rounded-2xl hover:bg-cyan-300 transition-all"
              >
                Save Target
              </button>
            </div>
          </ModalWrapper>
        )}

        {isLoggingDeepWork && (
          <ModalWrapper onClose={() => setIsLoggingDeepWork(false)} title="Log Deep Work">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Hours Completed</label>
                <input 
                  type="number"
                  value={deepWorkLog}
                  onChange={(e) => setDeepWorkLog(e.target.value)}
                  placeholder="e.g., 1.5"
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-cyan-400/50 transition-colors"
                />
              </div>
              <button 
                onClick={handleLogDeepWork}
                className="w-full py-4 bg-cyan-400 text-black font-bold rounded-2xl hover:bg-cyan-300 transition-all"
              >
                Log Session
              </button>
            </div>
          </ModalWrapper>
        )}

        {isAddingTask && (
          <ModalWrapper onClose={() => setIsAddingTask(false)} title="Add Task">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Task Title</label>
                <input 
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g., Finish Q3 Report"
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-cyan-400/50 transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Priority</label>
                <select 
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as any)}
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-cyan-400/50 transition-colors appearance-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <button 
                onClick={handleAddTask}
                className="w-full py-4 bg-cyan-400 text-black font-bold rounded-2xl hover:bg-cyan-300 transition-all"
              >
                Add Task
              </button>
            </div>
          </ModalWrapper>
        )}

        {editingTaskId && (
          <ModalWrapper onClose={() => { setEditingTaskId(null); setTaskTitle(''); setTaskPriority('medium'); }} title="Edit Task">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Task Title</label>
                <input 
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g., Finish Q3 Report"
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-cyan-400/50 transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Priority</label>
                <select 
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as any)}
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-cyan-400/50 transition-colors appearance-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <button 
                onClick={handleUpdateTask}
                className="w-full py-4 bg-cyan-400 text-black font-bold rounded-2xl hover:bg-cyan-300 transition-all"
              >
                Save Changes
              </button>
            </div>
          </ModalWrapper>
        )}

        {isAddingHabit && (
          <ModalWrapper onClose={() => setIsAddingHabit(false)} title="Add Habit">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Habit Name</label>
                <input 
                  type="text"
                  value={habitName}
                  onChange={(e) => setHabitName(e.target.value)}
                  placeholder="e.g., Read 10 pages"
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-cyan-400/50 transition-colors"
                />
              </div>
              <button 
                onClick={handleAddHabit}
                className="w-full py-4 bg-cyan-400 text-black font-bold rounded-2xl hover:bg-cyan-300 transition-all"
              >
                Add Habit
              </button>
            </div>
          </ModalWrapper>
        )}

        {editingHabitId && (
          <ModalWrapper onClose={() => { setEditingHabitId(null); setHabitName(''); }} title="Edit Habit">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Habit Name</label>
                <input 
                  type="text"
                  value={habitName}
                  onChange={(e) => setHabitName(e.target.value)}
                  placeholder="e.g., Read 10 pages"
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-cyan-400/50 transition-colors"
                />
              </div>
              <button 
                onClick={handleUpdateHabit}
                className="w-full py-4 bg-cyan-400 text-black font-bold rounded-2xl hover:bg-cyan-300 transition-all"
              >
                Save Changes
              </button>
            </div>
          </ModalWrapper>
        )}

        {isAddingEvent && (
          <ModalWrapper onClose={() => setIsAddingEvent(false)} title="Add Event">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Event Title</label>
                <input 
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="e.g., Team Sync"
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-cyan-400/50 transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Start Time</label>
                  <input 
                    type="time"
                    value={eventStartTime}
                    onChange={(e) => setEventStartTime(e.target.value)}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-cyan-400/50 transition-colors [color-scheme:dark]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">End Time</label>
                  <input 
                    type="time"
                    value={eventEndTime}
                    onChange={(e) => setEventEndTime(e.target.value)}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-cyan-400/50 transition-colors [color-scheme:dark]"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Type</label>
                <select 
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as any)}
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-cyan-400/50 transition-colors appearance-none"
                >
                  <option value="productivity">Productivity</option>
                  <option value="health">Health</option>
                  <option value="human">Human</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <button 
                onClick={handleAddEvent}
                className="w-full py-4 bg-cyan-400 text-black font-bold rounded-2xl hover:bg-cyan-300 transition-all"
              >
                Add Event
              </button>
            </div>
          </ModalWrapper>
        )}

        {deletingTaskId && (
          <ModalWrapper onClose={() => setDeletingTaskId(null)} title="Delete Task">
            <div className="space-y-6 text-center">
              <div className="mx-auto w-16 h-16 bg-red-400/10 rounded-full flex items-center justify-center text-red-400">
                <Trash2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold">Delete Task?</h2>
                <p className="text-sm text-zinc-500">This action cannot be undone.</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeletingTaskId(null)}
                  className="flex-1 py-4 bg-white/5 font-bold rounded-2xl hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteTask}
                  className="flex-1 py-4 bg-red-400 text-black font-bold rounded-2xl hover:bg-red-300 transition-all"
                >
                  Delete
                </button>
              </div>
            </div>
          </ModalWrapper>
        )}

        {deletingHabitId && (
          <ModalWrapper onClose={() => setDeletingHabitId(null)} title="Delete Habit">
            <div className="space-y-6 text-center">
              <div className="mx-auto w-16 h-16 bg-red-400/10 rounded-full flex items-center justify-center text-red-400">
                <Trash2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold">Delete Habit?</h2>
                <p className="text-sm text-zinc-500">This action cannot be undone.</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeletingHabitId(null)}
                  className="flex-1 py-4 bg-white/5 font-bold rounded-2xl hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteHabit}
                  className="flex-1 py-4 bg-red-400 text-black font-bold rounded-2xl hover:bg-red-300 transition-all"
                >
                  Delete
                </button>
              </div>
            </div>
          </ModalWrapper>
        )}
      </AnimatePresence>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">Timeline</h3>
          <button onClick={() => setIsAddingEvent(true)} className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">Add Event</button>
        </div>

        <div className="space-y-8 relative">
          <div className="absolute left-[3px] top-2 bottom-2 w-[1px] bg-white/10" />
          
          {events.length > 0 ? (
            events.map(event => (
              <TimelineItem 
                key={event.id}
                time={new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                label={event.type}
                title={event.title}
                desc={event.desc || ''}
                icon={event.type === 'health' ? <Activity className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                color={event.type === 'health' ? 'text-green-400' : 'text-cyan-400'}
                active={event.active}
              />
            ))
          ) : (
            <div className="p-10 border border-dashed border-white/10 rounded-3xl text-center">
              <div className="text-zinc-500 text-sm">No events scheduled.</div>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <h3 className="text-xl font-bold">Habit Stack</h3>
          </div>
          <button 
            onClick={() => setIsAddingHabit(true)}
            className="px-3 py-1 bg-cyan-400/10 text-cyan-400 text-[10px] font-bold rounded-lg uppercase tracking-widest"
          >
            Add Habit
          </button>
        </div>
        <div className="p-6 bg-white/5 border border-white/5 rounded-3xl space-y-4">
          {habits.map(habit => (
            <HabitItem 
              key={habit.id} 
              name={habit.name} 
              completed={habit.completedToday} 
              onToggle={() => toggleHabit(habit.id!, habit.completedToday)}
              onEdit={(e) => {
                e.stopPropagation();
                setEditingHabitId(habit.id!);
                setHabitName(habit.name);
                setHabitFrequency(habit.frequency);
              }}
              onDelete={(e) => {
                e.stopPropagation();
                setDeletingHabitId(habit.id!);
              }}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">Key Tasks</h3>
          <button 
            onClick={() => setIsAddingTask(true)}
            className="px-3 py-1 bg-cyan-400/10 text-cyan-400 text-[10px] font-bold rounded-lg uppercase tracking-widest"
          >
            Add Task
          </button>
        </div>
        <div className="space-y-3">
          {tasks.length > 0 ? (
            tasks.map(task => (
              <TaskItem 
                key={task.id}
                title={task.title}
                priority={task.priority as any}
                completed={task.completed}
                onToggle={() => toggleTask(task.id!, task.completed)}
                onEdit={(e) => {
                  e.stopPropagation();
                  setEditingTaskId(task.id!);
                  setTaskTitle(task.title);
                  setTaskPriority(task.priority as any);
                }}
                onDelete={(e) => {
                  e.stopPropagation();
                  setDeletingTaskId(task.id!);
                }}
              />
            ))
          ) : (
            <div className="p-10 border border-dashed border-white/10 rounded-3xl text-center space-y-2">
              <div className="text-zinc-500 text-sm font-medium">No active objectives.</div>
              <div className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest">Log a new task to begin.</div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

const TimelineItem: React.FC<{
  time: string;
  label: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  color: string;
  active?: boolean;
}> = ({ time, label, title, desc, icon, color, active }) => (
  <div className="flex gap-6 relative">
    <div className={cn(
      "text-xs font-bold w-12 pt-1",
      active ? "text-cyan-400" : "text-zinc-600"
    )}>{time}</div>
    <div className={cn(
      "absolute left-[1px] top-2 w-2 h-2 rounded-full border-2 border-[#050505]",
      active ? "bg-cyan-400" : "bg-zinc-700"
    )} />
    <div className={cn(
      "flex-1 p-4 rounded-2xl border transition-all",
      active ? "bg-cyan-400/5 border-cyan-400/20" : "bg-white/5 border-white/5"
    )}>
      <div className="flex items-center justify-between mb-1">
        <div className={cn("text-[9px] font-bold uppercase tracking-widest flex items-center gap-1", color)}>
          {icon} {label}
        </div>
        {active && <Zap className="w-3 h-3 text-cyan-400 fill-cyan-400" />}
      </div>
      <div className="font-bold text-sm mb-1">{title}</div>
      <div className="text-xs text-zinc-500">{desc}</div>
    </div>
  </div>
);

const HabitItem: React.FC<{ name: string; completed?: boolean; onToggle?: () => void; onEdit?: (e: React.MouseEvent) => void; onDelete?: (e: React.MouseEvent) => void }> = ({ name, completed, onToggle, onEdit, onDelete }) => (
  <div 
    onClick={onToggle}
    className="flex items-center justify-between group cursor-pointer py-1"
  >
    <span className={cn("text-sm font-medium transition-colors", completed ? "text-white" : "text-zinc-500")}>{name}</span>
    <div className="flex items-center gap-3">
      {onEdit && (
        <button 
          onClick={onEdit}
          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-cyan-400 transition-all"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      )}
      {onDelete && (
        <button 
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-red-400 transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      {completed ? (
        <div className="w-5 h-5 rounded-full border-2 border-green-400 flex items-center justify-center bg-green-400/10">
          <div className="w-2.5 h-2.5 bg-green-400 rounded-full" />
        </div>
      ) : (
        <div className="w-5 h-5 rounded-full border-2 border-zinc-700 group-hover:border-zinc-500 transition-colors" />
      )}
    </div>
  </div>
);

const ModalWrapper: React.FC<{ children: React.ReactNode; onClose: () => void; title: string }> = ({ children, onClose, title }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
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
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </motion.div>
  </div>
);

const TaskItem: React.FC<{ 
  title: string; 
  priority?: 'low' | 'medium' | 'high' | 'critical'; 
  desc?: string; 
  time?: string;
  completed?: boolean;
  onToggle?: () => void;
  onEdit?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
}> = ({ title, priority, desc, time, completed, onToggle, onEdit, onDelete }) => (
  <div 
    onClick={onToggle}
    className={cn(
      "p-5 bg-white/5 border border-white/5 rounded-3xl flex gap-4 transition-all cursor-pointer hover:bg-white/10 group",
      completed && "opacity-50"
    )}
  >
    <div className={cn(
      "w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 mt-1 transition-colors",
      completed ? "bg-cyan-400 border-cyan-400" : "border-cyan-400/30 group-hover:border-cyan-400/60"
    )}>
      {completed && <CheckCircle2 className="w-4 h-4 text-black" />}
    </div>
    <div className="flex-1 space-y-2">
      <div className="flex items-center justify-between">
        <h4 className={cn("font-bold text-sm transition-all", completed && "line-through text-zinc-500")}>{title}</h4>
        <div className="flex items-center gap-2">
          {priority && (
            <span className={cn(
              "text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest",
              priority === 'critical' || priority === 'high' ? "bg-red-500/20 text-red-500" : "bg-green-500/20 text-green-500"
            )}>
              {priority}
            </span>
          )}
          {onEdit && (
            <button 
              onClick={onEdit}
              className="opacity-0 group-hover:opacity-100 p-1 hover:text-cyan-400 transition-all"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          )}
          <button 
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
      {desc && <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>}
      {time && (
        <div className="flex items-center justify-end gap-1 text-[10px] text-zinc-600 font-bold">
          <Clock className="w-3 h-3" /> {time}
        </div>
      )}
    </div>
  </div>
);
