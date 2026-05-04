import Dexie, { liveQuery, type Table } from 'dexie';
import {
  AiMemoryRecord,
  DashboardSnapshot,
  HabitLogRecord,
  InsightRecord,
  KnowledgeItemRecord,
  LifeOSSnapshot,
  LifeScoreRecord,
  MoodLogRecord,
  NutritionLogRecord,
  PlannerTaskRecord,
  PredictionRecord,
  StoredBodyMetrics,
  StoredDeepWorkTarget,
  StoredExercise,
  StoredRoutineTask,
  StoredSkincareLog,
  StoredSleepLog,
  StoredTimelineEvent,
  StoredWorkout,
  UserRecord,
  WeeklyReview,
  buildDashboardSnapshot,
  calculateLifeScore,
  generateInsights,
  generatePredictions,
  buildWeeklyReview,
} from './intelligence';
import { BodyMetrics, DeepWorkTarget, Exercise, Habit, RoutineTask, SleepLog, SkincareLog, Task, TimelineEvent, UserProfile, Workout } from '../types';

type DbUser = UserRecord;
type DbWorkout = StoredWorkout;
type DbSleepLog = StoredSleepLog;
type DbSkincareLog = StoredSkincareLog;
type DbBodyMetric = StoredBodyMetrics;
type DbTimelineEvent = StoredTimelineEvent;
type DbDeepWorkTarget = StoredDeepWorkTarget;
type DbRoutineTask = StoredRoutineTask;
type DbExercise = StoredExercise;
type DbPlannerTask = PlannerTaskRecord;
type DbHabitLog = HabitLogRecord;
type DbKnowledgeItem = KnowledgeItemRecord;
type DbAiMemory = AiMemoryRecord;
type DbLifeScore = LifeScoreRecord;
type DbInsight = InsightRecord;
type DbPrediction = PredictionRecord;
type DbMoodLog = MoodLogRecord;
type DbNutritionLog = NutritionLogRecord;

const TABLE_SCHEMA = {
  users: 'uid, email, createdAt, updatedAt',
  workouts: 'id, userId, date, status, [userId+date], [userId+status], updatedAt',
  exercises: 'id, userId, workoutId, [userId+workoutId], updatedAt',
  sleep_logs: 'id, userId, date, [userId+date], updatedAt',
  skincare_logs: 'id, userId, date, routineType, [userId+date], [userId+routineType], updatedAt',
  body_metrics: 'id, userId, date, [userId+date], updatedAt',
  timeline_events: 'id, userId, startTime, type, [userId+startTime], [userId+type], updatedAt',
  deep_work_targets: 'id, userId, date, [userId+date], updatedAt',
  routine_tasks: 'id, userId, type, [userId+type], updatedAt',
  tasks: 'id, userId, date, priority, completed, [userId+date], [userId+priority], [userId+completed], updatedAt',
  habits: 'id, userId, frequency, completedToday, [userId+frequency], updatedAt',
  habit_logs: 'id, userId, habitId, date, [userId+date], [userId+habitId], updatedAt',
  nutrition_logs: 'id, userId, date, [userId+date], updatedAt',
  mood_logs: 'id, userId, date, mood, [userId+date], [userId+mood], updatedAt',
  planner_tasks: 'id, userId, date, priority, completed, [userId+date], [userId+priority], [userId+completed], updatedAt',
  knowledge_items: 'id, userId, type, createdAt, [userId+type], updatedAt',
  ai_memory: 'id, userId, scope, key, updatedAt, [userId+scope], [userId+key]',
  life_scores: 'id, userId, date, [userId+date], updatedAt',
  insights: 'id, userId, date, category, impact, source, [userId+date], [userId+category], updatedAt',
  predictions: 'id, userId, date, type, source, [userId+date], [userId+type], updatedAt',
  sync_queue: 'id, userId, entityType, updatedAt, [userId+entityType], [userId+updatedAt]',
} as const;

