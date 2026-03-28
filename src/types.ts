export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  lifeScore: number;
  lifeScoreDelta?: number;
  streak: number;
  createdAt: string;
}

export interface Workout {
  id?: string;
  userId: string;
  name: string;
  date: string;
  duration: number;
  status: 'planned' | 'active' | 'completed';
}

export interface Exercise {
  id?: string;
  workoutId: string;
  userId: string;
  name: string;
  sets: { reps: number; weight: number }[];
}

export interface SkincareLog {
  id?: string;
  userId: string;
  date: string;
  routineType?: 'AM' | 'PM';
  products?: string[];
  imageUrl?: string;
  notes?: string;
  metrics?: {
    hydration: number;
    clarity: number;
    texture: number;
  };
  mood?: 'happy' | 'neutral' | 'tired' | 'stressed';
  stress?: number;
  lesson?: string;
  redness?: number;
  texture?: number;
  clarity?: number;
  aiFeedback?: string;
}

export interface SleepLog {
  id?: string;
  userId: string;
  date: string;
  hours: number;
  quality: number; // 1-100
}

export interface Task {
  id?: string;
  userId: string;
  title: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  completed: boolean;
  date: string;
  time?: string;
  createdAt?: string;
}

export interface Habit {
  id?: string;
  userId: string;
  name: string;
  icon?: string;
  frequency?: string;
  streak: number;
  completedToday: boolean;
  history: Record<string, boolean>;
}

export interface BodyMetrics {
  id?: string;
  userId: string;
  date: string;
  weight: number;
  height?: number;
  bmi?: number;
  bodyFat?: number;
  muscleMass?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  imageUrl?: string;
  notes?: string;
}

export interface TimelineEvent {
  id?: string;
  userId: string;
  title: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  type: 'health' | 'productivity' | 'human' | 'other';
  desc?: string;
  active?: boolean;
}

export interface DeepWorkTarget {
  id?: string;
  userId: string;
  date: string;
  targetHours: number;
  actualHours: number;
}

export interface RoutineTask {
  id?: string;
  userId: string;
  name: string;
  desc: string;
  type: 'AM' | 'PM';
  icon: 'Droplets' | 'Sparkles' | 'Sun' | 'Moon';
  completedToday: boolean;
  history: Record<string, boolean>;
}

export type View = 'DASH' | 'PLAN' | 'AI' | 'HEALTH' | 'GROWTH';
