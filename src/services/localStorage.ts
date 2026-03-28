import { auth } from '../firebase';
import { 
  UserProfile, 
  Workout, 
  SkincareLog, 
  SleepLog, 
  Task, 
  Habit,
  Exercise,
  BodyMetrics,
  TimelineEvent,
  DeepWorkTarget,
  RoutineTask
} from '../types';

// Storage keys per collection
const STORAGE_KEYS = {
  users: 'lifeos:users',
  workouts: 'lifeos:workouts',
  skincare_logs: 'lifeos:skincare_logs',
  sleep_logs: 'lifeos:sleep_logs',
  tasks: 'lifeos:tasks',
  habits: 'lifeos:habits',
  exercises: 'lifeos:exercises',
  body_metrics: 'lifeos:body_metrics',
  timeline_events: 'lifeos:timeline_events',
  deep_work_targets: 'lifeos:deep_work_targets',
  routine_tasks: 'lifeos:routine_tasks',
};

// Subscription registry: collectionName -> Set<callbacks>
const subscriptions = new Map<string, Set<Function>>();
let pollInterval: ReturnType<typeof setInterval> | null = null;

// Generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

// Helper to get all items of a type from localStorage
const getCollection = <T extends Record<string, any>>(key: string): T[] => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

// Helper to save collection to localStorage
const setCollection = <T>(key: string, items: T[]) => {
  localStorage.setItem(key, JSON.stringify(items));
  notifySubscribers(key);
};

// Notify all subscribers watching a collection
const notifySubscribers = (collectionKey: string) => {
  const callbacks = subscriptions.get(collectionKey);
  if (callbacks) {
    callbacks.forEach(cb => {
      try {
        cb();
      } catch (e) {
        console.error('Subscription callback error:', e);
      }
    });
  }
};

// Start polling for subscription updates
const ensurePolling = () => {
  if (!pollInterval) {
    pollInterval = setInterval(() => {
      // Polling is handled by notifySubscribers calls on mutations
      // This is just a safety net
    }, 1000);
  }
};

