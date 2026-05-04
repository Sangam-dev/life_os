import { BodyMetrics, DeepWorkTarget, Habit, RoutineTask, SleepLog, SkincareLog, Task, TimelineEvent, Workout, UserProfile } from '../types';

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const average = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);
const parseTime = (value?: string) => (value ? new Date(value).getTime() : 0);
const nowIso = () => new Date().toISOString();
const todayKey = () => new Date().toISOString().slice(0, 10);
const isSameDay = (value: string, day: string) => value.startsWith(day);

const sortByDateDesc = <T extends { date?: string; createdAt?: string }>(items: T[]) => [...items].sort((left, right) => {
  const leftTime = parseTime(left.date || left.createdAt);
  const rightTime = parseTime(right.date || right.createdAt);
  return rightTime - leftTime;
});

const lastNDays = (days: number) => {
  const keys: string[] = [];
  for (let index = 0; index < days; index += 1) {
    const day = new Date();
    day.setDate(day.getDate() - index);
    keys.push(day.toISOString().slice(0, 10));
  }
  return keys;
};

const moodToScore = (mood?: 'happy' | 'neutral' | 'tired' | 'stressed') => {
  switch (mood) {
    case 'happy':
      return 92;
    case 'neutral':
      return 72;
    case 'tired':
      return 52;
    case 'stressed':
      return 28;
    default:
      return 50;
  }
};

const severityRank: Record<'Low' | 'Medium' | 'High' | 'Critical', number> = {
  Low: 1,
  Medium: 2,
  High: 3,
  Critical: 4,
};

const priorityRank: Record<'low' | 'medium' | 'high' | 'critical', number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export interface LifeScoreRecord {
  id: string;
  userId: string;
  date: string;
  overall: number;
  physical: number;
  mental: number;
  discipline: number;
  knowledge: number;
  source: 'engine' | 'manual';
  createdAt: string;
  updatedAt: string;
}