const nowIso = () => new Date().toISOString();
const todayKey = () => new Date().toISOString().slice(0, 10);
const generateId = () => (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

const parseTime = (value?: string) => (value ? new Date(value).getTime() : 0);
const sortByDateDesc = <T extends { date?: string; createdAt?: string; updatedAt?: string }>(items: T[]) => [...items].sort((left, right) => {
  const leftTime = parseTime(left.date || left.updatedAt || left.createdAt);
  const rightTime = parseTime(right.date || right.updatedAt || right.createdAt);
  return rightTime - leftTime;
});

const dataUrlToBlob = async (dataUrl?: string) => {
  if (!dataUrl || !dataUrl.startsWith('data:')) return undefined;
  const response = await fetch(dataUrl);
  return await response.blob();
};

const sanitizeArray = <T>(value: T | undefined | null) => (Array.isArray(value) ? value : []);

class LifeOSDatabase extends Dexie {
  users!: Table<DbUser, string>;
  workouts!: Table<DbWorkout, string>;
  exercises!: Table<DbExercise, string>;
  sleep_logs!: Table<DbSleepLog, string>;
  skincare_logs!: Table<DbSkincareLog, string>;
  body_metrics!: Table<DbBodyMetric, string>;
  timeline_events!: Table<DbTimelineEvent, string>;
  deep_work_targets!: Table<DbDeepWorkTarget, string>;
  routine_tasks!: Table<DbRoutineTask, string>;
  tasks!: Table<DbPlannerTask, string>;
  habits!: Table<Habit, string>;
  habit_logs!: Table<DbHabitLog, string>;
  nutrition_logs!: Table<DbNutritionLog, string>;
  mood_logs!: Table<DbMoodLog, string>;
  planner_tasks!: Table<DbPlannerTask, string>;
  knowledge_items!: Table<DbKnowledgeItem, string>;
  ai_memory!: Table<DbAiMemory, string>;
  life_scores!: Table<DbLifeScore, string>;
  insights!: Table<DbInsight, string>;
  predictions!: Table<DbPrediction, string>;
  sync_queue!: Table<{ id: string; userId: string; entityType: string; entityId: string; payload: string; createdAt: string; updatedAt: string }, string>;

  constructor() {
    super('lifeos-offline-db');

    this.version(1).stores(TABLE_SCHEMA);

    this.version(2).stores(TABLE_SCHEMA).upgrade(async (tx) => {
      const users = tx.table('users');
      await users.toCollection().modify((user: any) => {
        user.updatedAt = user.updatedAt || user.createdAt || nowIso();
      });
    });
  }
}

const db = new LifeOSDatabase();

const recomputeTimers = new Map<string, ReturnType<typeof setTimeout>>();

const scheduleRecompute = (userId: string) => {
  const existing = recomputeTimers.get(userId);
  if (existing) {
    clearTimeout(existing);
  }

  const timer = setTimeout(() => {
    void refreshDerivedData(userId);
  }, 150);

  recomputeTimers.set(userId, timer);
};

const loadSnapshot = async (userId: string): Promise<LifeOSSnapshot> => {
  const [
    profile,
    habits,
    habitLogs,
    workouts,
    sleepLogs,
    nutritionLogs,
    moodLogs,
    plannerTasks,
    tasks,
    knowledgeItems,
    aiMemory,
    lifeScores,
    insights,
    predictions,
    skincareLogs,
    bodyMetrics,
    timelineEvents,
    deepWorkTargets,
    routineTasks,
    exercises,
  ] = await Promise.all([
    db.users.get(userId),
    db.habits.where('userId').equals(userId).toArray(),
    db.habit_logs.where('userId').equals(userId).toArray(),
    db.workouts.where('userId').equals(userId).toArray(),
    db.sleep_logs.where('userId').equals(userId).toArray(),
    db.nutrition_logs.where('userId').equals(userId).toArray(),
    db.mood_logs.where('userId').equals(userId).toArray(),
    db.planner_tasks.where('userId').equals(userId).toArray(),
    db.knowledge_items.where('userId').equals(userId).toArray(),
    db.ai_memory.where('userId').equals(userId).toArray(),
    db.life_scores.where('userId').equals(userId).toArray(),
    db.insights.where('userId').equals(userId).toArray(),
    db.predictions.where('userId').equals(userId).toArray(),
    db.skincare_logs.where('userId').equals(userId).toArray(),
    db.body_metrics.where('userId').equals(userId).toArray(),
    db.timeline_events.where('userId').equals(userId).toArray(),
    db.deep_work_targets.where('userId').equals(userId).toArray(),
    db.routine_tasks.where('userId').equals(userId).toArray(),
    db.exercises.where('userId').equals(userId).toArray(),
  ]);

  return {
    profile: profile || null,
    habits: sortByDateDesc(habits as Habit[]),
    habitLogs: sortByDateDesc(habitLogs),
    workouts: sortByDateDesc(workouts),
    sleepLogs: sortByDateDesc(sleepLogs),
    nutritionLogs: sortByDateDesc(nutritionLogs),
    moodLogs: sortByDateDesc(moodLogs),
    plannerTasks: sortByDateDesc(plannerTasks),
    tasks: sortByDateDesc(tasks),
    knowledgeItems: sortByDateDesc(knowledgeItems),
    aiMemory: sortByDateDesc(aiMemory),
    lifeScores: sortByDateDesc(lifeScores),
    insights: sortByDateDesc(insights),
    predictions: sortByDateDesc(predictions),
    skincareLogs: sortByDateDesc(skincareLogs),
    bodyMetrics: sortByDateDesc(bodyMetrics),
    timelineEvents: sortByDateDesc(timelineEvents),
    deepWorkTargets: sortByDateDesc(deepWorkTargets),
    routineTasks: sortByDateDesc(routineTasks),
    exercises: sortByDateDesc(exercises),
  };
};

const replaceEngineDerivedRows = async (userId: string, day: string, records: { insights: InsightRecord[]; predictions: PredictionRecord[]; score: LifeScoreRecord }) => {
  const existingInsights = await db.insights.where('[userId+date]').equals([userId, day]).and((row) => row.source === 'engine').toArray();
  const existingPredictions = await db.predictions.where('[userId+date]').equals([userId, day]).and((row) => row.source === 'engine').toArray();

  await Promise.all([
    existingInsights.length ? db.insights.bulkDelete(existingInsights.map((row) => row.id)) : Promise.resolve(),
    existingPredictions.length ? db.predictions.bulkDelete(existingPredictions.map((row) => row.id)) : Promise.resolve(),
  ]);

  await Promise.all([
    db.life_scores.put(records.score),
    records.insights.length ? db.insights.bulkPut(records.insights) : Promise.resolve(),
    records.predictions.length ? db.predictions.bulkPut(records.predictions) : Promise.resolve(),
  ]);
};

const refreshDerivedData = async (userId: string) => {
  const snapshot = await loadSnapshot(userId);
  const day = todayKey();
  const previousScore = snapshot.lifeScores[0] || null;
  const score = calculateLifeScore(snapshot, previousScore);
  const insights = generateInsights(snapshot);
  const predictions = generatePredictions(snapshot);

  await db.transaction('rw', db.life_scores, db.insights, db.predictions, db.users, async () => {
    await replaceEngineDerivedRows(userId, day, { score, insights, predictions });

    const profile = snapshot.profile;
    const previousOverall = previousScore?.overall ?? profile?.lifeScore ?? score.overall;
    const lifeScoreDelta = score.overall - previousOverall;

    await db.users.put({
      ...(profile || {
        uid: userId,
        email: '',
        displayName: 'User',
        photoURL: '',
        lifeScore: score.overall,
        lifeScoreDelta,
        streak: 0,
        createdAt: nowIso(),
      }),
      uid: userId,
      updatedAt: nowIso(),
      lifeScore: score.overall,
      lifeScoreDelta,
    });
  });
};

const subscribeQuery = <T>(query: () => Promise<T>, callback: (value: T) => void) => {
  const subscription = liveQuery(query).subscribe({
    next: callback,
    error: (error) => {
      console.error('IndexedDB subscription error:', error);
    },
  });

  return () => subscription.unsubscribe();
};

const ensureUserSeed = async (user: UserProfile) => {
  const existing = await db.users.get(user.uid);
  if (!existing) {
    await db.users.put({
      ...user,
      lifeScore: user.lifeScore ?? 50,
      lifeScoreDelta: user.lifeScoreDelta ?? 0,
      updatedAt: nowIso(),
    });
  } else {
    await db.users.put({
      ...existing,
      ...user,
      updatedAt: nowIso(),
    });
  }

  scheduleRecompute(user.uid);
};

export const dbService = {
  async bootstrapUser(user: UserProfile) {
    await ensureUserSeed(user);
  },

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    return (await db.users.get(uid)) || null;
  },

  async updateUserProfile(uid: string, data: Partial<UserProfile>) {
    const existing = await db.users.get(uid);
    await db.users.put({
      ...(existing || {
        uid,
        email: '',
        displayName: 'User',
        photoURL: '',
        lifeScore: 50,
        streak: 0,
        createdAt: nowIso(),
      }),
      ...data,
      uid,
      updatedAt: nowIso(),
    });
  },

  subscribeUserProfile(uid: string, callback: (profile: UserProfile | null) => void) {
    return subscribeQuery(() => db.users.get(uid), callback);
  },

  async getAllUserData(userId: string) {
    const snapshot = await loadSnapshot(userId);
    const today = todayKey();

    return {
      workouts: snapshot.workouts as Workout[],
      skincare: snapshot.skincareLogs as SkincareLog[],
      sleep: snapshot.sleepLogs as SleepLog[],
      habits: snapshot.habits,
      bodyMetrics: snapshot.bodyMetrics as BodyMetrics[],
      deepWork: snapshot.deepWorkTargets.find((target) => target.date === today) || null,
      timelineEvents: snapshot.timelineEvents as TimelineEvent[],
      tasks: snapshot.tasks as Task[],
      routineTasks: snapshot.routineTasks as RoutineTask[],
      plannerTasks: snapshot.plannerTasks,
      moodLogs: snapshot.moodLogs,
      nutritionLogs: snapshot.nutritionLogs,
      knowledgeItems: snapshot.knowledgeItems,
      aiMemory: snapshot.aiMemory,
      lifeScores: snapshot.lifeScores,
      insights: snapshot.insights,
      predictions: snapshot.predictions,
      profile: snapshot.profile,
      sleepLogs: snapshot.sleepLogs,
      skincareLogs: snapshot.skincareLogs,
      deepWorkTargets: snapshot.deepWorkTargets,
      habitLogs: snapshot.habitLogs,
      exercises: snapshot.exercises,
    };
  },

  subscribeWorkouts(uid: string, callback: (workouts: Workout[]) => void) {
    return subscribeQuery(async () => sortByDateDesc(await db.workouts.where('userId').equals(uid).toArray()), callback);
  },

  async addWorkout(workout: Omit<Workout, 'id'>) {
    const id = generateId();
    const record: DbWorkout = {
      ...workout,
      id,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    await db.workouts.put(record);
    scheduleRecompute(workout.userId);
    return { id };
  },

  async completeWorkout(workoutId: string, duration: number) {
    const workout = await db.workouts.get(workoutId);
    if (!workout) return;

    await db.workouts.update(workoutId, {
      status: 'completed',
      duration,
      updatedAt: nowIso(),
    });
    scheduleRecompute(workout.userId);
  },

  async deleteWorkout(workoutId: string, userId: string) {
    await db.transaction('rw', db.workouts, db.exercises, async () => {
      await db.workouts.delete(workoutId);
      await db.exercises.where('workoutId').equals(workoutId).delete();
    });
    scheduleRecompute(userId);
  },

  subscribeExercises(workoutId: string, userId: string, callback: (exercises: Exercise[]) => void) {
    return subscribeQuery(
      async () => sortByDateDesc(await db.exercises.where('[userId+workoutId]').equals([userId, workoutId]).toArray()),
      callback,
    );
  },

  async addExercise(exercise: Omit<Exercise, 'id'>) {
    const id = generateId();
    await db.exercises.put({
      ...exercise,
      id,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    scheduleRecompute(exercise.userId);
    return { id };
  },

  async updateExerciseSets(exerciseId: string, sets: { reps: number; weight: number }[]) {
    const exercise = await db.exercises.get(exerciseId);
    if (!exercise) return;

    await db.exercises.update(exerciseId, { sets, updatedAt: nowIso() });
    scheduleRecompute(exercise.userId);
  },

  async deleteExercise(exerciseId: string) {
    const exercise = await db.exercises.get(exerciseId);
    await db.exercises.delete(exerciseId);
    if (exercise) scheduleRecompute(exercise.userId);
  },

  subscribeSleep(uid: string, callback: (logs: SleepLog[]) => void) {
    return subscribeQuery(async () => sortByDateDesc(await db.sleep_logs.where('userId').equals(uid).toArray()), callback);
  },

  async addSleepLog(log: Omit<SleepLog, 'id'>) {
    const record: DbSleepLog = {
      ...log,
      id: generateId(),
      date: log.date || nowIso(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    await db.sleep_logs.put(record);
    scheduleRecompute(log.userId);
  },

  subscribeSkincare(uid: string, callback: (logs: SkincareLog[]) => void) {
    return subscribeQuery(async () => sortByDateDesc(await db.skincare_logs.where('userId').equals(uid).toArray()), callback);
  },

  async addSkincareLog(log: Omit<SkincareLog, 'id'>) {
    const record: DbSkincareLog = {
      ...log,
      id: generateId(),
      date: log.date || nowIso(),
      imageBlob: await dataUrlToBlob(log.imageUrl),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    await db.skincare_logs.put(record);
    scheduleRecompute(log.userId);
  },

  subscribeBodyMetrics(uid: string, callback: (metrics: BodyMetrics[]) => void) {
    return subscribeQuery(async () => sortByDateDesc(await db.body_metrics.where('userId').equals(uid).toArray()), callback);
  },

  async addBodyMetric(metric: Omit<BodyMetrics, 'id'>) {
    const record: DbBodyMetric = {
      ...metric,
      id: generateId(),
      date: metric.date || nowIso(),
      imageBlob: await dataUrlToBlob(metric.imageUrl),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    await db.body_metrics.put(record);
    scheduleRecompute(metric.userId);
  },

  async updateBodyMetric(metricId: string, data: Partial<BodyMetrics>) {
    const existing = await db.body_metrics.get(metricId);
    if (!existing) return;

    await db.body_metrics.update(metricId, {
      ...data,
      updatedAt: nowIso(),
      ...(typeof data.imageUrl === 'string' ? { imageBlob: await dataUrlToBlob(data.imageUrl) } : {}),
    });
    scheduleRecompute(existing.userId);
  },

  subscribeTasks(uid: string, callback: (tasks: Task[]) => void) {
    return subscribeQuery(async () => sortByDateDesc(await db.tasks.where('userId').equals(uid).toArray()), callback);
  },

  async addTask(task: Omit<Task, 'id'>) {
    const record: DbPlannerTask = {
      ...task,
      id: generateId(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    } as DbPlannerTask;

    await db.tasks.put(record);
    await db.planner_tasks.put({ ...record, dueDate: task.date, completedAt: task.completed ? nowIso() : undefined });
    scheduleRecompute(task.userId);
  },

  async toggleTask(taskId: string, completed: boolean) {
    const task = await db.tasks.get(taskId);
    if (!task) return;

    const updated = {
      completed,
      updatedAt: nowIso(),
    };

    await db.tasks.update(taskId, updated);
    await db.planner_tasks.update(taskId, {
      ...updated,
      completedAt: completed ? nowIso() : undefined,
    });
    scheduleRecompute(task.userId);
  },

  async updateTask(taskId: string, data: Partial<Task>) {
    const task = await db.tasks.get(taskId);
    if (!task) return;

    await db.tasks.update(taskId, { ...data, updatedAt: nowIso() });
    await db.planner_tasks.update(taskId, { ...data, updatedAt: nowIso() });
    scheduleRecompute(task.userId);
  },

  async deleteTask(taskId: string) {
    const task = await db.tasks.get(taskId);
    await db.tasks.delete(taskId);
    await db.planner_tasks.delete(taskId);
    if (task) scheduleRecompute(task.userId);
  },

  subscribeHabits(uid: string, callback: (habits: Habit[]) => void) {
    return subscribeQuery(async () => sortByDateDesc(await db.habits.where('userId').equals(uid).toArray()), callback);
  },

  async addHabit(habit: Omit<Habit, 'id'>) {
    const record = {
      ...habit,
      id: generateId(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    } as Habit & { createdAt: string; updatedAt: string };

    await db.habits.put(record);
    scheduleRecompute(habit.userId);
  },

  async updateHabit(habitId: string, data: Partial<Habit>) {
    const habit = await db.habits.get(habitId);
    if (!habit) return;

    await db.habits.update(habitId, { ...data, updatedAt: nowIso() });
    scheduleRecompute(habit.userId);
  },

  async deleteHabit(habitId: string) {
    const habit = await db.habits.get(habitId);
    await db.habits.delete(habitId);
    if (habit) scheduleRecompute(habit.userId);
  },

  async toggleHabit(habitId: string, completed: boolean) {
    const habit = await db.habits.get(habitId);
    if (!habit) return;

    const today = todayKey();
    const streak = completed && !habit.completedToday ? (habit.streak || 0) + 1 : !completed && habit.completedToday ? Math.max(0, (habit.streak || 0) - 1) : habit.streak || 0;

    await db.habits.update(habitId, {
      completedToday: completed,
      streak,
      history: {
        ...(habit.history || {}),
        [today]: completed,
      },
      updatedAt: nowIso(),
    });

    scheduleRecompute(habit.userId);
  },

  subscribeTimelineEvents(uid: string, callback: (events: TimelineEvent[]) => void) {
    return subscribeQuery(async () => sortByDateDesc(await db.timeline_events.where('userId').equals(uid).toArray()), callback);
  },

  async addTimelineEvent(event: Omit<TimelineEvent, 'id'>) {
    const record: DbTimelineEvent = {
      ...event,
      id: generateId(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    await db.timeline_events.put(record);
    scheduleRecompute(event.userId);
  },

  async updateTimelineEvent(eventId: string, data: Partial<TimelineEvent>) {
    const event = await db.timeline_events.get(eventId);
    if (!event) return;

    await db.timeline_events.update(eventId, { ...data, updatedAt: nowIso() });
    scheduleRecompute(event.userId);
  },

  async deleteTimelineEvent(eventId: string) {
    const event = await db.timeline_events.get(eventId);
    await db.timeline_events.delete(eventId);
    if (event) scheduleRecompute(event.userId);
  },

  subscribeDeepWorkTargets(uid: string, callback: (targets: DeepWorkTarget[]) => void) {
    return subscribeQuery(async () => sortByDateDesc(await db.deep_work_targets.where('userId').equals(uid).toArray()), callback);
  },

  async setDeepWorkTarget(target: Omit<DeepWorkTarget, 'id'>) {
    const existing = await db.deep_work_targets.where('[userId+date]').equals([target.userId, target.date]).first();
    const record: DbDeepWorkTarget = {
      ...target,
      id: existing?.id || generateId(),
      createdAt: existing?.createdAt || nowIso(),
      updatedAt: nowIso(),
    };

    await db.deep_work_targets.put(record);
    scheduleRecompute(target.userId);
  },

  subscribeRoutineTasks(uid: string, callback: (tasks: RoutineTask[]) => void) {
    return subscribeQuery(async () => sortByDateDesc(await db.routine_tasks.where('userId').equals(uid).toArray()), callback);
  },

  async addRoutineTask(task: Omit<RoutineTask, 'id'>) {
    const record: DbRoutineTask = {
      ...task,
      id: generateId(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    await db.routine_tasks.put(record);
    scheduleRecompute(task.userId);
  },

  async toggleRoutineTask(taskId: string, completed: boolean) {
    const task = await db.routine_tasks.get(taskId);
    if (!task) return;

    const today = todayKey();
    await db.routine_tasks.update(taskId, {
      completedToday: completed,
      history: {
        ...(task.history || {}),
        [today]: completed,
      },
      updatedAt: nowIso(),
    });

    scheduleRecompute(task.userId);
  },

  async deleteRoutineTask(taskId: string) {
    const task = await db.routine_tasks.get(taskId);
    await db.routine_tasks.delete(taskId);
    if (task) scheduleRecompute(task.userId);
  },

  async addHabitLog(log: Omit<HabitLogRecord, 'id' | 'createdAt' | 'updatedAt'>) {
    await db.habit_logs.put({ ...log, id: generateId(), createdAt: nowIso(), updatedAt: nowIso() });
    scheduleRecompute(log.userId);
  },

  async addMoodLog(log: Omit<MoodLogRecord, 'id' | 'createdAt' | 'updatedAt'>) {
    await db.mood_logs.put({ ...log, id: generateId(), createdAt: nowIso(), updatedAt: nowIso() });
    scheduleRecompute(log.userId);
  },

  async addNutritionLog(log: Omit<NutritionLogRecord, 'id' | 'createdAt' | 'updatedAt'>) {
    const imageBlob = await dataUrlToBlob((log as NutritionLogRecord & { imageUrl?: string }).imageUrl);
    await db.nutrition_logs.put({ ...log, id: generateId(), createdAt: nowIso(), updatedAt: nowIso(), imageBlob });
    scheduleRecompute(log.userId);
  },

  async addKnowledgeItem(item: Omit<KnowledgeItemRecord, 'id' | 'createdAt' | 'updatedAt'>) {
    await db.knowledge_items.put({ ...item, id: generateId(), createdAt: nowIso(), updatedAt: nowIso() });
    scheduleRecompute(item.userId);
  },

  async upsertAiMemory(userId: string, scope: string, key: string, content: string, weight = 1) {
    const existing = await db.ai_memory.where('[userId+key]').equals([userId, key]).first();
    await db.ai_memory.put({
      id: existing?.id || generateId(),
      userId,
      scope,
      key,
      content,
      weight,
      createdAt: existing?.createdAt || nowIso(),
      updatedAt: nowIso(),
    });
  },

  async getAiMemory(userId: string, scope?: string) {
    const rows = scope
      ? await db.ai_memory.where('[userId+scope]').equals([userId, scope]).toArray()
      : await db.ai_memory.where('userId').equals(userId).toArray();

    return sortByDateDesc(rows);
  },

  subscribeDashboardState(uid: string, callback: (snapshot: DashboardSnapshot) => void) {
    return subscribeQuery(async () => {
      const snapshot = await loadSnapshot(uid);
      const lifeScore = snapshot.lifeScores[0] || null;
      const insights = snapshot.insights.filter((insight) => insight.source === 'engine');
      const predictions = snapshot.predictions.filter((prediction) => prediction.source === 'engine');

      return buildDashboardSnapshot(snapshot, lifeScore, insights, predictions);
    }, callback);
  },

  async getDashboardState(userId: string) {
    const snapshot = await loadSnapshot(userId);
    const lifeScore = snapshot.lifeScores[0] || null;
    const insights = snapshot.insights.filter((insight) => insight.source === 'engine');
    const predictions = snapshot.predictions.filter((prediction) => prediction.source === 'engine');
    return buildDashboardSnapshot(snapshot, lifeScore, insights, predictions);
  },

  async getWeeklyReview(userId: string): Promise<WeeklyReview> {
    const snapshot = await loadSnapshot(userId);
    return buildWeeklyReview(snapshot, snapshot.lifeScores.slice(0, 1), snapshot.insights, snapshot.predictions);
  },

  async exportUserData(userId: string) {
    const snapshot = await loadSnapshot(userId);
    return JSON.stringify(snapshot, null, 2);
  },

  async importUserData(userId: string, json: string) {
    const payload = JSON.parse(json) as Partial<LifeOSSnapshot>;
    await db.transaction('rw', db.users, db.workouts, db.exercises, db.sleep_logs, db.skincare_logs, db.body_metrics, db.timeline_events, db.deep_work_targets, db.routine_tasks, db.tasks, db.habits, db.habit_logs, db.nutrition_logs, db.mood_logs, db.planner_tasks, db.knowledge_items, db.ai_memory, db.life_scores, db.insights, db.predictions, async () => {
      await Promise.all([
        db.workouts.where('userId').equals(userId).delete(),
        db.exercises.where('userId').equals(userId).delete(),
        db.sleep_logs.where('userId').equals(userId).delete(),
        db.skincare_logs.where('userId').equals(userId).delete(),
        db.body_metrics.where('userId').equals(userId).delete(),
        db.timeline_events.where('userId').equals(userId).delete(),
        db.deep_work_targets.where('userId').equals(userId).delete(),
        db.routine_tasks.where('userId').equals(userId).delete(),
        db.tasks.where('userId').equals(userId).delete(),
        db.habits.where('userId').equals(userId).delete(),
        db.habit_logs.where('userId').equals(userId).delete(),
        db.nutrition_logs.where('userId').equals(userId).delete(),
        db.mood_logs.where('userId').equals(userId).delete(),
        db.planner_tasks.where('userId').equals(userId).delete(),
        db.knowledge_items.where('userId').equals(userId).delete(),
        db.ai_memory.where('userId').equals(userId).delete(),
        db.life_scores.where('userId').equals(userId).delete(),
        db.insights.where('userId').equals(userId).delete(),
        db.predictions.where('userId').equals(userId).delete(),
      ]);

      await Promise.all([
        payload.workouts?.length ? db.workouts.bulkPut(payload.workouts as DbWorkout[]) : Promise.resolve(),
        payload.exercises?.length ? db.exercises.bulkPut(payload.exercises as DbExercise[]) : Promise.resolve(),
        payload.sleepLogs?.length ? db.sleep_logs.bulkPut(payload.sleepLogs as DbSleepLog[]) : Promise.resolve(),
        payload.skincareLogs?.length ? db.skincare_logs.bulkPut(payload.skincareLogs as DbSkincareLog[]) : Promise.resolve(),
        payload.bodyMetrics?.length ? db.body_metrics.bulkPut(payload.bodyMetrics as DbBodyMetric[]) : Promise.resolve(),
        payload.timelineEvents?.length ? db.timeline_events.bulkPut(payload.timelineEvents as DbTimelineEvent[]) : Promise.resolve(),
        payload.deepWorkTargets?.length ? db.deep_work_targets.bulkPut(payload.deepWorkTargets as DbDeepWorkTarget[]) : Promise.resolve(),
        payload.routineTasks?.length ? db.routine_tasks.bulkPut(payload.routineTasks as DbRoutineTask[]) : Promise.resolve(),
        payload.habits?.length ? db.habits.bulkPut(payload.habits as Habit[]) : Promise.resolve(),
        payload.habitLogs?.length ? db.habit_logs.bulkPut(payload.habitLogs as DbHabitLog[]) : Promise.resolve(),
        payload.nutritionLogs?.length ? db.nutrition_logs.bulkPut(payload.nutritionLogs as DbNutritionLog[]) : Promise.resolve(),
        payload.moodLogs?.length ? db.mood_logs.bulkPut(payload.moodLogs as DbMoodLog[]) : Promise.resolve(),
        payload.plannerTasks?.length ? db.planner_tasks.bulkPut(payload.plannerTasks as DbPlannerTask[]) : Promise.resolve(),
        payload.knowledgeItems?.length ? db.knowledge_items.bulkPut(payload.knowledgeItems as DbKnowledgeItem[]) : Promise.resolve(),
        payload.aiMemory?.length ? db.ai_memory.bulkPut(payload.aiMemory as DbAiMemory[]) : Promise.resolve(),
        payload.lifeScores?.length ? db.life_scores.bulkPut(payload.lifeScores as DbLifeScore[]) : Promise.resolve(),
        payload.insights?.length ? db.insights.bulkPut(payload.insights as DbInsight[]) : Promise.resolve(),
        payload.predictions?.length ? db.predictions.bulkPut(payload.predictions as DbPrediction[]) : Promise.resolve(),
      ]);
    });

    scheduleRecompute(userId);
  },

  async refreshDerivedData(userId: string) {
    await refreshDerivedData(userId);
  },
};

export { db };