export const dbService = {
  async getAllUserData(userId: string) {
    return {
      workouts: getCollection<Workout>(STORAGE_KEYS.workouts).filter(w => w.userId === userId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      sleep: getCollection<SleepLog>(STORAGE_KEYS.sleep_logs).filter(s => s.userId === userId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      habits: getCollection<Habit>(STORAGE_KEYS.habits).filter(h => h.userId === userId),
      bodyMetrics: getCollection<BodyMetrics>(STORAGE_KEYS.body_metrics).filter(m => m.userId === userId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      deepWork: getCollection<DeepWorkTarget>(STORAGE_KEYS.deep_work_targets).filter(d => d.userId === userId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      skincare: getCollection<SkincareLog>(STORAGE_KEYS.skincare_logs).filter(s => s.userId === userId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    };
  },

  // User Profile
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const users = getCollection<UserProfile>(STORAGE_KEYS.users);
    return users.find(u => u.uid === uid) || null;
  },

  async updateUserProfile(uid: string, data: Partial<UserProfile>) {
    const users = getCollection<UserProfile>(STORAGE_KEYS.users);
    const index = users.findIndex(u => u.uid === uid);
    if (index >= 0) {
      users[index] = { ...users[index], ...data };
    } else {
      users.push({ uid, ...data } as UserProfile);
    }
    setCollection(STORAGE_KEYS.users, users);
  },

  subscribeUserProfile(uid: string, callback: (profile: UserProfile) => void) {
    const key = STORAGE_KEYS.users;
    const wrappedCallback = () => {
      const users = getCollection<UserProfile>(key);
      const user = users.find(u => u.uid === uid);
      if (user) {
        callback(user);
      }
    };

    if (!subscriptions.has(key)) {
      subscriptions.set(key, new Set());
    }
    subscriptions.get(key)!.add(wrappedCallback);
    ensurePolling();

    // Initial call
    wrappedCallback();

    // Return unsubscribe function
    return () => {
      subscriptions.get(key)?.delete(wrappedCallback);
      return undefined;
    };
  },

  // Workouts
  subscribeWorkouts(uid: string, callback: (workouts: Workout[]) => void) {
    const key = STORAGE_KEYS.workouts;
    const wrappedCallback = () => {
      let workouts = getCollection<Workout>(key).filter(w => w.userId === uid);
      workouts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      callback(workouts);
    };

    if (!subscriptions.has(key)) {
      subscriptions.set(key, new Set());
    }
    subscriptions.get(key)!.add(wrappedCallback);
    ensurePolling();

    wrappedCallback();
    return () => {
      subscriptions.get(key)?.delete(wrappedCallback);
    };
  },

  async addWorkout(workout: Omit<Workout, 'id'>) {
    const workouts = getCollection<Workout>(STORAGE_KEYS.workouts);
    const newWorkout: Workout = { ...workout, id: generateId(), date: new Date().toISOString() };
    workouts.push(newWorkout);
    setCollection(STORAGE_KEYS.workouts, workouts);
    return { id: newWorkout.id };
  },

  // Skincare
  subscribeSkincare(uid: string, callback: (logs: SkincareLog[]) => void) {
    const key = STORAGE_KEYS.skincare_logs;
    const wrappedCallback = () => {
      let logs = getCollection<SkincareLog>(key).filter(l => l.userId === uid);
      logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      callback(logs);
    };

    if (!subscriptions.has(key)) {
      subscriptions.set(key, new Set());
    }
    subscriptions.get(key)!.add(wrappedCallback);
    ensurePolling();

    wrappedCallback();
    return () => {
      subscriptions.get(key)?.delete(wrappedCallback);
    };
  },

  async addSkincareLog(log: Omit<SkincareLog, 'id'>) {
    const logs = getCollection<SkincareLog>(STORAGE_KEYS.skincare_logs);
    const newLog: SkincareLog = { ...log, id: generateId(), date: new Date().toISOString() };
    logs.push(newLog);
    setCollection(STORAGE_KEYS.skincare_logs, logs);
  },

  // Sleep
  subscribeSleep(uid: string, callback: (logs: SleepLog[]) => void) {
    const key = STORAGE_KEYS.sleep_logs;
    const wrappedCallback = () => {
      let logs = getCollection<SleepLog>(key).filter(l => l.userId === uid);
      logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      callback(logs);
    };

    if (!subscriptions.has(key)) {
      subscriptions.set(key, new Set());
    }
    subscriptions.get(key)!.add(wrappedCallback);
    ensurePolling();

    wrappedCallback();
    return () => {
      subscriptions.get(key)?.delete(wrappedCallback);
    };
  },

  async addSleepLog(log: Omit<SleepLog, 'id'>) {
    const logs = getCollection<SleepLog>(STORAGE_KEYS.sleep_logs);
    const newLog: SleepLog = { ...log, id: generateId(), date: new Date().toISOString() };
    logs.push(newLog);
    setCollection(STORAGE_KEYS.sleep_logs, logs);
  },

  // Tasks
  subscribeTasks(uid: string, callback: (tasks: Task[]) => void) {
    const key = STORAGE_KEYS.tasks;
    const wrappedCallback = () => {
      let tasks = getCollection<Task>(key).filter(t => t.userId === uid);
      tasks.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      callback(tasks);
    };

    if (!subscriptions.has(key)) {
      subscriptions.set(key, new Set());
    }
    subscriptions.get(key)!.add(wrappedCallback);
    ensurePolling();

    wrappedCallback();
    return () => {
      subscriptions.get(key)?.delete(wrappedCallback);
    };
  },

  async addTask(task: Omit<Task, 'id'>) {
    const tasks = getCollection<Task>(STORAGE_KEYS.tasks);
    const newTask: Task = { ...task, id: generateId(), createdAt: new Date().toISOString() };
    tasks.push(newTask);
    setCollection(STORAGE_KEYS.tasks, tasks);
  },

  async toggleTask(taskId: string, completed: boolean) {
    const tasks = getCollection<Task>(STORAGE_KEYS.tasks);
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      task.completed = completed;
      setCollection(STORAGE_KEYS.tasks, tasks);
    }
  },

  async updateTask(taskId: string, data: Partial<Task>) {
    const tasks = getCollection<Task>(STORAGE_KEYS.tasks);
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      Object.assign(task, data);
      setCollection(STORAGE_KEYS.tasks, tasks);
    }
  },

  async deleteTask(taskId: string) {
    const tasks = getCollection<Task>(STORAGE_KEYS.tasks);
    const filtered = tasks.filter(t => t.id !== taskId);
    setCollection(STORAGE_KEYS.tasks, filtered);
  },

  // Habits
  subscribeHabits(uid: string, callback: (habits: Habit[]) => void) {
    const key = STORAGE_KEYS.habits;
    const wrappedCallback = () => {
      const habits = getCollection<Habit>(key).filter(h => h.userId === uid);
      callback(habits);
    };

    if (!subscriptions.has(key)) {
      subscriptions.set(key, new Set());
    }
    subscriptions.get(key)!.add(wrappedCallback);
    ensurePolling();

    wrappedCallback();
    return () => {
      subscriptions.get(key)?.delete(wrappedCallback);
    };
  },

  async addHabit(habit: Omit<Habit, 'id'>) {
    const habits = getCollection<Habit>(STORAGE_KEYS.habits);
    const newHabit: Habit = { ...habit, id: generateId() };
    habits.push(newHabit);
    setCollection(STORAGE_KEYS.habits, habits);
  },

  async updateHabit(habitId: string, data: Partial<Habit>) {
    const habits = getCollection<Habit>(STORAGE_KEYS.habits);
    const habit = habits.find(h => h.id === habitId);
    if (habit) {
      Object.assign(habit, data);
      setCollection(STORAGE_KEYS.habits, habits);
    }
  },

  async deleteHabit(habitId: string) {
    const habits = getCollection<Habit>(STORAGE_KEYS.habits);
    const filtered = habits.filter(h => h.id !== habitId);
    setCollection(STORAGE_KEYS.habits, filtered);
  },

  async toggleHabit(habitId: string, completed: boolean) {
    const habits = getCollection<Habit>(STORAGE_KEYS.habits);
    const habit = habits.find(h => h.id === habitId);
    if (habit) {
      const today = new Date().toISOString().split('T')[0];
      habit.history = habit.history || {};
      habit.history[today] = completed;

      let streak = habit.streak || 0;
      if (completed && !habit.completedToday) streak += 1;
      else if (!completed && habit.completedToday) streak = Math.max(0, streak - 1);

      habit.completedToday = completed;
      habit.streak = streak;
      setCollection(STORAGE_KEYS.habits, habits);
    }
  },

  // Body Metrics
  subscribeBodyMetrics(uid: string, callback: (metrics: BodyMetrics[]) => void) {
    const key = STORAGE_KEYS.body_metrics;
    const wrappedCallback = () => {
      let metrics = getCollection<BodyMetrics>(key).filter(m => m.userId === uid);
      metrics.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      callback(metrics);
    };

    if (!subscriptions.has(key)) {
      subscriptions.set(key, new Set());
    }
    subscriptions.get(key)!.add(wrappedCallback);
    ensurePolling();

    wrappedCallback();
    return () => {
      subscriptions.get(key)?.delete(wrappedCallback);
    };
  },

  async addBodyMetric(metric: Omit<BodyMetrics, 'id'>) {
    const metrics = getCollection<BodyMetrics>(STORAGE_KEYS.body_metrics);
    const newMetric: BodyMetrics = { ...metric, id: generateId(), date: metric.date || new Date().toISOString() };
    metrics.push(newMetric);
    setCollection(STORAGE_KEYS.body_metrics, metrics);
  },

  async updateBodyMetric(metricId: string, data: Partial<BodyMetrics>) {
    const metrics = getCollection<BodyMetrics>(STORAGE_KEYS.body_metrics);
    const metric = metrics.find(m => m.id === metricId);
    if (metric) {
      Object.assign(metric, data);
      setCollection(STORAGE_KEYS.body_metrics, metrics);
    }
  },

  // Timeline Events
  subscribeTimelineEvents(uid: string, callback: (events: TimelineEvent[]) => void) {
    const key = STORAGE_KEYS.timeline_events;
    const wrappedCallback = () => {
      let events = getCollection<TimelineEvent>(key).filter(e => e.userId === uid);
      events.sort((a, b) => a.startTime.localeCompare(b.startTime));
      callback(events);
    };

    if (!subscriptions.has(key)) {
      subscriptions.set(key, new Set());
    }
    subscriptions.get(key)!.add(wrappedCallback);
    ensurePolling();

    wrappedCallback();
    return () => {
      subscriptions.get(key)?.delete(wrappedCallback);
    };
  },

  async addTimelineEvent(event: Omit<TimelineEvent, 'id'>) {
    const events = getCollection<TimelineEvent>(STORAGE_KEYS.timeline_events);
    const newEvent: TimelineEvent = { ...event, id: generateId() };
    events.push(newEvent);
    setCollection(STORAGE_KEYS.timeline_events, events);
  },

  async updateTimelineEvent(eventId: string, data: Partial<TimelineEvent>) {
    const events = getCollection<TimelineEvent>(STORAGE_KEYS.timeline_events);
    const event = events.find(e => e.id === eventId);
    if (event) {
      Object.assign(event, data);
      setCollection(STORAGE_KEYS.timeline_events, events);
    }
  },

  async deleteTimelineEvent(eventId: string) {
    const events = getCollection<TimelineEvent>(STORAGE_KEYS.timeline_events);
    const filtered = events.filter(e => e.id !== eventId);
    setCollection(STORAGE_KEYS.timeline_events, filtered);
  },

  // Deep Work Targets
  subscribeDeepWorkTargets(uid: string, callback: (targets: DeepWorkTarget[]) => void) {
    const key = STORAGE_KEYS.deep_work_targets;
    const wrappedCallback = () => {
      let targets = getCollection<DeepWorkTarget>(key).filter(t => t.userId === uid);
      targets.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      callback(targets);
    };

    if (!subscriptions.has(key)) {
      subscriptions.set(key, new Set());
    }
    subscriptions.get(key)!.add(wrappedCallback);
    ensurePolling();

    wrappedCallback();
    return () => {
      subscriptions.get(key)?.delete(wrappedCallback);
    };
  },

  async setDeepWorkTarget(target: Omit<DeepWorkTarget, 'id'>) {
    const targets = getCollection<DeepWorkTarget>(STORAGE_KEYS.deep_work_targets);
    const existing = targets.find(t => t.userId === target.userId && t.date === target.date);
    if (existing) {
      Object.assign(existing, target);
    } else {
      targets.push({ ...target, id: generateId() } as DeepWorkTarget);
    }
    setCollection(STORAGE_KEYS.deep_work_targets, targets);
  },

  // Exercises
  async addExercise(exercise: Omit<Exercise, 'id'>) {
    const exercises = getCollection<Exercise>(STORAGE_KEYS.exercises);
    const newExercise: Exercise = { ...exercise, id: generateId() };
    exercises.push(newExercise);
    setCollection(STORAGE_KEYS.exercises, exercises);
  },

  subscribeExercises(workoutId: string, userId: string, callback: (exercises: Exercise[]) => void) {
    const key = STORAGE_KEYS.exercises;
    const wrappedCallback = () => {
      const exercises = getCollection<Exercise>(key).filter(e => e.workoutId === workoutId && e.userId === userId);
      callback(exercises);
    };

    if (!subscriptions.has(key)) {
      subscriptions.set(key, new Set());
    }
    subscriptions.get(key)!.add(wrappedCallback);
    ensurePolling();

    wrappedCallback();
    return () => {
      subscriptions.get(key)?.delete(wrappedCallback);
    };
  },

  async updateExerciseSets(exerciseId: string, sets: { reps: number; weight: number }[]) {
    const exercises = getCollection<Exercise>(STORAGE_KEYS.exercises);
    const exercise = exercises.find(e => e.id === exerciseId);
    if (exercise) {
      exercise.sets = sets;
      setCollection(STORAGE_KEYS.exercises, exercises);
    }
  },

  async completeWorkout(workoutId: string, duration: number) {
    const workouts = getCollection<Workout>(STORAGE_KEYS.workouts);
    const workout = workouts.find(w => w.id === workoutId);
    if (workout) {
      workout.status = 'completed';
      workout.duration = duration;
      setCollection(STORAGE_KEYS.workouts, workouts);
    }
  },

  async deleteWorkout(workoutId: string, userId: string) {
    const workouts = getCollection<Workout>(STORAGE_KEYS.workouts);
    const exercises = getCollection<Exercise>(STORAGE_KEYS.exercises);
    setCollection(STORAGE_KEYS.workouts, workouts.filter(w => w.id !== workoutId));
    setCollection(STORAGE_KEYS.exercises, exercises.filter(e => e.workoutId !== workoutId));
  },

  async deleteExercise(exerciseId: string) {
    const exercises = getCollection<Exercise>(STORAGE_KEYS.exercises);
    const filtered = exercises.filter(e => e.id !== exerciseId);
    setCollection(STORAGE_KEYS.exercises, filtered);
  },

  // Routine Tasks
  subscribeRoutineTasks(uid: string, callback: (tasks: RoutineTask[]) => void) {
    const key = STORAGE_KEYS.routine_tasks;
    const wrappedCallback = () => {
      const tasks = getCollection<RoutineTask>(key).filter(t => t.userId === uid);
      callback(tasks);
    };

    if (!subscriptions.has(key)) {
      subscriptions.set(key, new Set());
    }
    subscriptions.get(key)!.add(wrappedCallback);
    ensurePolling();

    wrappedCallback();
    return () => {
      subscriptions.get(key)?.delete(wrappedCallback);
    };
  },

  async addRoutineTask(task: Omit<RoutineTask, 'id'>) {
    const tasks = getCollection<RoutineTask>(STORAGE_KEYS.routine_tasks);
    const newTask: RoutineTask = { ...task, id: generateId() };
    tasks.push(newTask);
    setCollection(STORAGE_KEYS.routine_tasks, tasks);
  },

  async toggleRoutineTask(taskId: string, completed: boolean) {
    const tasks = getCollection<RoutineTask>(STORAGE_KEYS.routine_tasks);
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const today = new Date().toISOString().split('T')[0];
      task.history = task.history || {};
      task.history[today] = completed;
      task.completedToday = completed;
      setCollection(STORAGE_KEYS.routine_tasks, tasks);
    }
  },

  async deleteRoutineTask(taskId: string) {
    const tasks = getCollection<RoutineTask>(STORAGE_KEYS.routine_tasks);
    const filtered = tasks.filter(t => t.id !== taskId);
    setCollection(STORAGE_KEYS.routine_tasks, filtered);
  }
};
