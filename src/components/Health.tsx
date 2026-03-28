import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Dumbbell, 
  Play, 
  Bot, 
  Plus,
  TrendingUp,
  Scale,
  Calendar,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  Camera
} from 'lucide-react';
import { cn } from '../lib/utils';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { dbService } from '../services/db';
import { auth } from '../firebase';
import { Workout, Exercise, BodyMetrics, SleepLog } from '../types';
import { ImageModal } from './ImageModal';

export const Health: React.FC = () => {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [activeExercises, setActiveExercises] = useState<Exercise[]>([]);
  const [bodyMetrics, setBodyMetrics] = useState<BodyMetrics[]>([]);
  const user = auth.currentUser;

  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);

  // Modal States
  const [isStartingWorkout, setIsStartingWorkout] = useState(false);
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [isAddingSet, setIsAddingSet] = useState<{ exerciseId: string; currentSets: any[] } | null>(null);
  const [isLoggingMetrics, setIsLoggingMetrics] = useState(false);
  const [isLoggingSleep, setIsLoggingSleep] = useState(false);
  const [isCompletingWorkout, setIsCompletingWorkout] = useState(false);
  const [isDeletingWorkout, setIsDeletingWorkout] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Form States
  const [workoutName, setWorkoutName] = useState('New Session');
  const [exerciseName, setExerciseName] = useState('');
  const [setWeight, setSetWeight] = useState('');
  const [setReps, setSetReps] = useState('');
  const [metricWeight, setMetricWeight] = useState('');
  const [metricHeight, setMetricHeight] = useState('');
  const [metricBodyFat, setMetricBodyFat] = useState('');
  const [metricMuscleMass, setMetricMuscleMass] = useState('');
  const [metricNotes, setMetricNotes] = useState('');
  const [metricPhoto, setMetricPhoto] = useState<File | null>(null);
  const [metricPhotoPreview, setMetricPhotoPreview] = useState('');
  const [editingMetricId, setEditingMetricId] = useState<string | null>(null);
  const [sleepHours, setSleepHours] = useState('8');
  const [sleepQuality, setSleepQuality] = useState('80');
  const [workoutDuration, setWorkoutDuration] = useState('60');

  useEffect(() => {
    if (user) {
      const unsubscribeWorkouts = dbService.subscribeWorkouts(user.uid, setWorkouts);
      const unsubscribeMetrics = dbService.subscribeBodyMetrics(user.uid, setBodyMetrics);
      const unsubscribeSleep = dbService.subscribeSleep(user.uid, setSleepLogs);
      return () => {
        unsubscribeWorkouts();
        unsubscribeMetrics();
        unsubscribeSleep();
      };
    }
  }, [user]);

  const activeWorkout = workouts.find(w => w.status === 'active');

  useEffect(() => {
    if (activeWorkout?.id && user) {
      const unsubscribe = dbService.subscribeExercises(activeWorkout.id, user.uid, setActiveExercises);
      return () => unsubscribe();
    } else {
      setActiveExercises([]);
    }
  }, [activeWorkout?.id, user]);

  const handleStartWorkout = async () => {
    if (!user || !workoutName.trim()) return;
    await dbService.addWorkout({
      userId: user.uid,
      name: workoutName,
      date: new Date().toISOString(),
      duration: 0,
      status: 'active'
    });
    setIsStartingWorkout(false);
    setWorkoutName('New Session');
  };

  const handleAddExercise = async () => {
    if (!activeWorkout?.id || !user || !exerciseName.trim()) return;
    await dbService.addExercise({
      workoutId: activeWorkout.id,
      userId: user.uid,
      name: exerciseName,
      sets: []
    });
    setIsAddingExercise(false);
    setExerciseName('');
  };

  const handleAddSet = async () => {
    if (!isAddingSet || !setWeight || !setReps) return;
    const newSets = [...isAddingSet.currentSets, { weight: parseFloat(setWeight), reps: parseInt(setReps) }];
    await dbService.updateExerciseSets(isAddingSet.exerciseId, newSets);
    setIsAddingSet(null);
    setSetWeight('');
    setSetReps('');
  };

  const handleCompleteWorkout = async () => {
    if (!activeWorkout?.id) return;
    await dbService.completeWorkout(activeWorkout.id, parseInt(workoutDuration));
    setIsCompletingWorkout(false);
    setWorkoutDuration('60');
  };

  const handleMetricFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          setMetricPhoto(file);
          setMetricPhotoPreview(resizedDataUrl);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogMetrics = async () => {
    if (!user || !metricWeight) return;
    
    const weight = parseFloat(metricWeight);
    const height = metricHeight ? parseFloat(metricHeight) : undefined;
    let bmi = undefined;
    
    if (weight && height) {
      // BMI = weight(kg) / height(m)^2
      const heightInMeters = height / 100;
      bmi = weight / (heightInMeters * heightInMeters);
    }

    const metricData = {
      userId: user.uid,
      date: new Date().toISOString(),
      weight,
      height,
      bmi,
      bodyFat: metricBodyFat ? parseFloat(metricBodyFat) : undefined,
      muscleMass: metricMuscleMass ? parseFloat(metricMuscleMass) : undefined,
      notes: metricNotes,
      imageUrl: metricPhotoPreview || undefined
    };

    if (editingMetricId) {
      await dbService.updateBodyMetric(editingMetricId, metricData);
    } else {
      await dbService.addBodyMetric(metricData);
    }

    setIsLoggingMetrics(false);
    setEditingMetricId(null);
    setMetricWeight('');
    setMetricHeight('');
    setMetricBodyFat('');
    setMetricMuscleMass('');
    setMetricNotes('');
    setMetricPhoto(null);
    setMetricPhotoPreview('');
  };

  const handleEditMetric = (metric: BodyMetrics) => {
    setEditingMetricId(metric.id!);
    setMetricWeight(metric.weight.toString());
    setMetricHeight(metric.height?.toString() || '');
    setMetricBodyFat(metric.bodyFat?.toString() || '');
    setMetricMuscleMass(metric.muscleMass?.toString() || '');
    setMetricNotes(metric.notes || '');
    setMetricPhotoPreview(metric.imageUrl || '');
    setIsLoggingMetrics(true);
  };

  const handleLogSleep = async () => {
    if (!user || !sleepHours) return;
    await dbService.addSleepLog({
      userId: user.uid,
      date: new Date().toISOString(),
      hours: parseFloat(sleepHours),
      quality: parseInt(sleepQuality)
    });
    setIsLoggingSleep(false);
    setSleepHours('8');
    setSleepQuality('80');
  };

  const handleDeleteWorkout = async () => {
    if (!isDeletingWorkout || !user) return;
    await dbService.deleteWorkout(isDeletingWorkout, user.uid);
    setIsDeletingWorkout(null);
  };

  const weightData = [...bodyMetrics].reverse().map(m => ({
    name: new Date(m.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    val: m.weight
  }));

  const latestMetric = bodyMetrics[0];
  const prevMetric = bodyMetrics[1];

  const calculateDelta = (curr: number, prev: number) => {
    const delta = curr - prev;
    return delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1);
  };

  return (
    <div className="px-6 py-8 space-y-10 pb-24">
      <header className="space-y-2">
        <div className="text-[10px] font-bold text-green-400 uppercase tracking-[0.2em]">Current Protocol</div>
        <h1 className="text-6xl font-bold tracking-tighter leading-tight">
          {activeWorkout ? activeWorkout.name : 'No Active'} — <br />
          <span className="italic">{activeWorkout ? 'Training' : 'Session'}</span>
        </h1>
      </header>

      {activeWorkout ? (
        <button 
          onClick={() => setIsCompletingWorkout(true)}
          className="w-full py-4 bg-red-500/20 text-red-400 border border-red-500/30 font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-red-500/30 transition-all"
        >
          <CheckCircle2 className="w-5 h-5" />
          COMPLETE SESSION
        </button>
      ) : (
        <button 
          onClick={() => setIsStartingWorkout(true)}
          className="w-full py-4 bg-green-400 text-black font-bold rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] transition-transform"
        >
          <Play className="w-5 h-5 fill-black" />
          START NEW SESSION
        </button>
      )}

      {/* Modals */}
      <AnimatePresence>
        {isStartingWorkout && (
          <ModalWrapper onClose={() => setIsStartingWorkout(false)} title="Start New Session">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Workout Name</label>
                <input 
                  type="text"
                  value={workoutName}
                  onChange={(e) => setWorkoutName(e.target.value)}
                  placeholder="e.g., Push Day, Leg Session"
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-green-400/50 transition-colors"
                />
              </div>
              <button 
                onClick={handleStartWorkout}
                className="w-full py-4 bg-green-400 text-black font-bold rounded-2xl hover:bg-green-300 transition-all"
              >
                Begin Session
              </button>
            </div>
          </ModalWrapper>
        )}

        {isAddingExercise && (
          <ModalWrapper onClose={() => setIsAddingExercise(false)} title="Add Exercise">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Exercise Name</label>
                <input 
                  type="text"
                  value={exerciseName}
                  onChange={(e) => setExerciseName(e.target.value)}
                  placeholder="e.g., Bench Press, Squats"
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-green-400/50 transition-colors"
                />
              </div>
              <button 
                onClick={handleAddExercise}
                className="w-full py-4 bg-green-400 text-black font-bold rounded-2xl hover:bg-green-300 transition-all"
              >
                Add to Log
              </button>
            </div>
          </ModalWrapper>
        )}

        {isAddingSet && (
          <ModalWrapper onClose={() => setIsAddingSet(null)} title="Log Set">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Weight (kg)</label>
                  <input 
                    type="number"
                    value={setWeight}
                    onChange={(e) => setSetWeight(e.target.value)}
                    placeholder="0"
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-green-400/50 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Reps</label>
                  <input 
                    type="number"
                    value={setReps}
                    onChange={(e) => setSetReps(e.target.value)}
                    placeholder="0"
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-green-400/50 transition-colors"
                  />
                </div>
              </div>
              <button 
                onClick={handleAddSet}
                className="w-full py-4 bg-green-400 text-black font-bold rounded-2xl hover:bg-green-300 transition-all"
              >
                Save Set
              </button>
            </div>
          </ModalWrapper>
        )}

        {isLoggingMetrics && (
          <ModalWrapper onClose={() => { setIsLoggingMetrics(false); setEditingMetricId(null); }} title={editingMetricId ? "Edit Metrics" : "Log Metrics"}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Weight (kg)</label>
                  <input 
                    type="number"
                    value={metricWeight}
                    onChange={(e) => setMetricWeight(e.target.value)}
                    placeholder="0.0"
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-cyan-400/50 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Height (cm)</label>
                  <input 
                    type="number"
                    value={metricHeight}
                    onChange={(e) => setMetricHeight(e.target.value)}
                    placeholder="0.0"
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-cyan-400/50 transition-colors"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Body Fat (%)</label>
                  <input 
                    type="number"
                    value={metricBodyFat}
                    onChange={(e) => setMetricBodyFat(e.target.value)}
                    placeholder="0.0"
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-cyan-400/50 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Muscle (kg)</label>
                  <input 
                    type="number"
                    value={metricMuscleMass}
                    onChange={(e) => setMetricMuscleMass(e.target.value)}
                    placeholder="0.0"
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-cyan-400/50 transition-colors"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Progress Photo</label>
                <div className="relative group">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleMetricFileChange}
                    className="hidden" 
                    id="metric-photo-upload"
                  />
                  <label 
                    htmlFor="metric-photo-upload"
                    className="block w-full min-h-[200px] max-h-[60vh] bg-white/5 border-2 border-dashed border-white/10 rounded-2xl overflow-hidden cursor-pointer group-hover:border-cyan-400/50 transition-colors flex items-center justify-center"
                  >
                    {metricPhotoPreview ? (
                      <img src={metricPhotoPreview} className="max-w-full max-h-[60vh] object-contain" alt="Preview" />
                    ) : (
                      <div className="w-full h-full p-8 flex flex-col items-center justify-center gap-2 text-zinc-500">
                        <Camera className="w-8 h-8" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-center">Tap to capture / upload</span>
                      </div>
                    )}
                  </label>
                  {metricPhotoPreview && (
                    <button 
                      onClick={() => { setMetricPhoto(null); setMetricPhotoPreview(''); }}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Notes</label>
                <textarea 
                  value={metricNotes}
                  onChange={(e) => setMetricNotes(e.target.value)}
                  placeholder="How are you feeling? Any changes in diet or routine?"
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-cyan-400/50 transition-colors resize-none h-24"
                />
              </div>
              <button 
                onClick={handleLogMetrics}
                className="w-full py-4 bg-cyan-400 text-black font-bold rounded-2xl hover:bg-cyan-300 transition-all"
              >
                {editingMetricId ? "Update Metrics" : "Save Metrics"}
              </button>
            </div>
          </ModalWrapper>
        )}

        {isLoggingSleep && (
          <ModalWrapper onClose={() => setIsLoggingSleep(false)} title="Log Sleep">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Hours Slept</label>
                  <input 
                    type="number"
                    value={sleepHours}
                    onChange={(e) => setSleepHours(e.target.value)}
                    placeholder="8"
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-indigo-400/50 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Quality (1-100)</label>
                  <input 
                    type="number"
                    value={sleepQuality}
                    onChange={(e) => setSleepQuality(e.target.value)}
                    placeholder="80"
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-indigo-400/50 transition-colors"
                  />
                </div>
              </div>
              <button 
                onClick={handleLogSleep}
                className="w-full py-4 bg-indigo-400 text-black font-bold rounded-2xl hover:bg-indigo-300 transition-all"
              >
                Save Sleep Log
              </button>
            </div>
          </ModalWrapper>
        )}

        {isCompletingWorkout && (
          <ModalWrapper onClose={() => setIsCompletingWorkout(false)} title="Complete Session">
            <div className="space-y-6 text-center">
              <div className="mx-auto w-16 h-16 bg-green-400/10 rounded-full flex items-center justify-center text-green-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold">Finish Training?</h2>
                <p className="text-sm text-zinc-500">Log your total duration for this session.</p>
              </div>
              <div className="space-y-2 text-left">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Duration (minutes)</label>
                <input 
                  type="number"
                  value={workoutDuration}
                  onChange={(e) => setWorkoutDuration(e.target.value)}
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-green-400/50 transition-colors"
                />
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsCompletingWorkout(false)}
                  className="flex-1 py-4 bg-white/5 font-bold rounded-2xl hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCompleteWorkout}
                  className="flex-1 py-4 bg-green-400 text-black font-bold rounded-2xl hover:bg-green-300 transition-all"
                >
                  Complete
                </button>
              </div>
            </div>
          </ModalWrapper>
        )}

        {isDeletingWorkout && (
          <ModalWrapper onClose={() => setIsDeletingWorkout(null)} title="Delete Workout">
            <div className="space-y-6 text-center">
              <div className="mx-auto w-16 h-16 bg-red-400/10 rounded-full flex items-center justify-center text-red-400">
                <Trash2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold">Delete Session?</h2>
                <p className="text-sm text-zinc-500">All exercises and data will be permanently removed.</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsDeletingWorkout(null)}
                  className="flex-1 py-4 bg-white/5 font-bold rounded-2xl hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteWorkout}
                  className="flex-1 py-4 bg-red-400 text-black font-bold rounded-2xl hover:bg-red-300 transition-all"
                >
                  Delete
                </button>
              </div>
            </div>
          </ModalWrapper>
        )}
      </AnimatePresence>

      <section className="p-6 bg-cyan-400/5 border border-cyan-400/20 rounded-3xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-400/10 rounded-lg">
            <Bot className="w-5 h-5 text-cyan-400" />
          </div>
          <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-widest">AI Performance Insight</h4>
        </div>
        <p className="text-sm text-zinc-300 leading-relaxed">
          {weightData.length > 1 ? `Your weight has changed by ${calculateDelta(latestMetric.weight, prevMetric.weight)}kg since last log. Maintain current caloric intake.` : 'Log more data for AI insights.'}
        </p>
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-green-400" />
            <h3 className="text-xl font-bold">Active Log</h3>
          </div>
          {activeWorkout && (
            <button 
              onClick={() => setIsAddingExercise(true)}
              className="p-2 bg-white/5 rounded-xl text-zinc-400 hover:text-white transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="space-y-4">
          {activeWorkout ? (
            activeExercises.length > 0 ? (
              activeExercises.map(ex => (
                <ExerciseCard 
                  key={ex.id} 
                  name={ex.name} 
                  type="Strength" 
                  sets={ex.sets} 
                  onAddSet={() => setIsAddingSet({ exerciseId: ex.id!, currentSets: ex.sets })}
                  onDelete={() => dbService.deleteExercise(ex.id!)}
                />
              ))
            ) : (
              <div className="p-10 border border-dashed border-white/10 rounded-3xl text-center space-y-2">
                <div className="text-zinc-500 text-sm font-medium">No exercises added.</div>
                <button 
                  onClick={() => setIsAddingExercise(true)}
                  className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest"
                >
                  Add your first exercise
                </button>
              </div>
            )
          ) : (
            <div className="p-10 border border-dashed border-white/10 rounded-3xl text-center space-y-2">
              <div className="text-zinc-500 text-sm font-medium">No active session.</div>
              <div className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest">Start a session to log exercises.</div>
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6">
        <ChartCard title="Weight Trend" delta={weightData.length > 1 ? `${calculateDelta(latestMetric.weight, prevMetric.weight)}kg` : '—'} data={weightData} />
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-cyan-400" />
            <h3 className="text-xl font-bold">Body Metrics</h3>
          </div>
          <button onClick={() => setIsLoggingMetrics(true)} className="p-2 bg-white/5 rounded-xl text-zinc-400 hover:text-white transition-colors">
            <Plus className="w-5 h-5" />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <MetricRow 
            label="Body Weight" 
            value={latestMetric?.weight?.toString() || '—'} 
            unit="kg" 
            delta={weightData.length > 1 ? `${calculateDelta(latestMetric.weight, prevMetric.weight)}kg` : '—'} 
            trend={latestMetric?.weight > prevMetric?.weight ? 'up' : 'down'} 
            onEdit={latestMetric ? () => handleEditMetric(latestMetric) : undefined}
          />
          <MetricRow 
            label="BMI" 
            value={latestMetric?.bmi?.toFixed(1) || '—'} 
            unit="" 
            delta={latestMetric?.bmi && prevMetric?.bmi ? `${calculateDelta(latestMetric.bmi, prevMetric.bmi)}` : '—'} 
            trend={latestMetric?.bmi > prevMetric?.bmi ? 'up' : 'down'} 
            onEdit={latestMetric ? () => handleEditMetric(latestMetric) : undefined}
          />
          <MetricRow 
            label="Body Fat" 
            value={latestMetric?.bodyFat?.toString() || '—'} 
            unit="%" 
            delta={latestMetric?.bodyFat && prevMetric?.bodyFat ? `${calculateDelta(latestMetric.bodyFat, prevMetric.bodyFat)}%` : '—'} 
            trend={latestMetric?.bodyFat > prevMetric?.bodyFat ? 'up' : 'down'} 
            onEdit={latestMetric ? () => handleEditMetric(latestMetric) : undefined}
          />
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            <h3 className="text-xl font-bold">Sleep & Recovery</h3>
          </div>
          <button onClick={() => setIsLoggingSleep(true)} className="p-2 bg-white/5 rounded-xl text-zinc-400 hover:text-white transition-colors">
            <Plus className="w-5 h-5" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-5 bg-white/5 border border-white/5 rounded-3xl space-y-1">
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Avg Sleep</div>
            <div className="text-2xl font-bold">{sleepLogs.length > 0 ? (sleepLogs.reduce((acc, curr) => acc + curr.hours, 0) / sleepLogs.length).toFixed(1) : '—'}<span className="text-sm ml-1 text-zinc-500">hrs</span></div>
          </div>
          <div className="p-5 bg-white/5 border border-white/5 rounded-3xl space-y-1">
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Avg Quality</div>
            <div className="text-2xl font-bold">{sleepLogs.length > 0 ? Math.round(sleepLogs.reduce((acc, curr) => acc + curr.quality, 0) / sleepLogs.length) : '—'}<span className="text-sm ml-1 text-zinc-500">%</span></div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">History</h3>
          <div className="flex gap-2">
            <button className="p-1 text-zinc-500"><ChevronLeft className="w-4 h-4" /></button>
            <button className="p-1 text-zinc-500"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="p-6 bg-white/5 border border-white/5 rounded-3xl space-y-6">
          <div className="grid grid-cols-7 gap-2 text-center">
            {Array.from({ length: 7 }).map((_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (13 - i));
              return <div key={`header-${i}`} className="text-[10px] font-bold text-zinc-600">{['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()]}</div>;
            })}
            {Array.from({ length: 14 }).map((_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (13 - i));
              const dateStr = d.toISOString().split('T')[0];
              const day = d.getDate();
              const hasWorkout = workouts.some(w => w.date.startsWith(dateStr) && w.status === 'completed');
              const isToday = i === 13;
              
              return (
                <div key={dateStr} className={cn(
                  "aspect-square flex items-center justify-center text-xs font-bold rounded-lg",
                  isToday ? "bg-cyan-400 text-black" : 
                  hasWorkout ? "bg-green-400/20 text-green-400" : "text-zinc-500"
                )}>
                  {day}
                </div>
              );
            })}
          </div>
          <div className="pt-6 border-t border-white/5">
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Recent Workouts</div>
            {workouts.filter(w => w.status === 'completed').slice(0, 3).map(w => (
              <div key={w.id} className="flex items-center justify-between mb-2 group">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-8 bg-green-400 rounded-full" />
                  <div>
                    <div className="font-bold text-sm">{w.name}</div>
                    <div className="text-[8px] text-zinc-500 uppercase tracking-widest">
                      {new Date(w.date).toLocaleDateString()} • {w.duration}m
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setIsDeletingWorkout(w.id!)}
                  className="p-2 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h3 className="text-xl font-bold">Body Progress Logs</h3>
        <div className="p-6 bg-white/5 border border-white/5 rounded-3xl space-y-6">
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {bodyMetrics.map(metric => (
              <div key={metric.id} className="min-w-[70px] bg-white/5 rounded-xl overflow-hidden border border-white/10 shrink-0 flex flex-col cursor-pointer" onClick={() => setSelectedImage(metric.imageUrl || null)}>
                {metric.imageUrl ? (
                  <div className="aspect-[3/4] w-full relative">
                    <img src={metric.imageUrl} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all" referrerPolicy="no-referrer" />
                  </div>
                ) : (
                  <div className="aspect-[3/4] w-full bg-zinc-900 flex items-center justify-center text-zinc-700">
                    <Scale className="w-6 h-6 opacity-50" />
                  </div>
                )}
                <div className="p-2 space-y-1 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">
                      {new Date(metric.date).toLocaleDateString()}
                    </div>
                    <div className="font-bold text-sm">{metric.weight} <span className="text-[10px] text-zinc-500 font-normal">kg</span></div>
                    {metric.bodyFat && <div className="text-[10px] text-cyan-400">{metric.bodyFat}% BF</div>}
                  </div>
                </div>
              </div>
            ))}
            {bodyMetrics.length === 0 && (
              <div className="text-zinc-500 text-sm w-full text-center py-8">No body metrics logged yet.</div>
            )}
          </div>
        </div>
      </section>

      <ImageModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
    </div>
  );
};

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

const ExerciseCard: React.FC<{ name: string; type: string; sets: any[]; onAddSet?: () => void; onDelete?: () => void }> = ({ name, type, sets, onAddSet, onDelete }) => (
  <div className="p-6 bg-white/5 border border-white/5 rounded-3xl space-y-6">
    <div className="flex items-start justify-between">
      <div className="space-y-1">
        <h4 className="font-bold text-lg">{name}</h4>
        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{type}</div>
      </div>
      <button 
        onClick={onDelete}
        className="p-2 text-zinc-600 hover:text-red-400 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
      {sets.map((set, i) => (
        <div key={i} className={cn(
          "min-w-[80px] p-4 rounded-2xl border flex flex-col items-center gap-1",
          "bg-green-400/10 border-green-400/30"
        )}>
          <div className="text-[8px] font-bold text-zinc-500 uppercase">Set {i + 1}</div>
          <div className="text-xl font-bold">{set.weight || '—'}<span className="text-[10px] ml-0.5">kg</span></div>
          <div className="text-xs text-zinc-400">{set.reps || '—'} Reps</div>
        </div>
      ))}
      <button 
        onClick={onAddSet}
        className="min-w-[80px] p-4 rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-1 text-zinc-600 hover:text-zinc-400 hover:border-white/20 transition-all"
      >
        <Plus className="w-4 h-4" />
        <span className="text-[8px] font-bold uppercase">Add Set</span>
      </button>
    </div>
  </div>
);

const ChartCard: React.FC<{ title: string; delta: string; data: any[] }> = ({ title, delta, data }) => (
  <div className="p-6 bg-white/5 border border-white/5 rounded-3xl space-y-4">
    <div className="flex items-center justify-between">
      <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{title}</h4>
      <span className="text-xs font-bold text-green-400">{delta}</span>
    </div>
    <div className="h-32">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <Bar dataKey="val" fill="#4ade80" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
    <div className="flex justify-between text-[8px] font-bold text-zinc-700 uppercase tracking-widest">
      <span>WK 1</span>
      <span>Current</span>
    </div>
  </div>
);

const MetricRow: React.FC<{ label: string; value: string; unit: string; delta: string; trend: 'up' | 'down'; onEdit?: () => void }> = ({ label, value, unit, delta, trend, onEdit }) => (
  <div className="p-5 bg-white/5 border border-white/5 rounded-3xl flex items-center justify-between group">
    <div className="space-y-1">
      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{label}</div>
      <div className="text-2xl font-bold">{value}<span className="text-sm ml-1 text-zinc-500">{unit}</span></div>
    </div>
    <div className="flex items-center gap-3">
      {onEdit && (
        <button 
          onClick={onEdit}
          className="p-2 text-zinc-500 hover:text-cyan-400 transition-all"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      )}
      <div className={cn(
        "flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg",
        trend === 'up' ? "text-green-400 bg-green-400/10" : "text-cyan-400 bg-cyan-400/10"
      )}>
        <TrendingUp className={cn("w-3 h-3", trend === 'down' && "rotate-180")} />
        {delta}
      </div>
    </div>
  </div>
);