export interface InsightRecord {
  id: string;
  userId: string;
  date: string;
  category: 'sleep' | 'mood' | 'workout' | 'discipline' | 'knowledge' | 'planning' | 'general';
  title: string;
  description: string;
  action: string;
  impact: 'Low' | 'Medium' | 'High' | 'Critical';
  confidence: number;
  source: 'engine' | 'manual';
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface PredictionRecord {
  id: string;
  userId: string;
  date: string;
  type: 'burnout_risk' | 'habit_failure' | 'sleep_debt';
  probability: number;
  score: number;
  windowDays: number;
  rationale: string;
  action: string;
  source: 'engine' | 'manual';
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeItemRecord {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: 'note' | 'book' | 'idea' | 'article' | 'reference';
  tags: string[];
  createdAt: string;
  updatedAt: string;
  attachmentId?: string;
}

export interface AiMemoryRecord {
  id: string;
  userId: string;
  scope: string;
  key: string;
  content: string;
  weight: number;
  createdAt: string;
  updatedAt: string;
}

export interface HabitLogRecord {
  id: string;
  userId: string;
  habitId: string;
  date: string;
  completed: boolean;
  notes?: string;
  value?: number;
  createdAt: string;
  updatedAt: string;
}

export interface NutritionLogRecord {
  id: string;
  userId: string;
  date: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  water?: number;
  notes?: string;
  imageBlob?: Blob;
  createdAt: string;
  updatedAt: string;
}

export interface MoodLogRecord {
  id: string;
  userId: string;
  date: string;
  mood: 'happy' | 'neutral' | 'tired' | 'stressed';
  energy?: number;
  stress?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlannerTaskRecord extends Task {
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserRecord extends UserProfile {
  updatedAt: string;
}

export interface StoredWorkout extends Workout {
  createdAt: string;
  updatedAt: string;
}

export interface StoredSleepLog extends SleepLog {
  createdAt: string;
  updatedAt: string;
}

export interface StoredSkincareLog extends SkincareLog {
  createdAt: string;
  updatedAt: string;
  imageBlob?: Blob;
}

export interface StoredBodyMetrics extends BodyMetrics {
  createdAt: string;
  updatedAt: string;
  imageBlob?: Blob;
}

export interface StoredTimelineEvent extends TimelineEvent {
  createdAt: string;
  updatedAt: string;
}

export interface StoredDeepWorkTarget extends DeepWorkTarget {
  createdAt: string;
  updatedAt: string;
}

export interface StoredRoutineTask extends RoutineTask {
  createdAt: string;
  updatedAt: string;
}

export interface StoredExercise {
  id: string;
  workoutId: string;
  userId: string;
  name: string;
  sets: { reps: number; weight: number }[];
  createdAt: string;
  updatedAt: string;
}

export interface LifeOSSnapshot {
  profile: UserRecord | null;
  habits: Habit[];
  habitLogs: HabitLogRecord[];
  workouts: StoredWorkout[];
  sleepLogs: StoredSleepLog[];
  nutritionLogs: NutritionLogRecord[];
  moodLogs: MoodLogRecord[];
  tasks: Task[];
  plannerTasks: PlannerTaskRecord[];
  knowledgeItems: KnowledgeItemRecord[];
  aiMemory: AiMemoryRecord[];
  lifeScores: LifeScoreRecord[];
  insights: InsightRecord[];
  predictions: PredictionRecord[];
  skincareLogs: StoredSkincareLog[];
  bodyMetrics: StoredBodyMetrics[];
  timelineEvents: StoredTimelineEvent[];
  deepWorkTargets: StoredDeepWorkTarget[];
  routineTasks: StoredRoutineTask[];
  exercises: StoredExercise[];
}

export interface WeeklyReview {
  headline: string;
  trends: string[];
  failures: string[];
  improvements: string[];
  suggestions: string[];
}

export interface DashboardSnapshot {
  date: string;
  lifeScore: LifeScoreRecord | null;
  todayPriority: string;
  biggestRisk: string;
  suggestedAction: string;
  latestInsight: InsightRecord | null;
  latestPrediction: PredictionRecord | null;
  weeklyReview: WeeklyReview;
}

const mapLatest = <T extends { date?: string; createdAt?: string }>(items: T[]) => sortByDateDesc(items)[0] || null;

const getHabitCompletionRate = (habits: Habit[], day: string) => {
  if (!habits.length) return 50;

  const completed = habits.filter((habit) => habit.completedToday || habit.history?.[day]).length;
  return clamp((completed / habits.length) * 100);
};

const getTaskCompletionRate = (tasks: PlannerTaskRecord[], days: string[]) => {
  const relevant = tasks.filter((task) => days.some((day) => isSameDay(task.date, day)));
  if (!relevant.length) return 50;
  return clamp((relevant.filter((task) => task.completed).length / relevant.length) * 100);
};

const getSleepScore = (sleepLogs: StoredSleepLog[]) => {
  if (!sleepLogs.length) return 50;

  const recent = sortByDateDesc(sleepLogs).slice(0, 7);
  const hoursScore = clamp(average(recent.map((log) => (log.hours / 7.5) * 100)));
  const qualityScore = clamp(average(recent.map((log) => log.quality || 70)));
  return clamp((hoursScore * 0.65) + (qualityScore * 0.35));
};

const getWorkoutScore = (workouts: StoredWorkout[]) => {
  if (!workouts.length) return 50;

  const recent = sortByDateDesc(workouts).filter((workout) => workout.status === 'completed').slice(0, 7);
  const volumeScore = clamp(recent.length * 16);
  const durationScore = clamp(average(recent.map((workout) => Math.min(workout.duration || 0, 90))) * (100 / 90));
  return clamp((volumeScore * 0.6) + (durationScore * 0.4));
};

const getRecoveryScore = (sleepLogs: StoredSleepLog[], bodyMetrics: StoredBodyMetrics[], skincareLogs: StoredSkincareLog[]) => {
  const sleepScore = getSleepScore(sleepLogs);
  const latestMetric = mapLatest(bodyMetrics);
  const latestSkin = mapLatest(skincareLogs);
  const stressPenalty = latestSkin?.stress ? clamp(latestSkin.stress) : 30;
  const bodyStability = latestMetric?.bodyFat ? clamp(100 - Math.abs((latestMetric.bodyFat || 0) - 15) * 3) : 60;

  return clamp((sleepScore * 0.55) + (bodyStability * 0.25) + ((100 - stressPenalty) * 0.2));
};

const getMentalScore = (moodLogs: MoodLogRecord[], skincareLogs: StoredSkincareLog[], sleepLogs: StoredSleepLog[]) => {
  const latestMood = mapLatest(moodLogs);
  const latestSkin = mapLatest(skincareLogs);
  const recentSleep = sortByDateDesc(sleepLogs).slice(0, 3);
  const sleepQuality = recentSleep.length ? average(recentSleep.map((log) => log.quality || 70)) : 65;
  const moodScore = latestMood ? moodToScore(latestMood.mood) : latestSkin?.mood ? moodToScore(latestSkin.mood) : 50;
  const energyScore = latestMood?.energy ? clamp(latestMood.energy) : 55;
  const stressScore = latestMood?.stress ? clamp(100 - latestMood.stress) : latestSkin?.stress ? clamp(100 - latestSkin.stress) : 55;

  return clamp((moodScore * 0.4) + (energyScore * 0.25) + (stressScore * 0.2) + (sleepQuality * 0.15));
};

const getDisciplineScore = (habits: Habit[], tasks: PlannerTaskRecord[], deepWorkTargets: StoredDeepWorkTarget[]) => {
  const today = todayKey();
  const weekDays = lastNDays(7);
  const habitScore = getHabitCompletionRate(habits, today);
  const taskScore = getTaskCompletionRate(tasks, weekDays);
  const deepWorkTarget = mapLatest(deepWorkTargets.filter((target) => isSameDay(target.date, today)));
  const deepWorkScore = deepWorkTarget && deepWorkTarget.targetHours > 0
    ? clamp((deepWorkTarget.actualHours / deepWorkTarget.targetHours) * 100)
    : 50;

  return clamp((habitScore * 0.45) + (taskScore * 0.3) + (deepWorkScore * 0.25));
};

const getKnowledgeScore = (knowledgeItems: KnowledgeItemRecord[], aiMemory: AiMemoryRecord[]) => {
  if (!knowledgeItems.length && !aiMemory.length) return 50;

  const recentKnowledge = knowledgeItems.filter((item) => parseTime(item.createdAt) > Date.now() - 1000 * 60 * 60 * 24 * 14).length;
  const memoryCount = aiMemory.filter((item) => parseTime(item.updatedAt) > Date.now() - 1000 * 60 * 60 * 24 * 14).length;
  return clamp(45 + (recentKnowledge * 6) + (memoryCount * 4));
};

export const calculateLifeScore = (snapshot: LifeOSSnapshot, previousScore?: LifeScoreRecord | null): LifeScoreRecord => {
  const physical = clamp((getSleepScore(snapshot.sleepLogs) * 0.6) + (getWorkoutScore(snapshot.workouts) * 0.4));
  const mental = getMentalScore(snapshot.moodLogs, snapshot.skincareLogs, snapshot.sleepLogs);
  const discipline = getDisciplineScore(snapshot.habits, snapshot.plannerTasks, snapshot.deepWorkTargets);
  const knowledge = getKnowledgeScore(snapshot.knowledgeItems, snapshot.aiMemory);
  const overall = clamp((physical * 0.35) + (mental * 0.25) + (discipline * 0.25) + (knowledge * 0.15));
  const today = todayKey();

  return {
    id: `${snapshot.profile?.uid || 'anonymous'}:${today}`,
    userId: snapshot.profile?.uid || 'anonymous',
    date: today,
    overall: Math.round(overall),
    physical: Math.round(physical),
    mental: Math.round(mental),
    discipline: Math.round(discipline),
    knowledge: Math.round(knowledge),
    source: 'engine',
    createdAt: previousScore?.createdAt || nowIso(),
    updatedAt: nowIso(),
  };
};

export const generateInsights = (snapshot: LifeOSSnapshot): InsightRecord[] => {
  const today = todayKey();
  const recentSleep = sortByDateDesc(snapshot.sleepLogs).slice(0, 7);
  const recentThreeSleep = recentSleep.slice(0, 3);
  const lowSleepStreak = recentThreeSleep.length === 3 && recentThreeSleep.every((log) => log.hours < 6);
  const latestMood = mapLatest(snapshot.moodLogs);
  const latestSkin = mapLatest(snapshot.skincareLogs);
  const recentWorkouts = sortByDateDesc(snapshot.workouts).filter((workout) => workout.status === 'completed').slice(0, 7);
  const recentTasks = snapshot.plannerTasks.slice(0, 10);
  const habitCompletion = getHabitCompletionRate(snapshot.habits, today);
  const sleepAverage = recentSleep.length ? average(recentSleep.map((log) => log.hours)) : 0;
  const stressAverage = latestMood?.stress || latestSkin?.stress || 0;
  const workoutLoad = recentWorkouts.length;

  const insights: InsightRecord[] = [];

  if (lowSleepStreak) {
    insights.push({
      id: `${snapshot.profile?.uid || 'anonymous'}:${today}:fatigue`,
      userId: snapshot.profile?.uid || 'anonymous',
      date: today,
      category: 'sleep',
      title: 'Fatigue accumulation detected',
      description: `Sleep has stayed below 6 hours for 3 consecutive days. Current 3-day average is ${sleepAverage.toFixed(1)}h, which will suppress recovery and decision quality.`,
      action: 'Reduce tomorrow\'s workload, extend sleep by 60 minutes tonight, and avoid high-intensity training until the average returns above 7h.',
      impact: 'Critical',
      confidence: 92,
      source: 'engine',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
  }

  if (recentSleep.length >= 3 && latestMood && sleepAverage < 7 && moodToScore(latestMood.mood) < 70) {
    insights.push({
      id: `${snapshot.profile?.uid || 'anonymous'}:${today}:sleep-mood`,
      userId: snapshot.profile?.uid || 'anonymous',
      date: today,
      category: 'mood',
      title: 'Sleep is driving mood volatility',
      description: `The current sleep average (${sleepAverage.toFixed(1)}h) is overlapping with a ${latestMood.mood} mood state, indicating recovery is likely the first control variable to fix.`,
      action: 'Protect the next two nights with a fixed bedtime and a screen cutoff 45 minutes before sleep.',
      impact: 'High',
      confidence: 84,
      source: 'engine',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
  }

  if (workoutLoad >= 3 && sleepAverage < 7) {
    insights.push({
      id: `${snapshot.profile?.uid || 'anonymous'}:${today}:gym-recovery`,
      userId: snapshot.profile?.uid || 'anonymous',
      date: today,
      category: 'workout',
      title: 'Training load is outpacing recovery',
      description: `You completed ${workoutLoad} workouts in the recent window while sleep is averaging ${sleepAverage.toFixed(1)}h. The system is likely carrying hidden fatigue.`,
      action: 'Keep the next session at moderate intensity and add a mobility or walk-only day if soreness or irritability is elevated.',
      impact: 'High',
      confidence: 79,
      source: 'engine',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
  }

  if (habitCompletion < 70 || recentTasks.filter((task) => !task.completed).length >= 3) {
    insights.push({
      id: `${snapshot.profile?.uid || 'anonymous'}:${today}:discipline`,
      userId: snapshot.profile?.uid || 'anonymous',
      date: today,
      category: 'discipline',
      title: 'Execution friction is building',
      description: `Habit completion sits at ${habitCompletion.toFixed(0)}% and there are multiple pending tasks. The pattern suggests a planning-to-execution gap, not a motivation gap.`,
      action: 'Cut the task list to one critical win, one maintenance win, and one recovery win for the rest of the day.',
      impact: habitCompletion < 50 ? 'Critical' : 'Medium',
      confidence: 76,
      source: 'engine',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
  }

  if (!insights.length) {
    insights.push({
      id: `${snapshot.profile?.uid || 'anonymous'}:${today}:baseline`,
      userId: snapshot.profile?.uid || 'anonymous',
      date: today,
      category: 'general',
      title: 'System baseline is stable',
      description: 'The current data stream does not show a dominant risk. Keep logging sleep, habits, and workouts to increase prediction accuracy.',
      action: 'Log one more sleep entry and one completion event today so the system can calibrate the next recommendation.',
      impact: 'Low',
      confidence: 68,
      source: 'engine',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
  }

  return insights.slice(0, 4);
};

export const generatePredictions = (snapshot: LifeOSSnapshot): PredictionRecord[] => {
  const today = todayKey();
  const recentSleep = sortByDateDesc(snapshot.sleepLogs).slice(0, 7);
  const recentWorkouts = sortByDateDesc(snapshot.workouts).filter((workout) => workout.status === 'completed').slice(0, 7);
  const recentTasks = snapshot.plannerTasks.filter((task) => lastNDays(7).some((day) => isSameDay(task.date, day)));
  const recentHabits = snapshot.habits;
  const sleepAverage = recentSleep.length ? average(recentSleep.map((log) => log.hours)) : 7.5;
  const sleepQualityAverage = recentSleep.length ? average(recentSleep.map((log) => log.quality || 70)) : 70;
  const habitCompletion = getHabitCompletionRate(snapshot.habits, today);
  const taskCompletion = recentTasks.length ? clamp((recentTasks.filter((task) => task.completed).length / recentTasks.length) * 100) : 50;
  const workoutLoad = recentWorkouts.length;
  const stressSignal = Math.max(
    mapLatest(snapshot.moodLogs)?.stress || 0,
    mapLatest(snapshot.skincareLogs)?.stress || 0,
  );

  const burnoutRisk = clamp((100 - sleepAverage * 12) * 0.35 + (workoutLoad * 8) + stressSignal * 0.25 + (100 - habitCompletion) * 0.15);
  const habitFailure = clamp((100 - habitCompletion) * 0.55 + (100 - taskCompletion) * 0.25 + (100 - sleepQualityAverage) * 0.2);
  const sleepDebt = clamp((7.5 * 7 - recentSleep.reduce((sum, log) => sum + log.hours, 0)) * 10);

  return [
    {
      id: `${snapshot.profile?.uid || 'anonymous'}:${today}:burnout`,
      userId: snapshot.profile?.uid || 'anonymous',
      date: today,
      type: 'burnout_risk',
      probability: Math.round(burnoutRisk),
      score: Math.round(burnoutRisk),
      windowDays: 7,
      rationale: `Sleep average ${sleepAverage.toFixed(1)}h, workout load ${workoutLoad}, and stress signal ${stressSignal}/100 are combining into recovery debt.`,
      action: 'Schedule a low-stimulation recovery block and avoid adding new workload until sleep normalizes.',
      source: 'engine',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    {
      id: `${snapshot.profile?.uid || 'anonymous'}:${today}:habit-failure`,
      userId: snapshot.profile?.uid || 'anonymous',
      date: today,
      type: 'habit_failure',
      probability: Math.round(habitFailure),
      score: Math.round(habitFailure),
      windowDays: 7,
      rationale: `Habit completion is ${habitCompletion.toFixed(0)}% and task completion is ${taskCompletion.toFixed(0)}%, which increases the chance of a missed day if the plan remains unchanged.`,
      action: 'Reduce the number of daily commitments and make the first habit a non-negotiable trigger action.',
      source: 'engine',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
    {
      id: `${snapshot.profile?.uid || 'anonymous'}:${today}:sleep-debt`,
      userId: snapshot.profile?.uid || 'anonymous',
      date: today,
      type: 'sleep_debt',
      probability: Math.round(clamp(sleepDebt)),
      score: Math.round(clamp(sleepDebt)),
      windowDays: 7,
      rationale: `The current 7-day sleep ledger is ${sleepDebt.toFixed(0)} points below target, which means you are borrowing recovery from future days.`,
      action: 'Move bedtime earlier tonight and preserve the same wake time for at least 3 nights.',
      source: 'engine',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  ];
};

export const buildDashboardSnapshot = (snapshot: LifeOSSnapshot, lifeScore: LifeScoreRecord | null, insights: InsightRecord[], predictions: PredictionRecord[]): DashboardSnapshot => {
  const latestInsight = mapLatest(insights);
  const latestPrediction = [...predictions].sort((left, right) => right.probability - left.probability)[0] || null;
  const pendingTasks = snapshot.plannerTasks
    .filter((task) => !task.completed)
    .sort((left, right) => (priorityRank[right.priority || 'medium'] || 2) - (priorityRank[left.priority || 'medium'] || 2));
  const todayPriority = pendingTasks[0]?.title || latestInsight?.title || 'Log one recovery signal';
  const biggestRisk = latestPrediction
    ? `${latestPrediction.type.replace('_', ' ')} at ${latestPrediction.probability}%`
    : latestInsight?.title || 'No major risk detected';
  const suggestedAction = latestInsight?.action || latestPrediction?.action || 'Keep logging the daily minimum dataset.';

  return {
    date: todayKey(),
    lifeScore,
    todayPriority,
    biggestRisk,
    suggestedAction,
    latestInsight,
    latestPrediction,
    weeklyReview: buildWeeklyReview(snapshot, lifeScore ? [lifeScore] : [], insights, predictions),
  };
};

export const buildWeeklyReview = (snapshot: LifeOSSnapshot, scores: LifeScoreRecord[], insights: InsightRecord[], predictions: PredictionRecord[]): WeeklyReview => {
  const weeklyDays = lastNDays(7);
  const previousWeeklyDays = lastNDays(7).map((day, index) => {
    const current = new Date();
    current.setDate(current.getDate() - index - 7);
    return current.toISOString().slice(0, 10);
  });

  const currentSleeps = snapshot.sleepLogs.filter((log) => weeklyDays.some((day) => isSameDay(log.date, day)));
  const previousSleeps = snapshot.sleepLogs.filter((log) => previousWeeklyDays.some((day) => isSameDay(log.date, day)));
  const currentTasks = snapshot.plannerTasks.filter((task) => weeklyDays.some((day) => isSameDay(task.date, day)));
  const previousTasks = snapshot.plannerTasks.filter((task) => previousWeeklyDays.some((day) => isSameDay(task.date, day)));
  const currentSleepAverage = currentSleeps.length ? average(currentSleeps.map((log) => log.hours)) : 0;
  const previousSleepAverage = previousSleeps.length ? average(previousSleeps.map((log) => log.hours)) : 0;
  const currentCompletion = currentTasks.length ? (currentTasks.filter((task) => task.completed).length / currentTasks.length) * 100 : 50;
  const previousCompletion = previousTasks.length ? (previousTasks.filter((task) => task.completed).length / previousTasks.length) * 100 : 50;

  return {
    headline: scores.length ? `Weekly score closed at ${scores[0].overall}/100.` : 'Weekly review ready once the first score is persisted.',
    trends: [
      `Sleep average: ${currentSleepAverage.toFixed(1)}h vs ${previousSleepAverage.toFixed(1)}h last week.`,
      `Task completion: ${currentCompletion.toFixed(0)}% vs ${previousCompletion.toFixed(0)}% last week.`,
      `Predictions refreshed: ${predictions.length} active risk signals.`,
    ],
    failures: insights
      .filter((insight) => insight.impact === 'Critical' || insight.impact === 'High')
      .slice(0, 3)
      .map((insight) => insight.title),
    improvements: [
      currentSleepAverage > previousSleepAverage ? 'Sleep trend improved.' : 'Sleep trend needs correction.',
      currentCompletion > previousCompletion ? 'Execution consistency improved.' : 'Execution consistency slipped.',
    ],
    suggestions: [
      'Keep one recovery anchor every day this week.',
      'Review the highest-probability prediction before adding new commitments.',
      'Preserve the daily logging minimum so the model keeps improving.',
    ],
  };
};
