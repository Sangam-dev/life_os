import React from 'react';
import { Workout, SkincareLog, SleepLog, Habit, BodyMetrics, DeepWorkTarget } from '../types';
import { BarChart, Bar, XAxis, YAxis } from 'recharts';

export const DailyReportTemplate = React.forwardRef<HTMLDivElement, {
  data: {
    workouts: Workout[];
    skincare: SkincareLog[];
    sleep: SleepLog[];
    habits: Habit[];
    bodyMetrics: BodyMetrics[];
    deepWork: DeepWorkTarget[];
  },
  insights: any[]
}>(({ data, insights }, ref) => {
  const today = new Date().toISOString().split('T')[0];
  const todayDeepWork = data.deepWork.find(d => d.date === today);
  const completedHabits = data.habits.filter(h => h.completedToday);

  // Prepare chart data (last 7 days of deep work)
  const chartData = data.deepWork.slice(0, 7).reverse().map(d => ({
    date: d.date.split('-').slice(1).join('/'),
    hours: d.actualHours
  }));

  return (
    <div ref={ref} style={{ fontFamily: 'Inter, sans-serif', backgroundColor: '#18181b', color: '#ffffff', width: '800px', padding: '40px' }} className="space-y-8">
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '24px' }}>
        <h1 style={{ fontSize: '36px', fontWeight: 'bold', letterSpacing: '-0.05em', margin: 0 }}>LifeOS Daily Report</h1>
        <p style={{ color: '#a1a1aa', marginTop: '8px', fontSize: '14px' }}>Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
      </header>

      <div className="grid grid-cols-2 gap-6">
        <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '24px' }}>
          <h3 style={{ color: '#71717a', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>Deep Work</h3>
          <div style={{ color: '#22d3ee', fontSize: '30px', fontWeight: 'bold' }}>
            {todayDeepWork ? `${todayDeepWork.actualHours}h / ${todayDeepWork.targetHours}h` : '0h / 6h'}
          </div>
        </div>
        <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '24px' }}>
          <h3 style={{ color: '#71717a', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>Habits Completed</h3>
          <div style={{ color: '#4ade80', fontSize: '30px', fontWeight: 'bold' }}>
            {completedHabits.length} / {data.habits.length}
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '24px' }}>
        <h3 style={{ color: '#71717a', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>Deep Work Trend (Last 7 Days)</h3>
        <div style={{ height: '192px' }}>
          <BarChart width={700} height={180} data={chartData}>
            <XAxis dataKey="date" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
            <Bar dataKey="hours" fill="#22d3ee" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </div>
      </div>

      <div className="space-y-4">
        <h3 style={{ color: '#71717a', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}>AI Performance Insights</h3>
        {insights.length > 0 ? insights.map((insight, i) => (
          <div key={i} style={{ backgroundColor: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '12px', padding: '16px' }}>
            <h4 style={{ color: '#c084fc', fontWeight: 'bold', margin: 0 }}>{insight.title}</h4>
            <p style={{ color: '#d4d4d8', fontSize: '14px', marginTop: '4px', marginBottom: '8px' }}>{insight.description}</p>
            <div style={{ color: '#ffffff', backgroundColor: 'rgba(255,255,255,0.1)', fontSize: '12px', fontWeight: 'bold', display: 'inline-block', padding: '4px 8px', borderRadius: '4px' }}>
              Action: {insight.action}
            </div>
          </div>
        )) : (
          <p style={{ color: '#71717a', fontSize: '14px' }}>No insights generated yet.</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 style={{ color: '#71717a', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Recent Workouts</h3>
          {data.workouts.slice(0, 3).map((w, i) => (
            <div key={i} style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px', fontSize: '14px' }}>
              <span style={{ fontWeight: 'bold' }}>{w.name}</span> - {w.duration} mins ({w.date.split('T')[0]})
            </div>
          ))}
          {data.workouts.length === 0 && <p style={{ color: '#71717a', fontSize: '14px' }}>No workouts logged.</p>}
        </div>
        <div className="space-y-4">
          <h3 style={{ color: '#71717a', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Recent Sleep</h3>
          {data.sleep.slice(0, 3).map((s, i) => (
            <div key={i} style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px', fontSize: '14px' }}>
              <span style={{ fontWeight: 'bold' }}>{s.hours} hours</span> - Quality: {s.quality}/100 ({s.date.split('T')[0]})
            </div>
          ))}
          {data.sleep.length === 0 && <p style={{ color: '#71717a', fontSize: '14px' }}>No sleep logged.</p>}
        </div>
      </div>

      <div className="space-y-4">
        <h3 style={{ color: '#71717a', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Skin Analysis History</h3>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {data.skincare.slice(0, 4).map((log, i) => (
            <div key={i} style={{ width: '150px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', overflow: 'hidden' }}>
              {log.imageUrl && (
                <img src={log.imageUrl} style={{ width: '100%', height: '200px', objectFit: 'cover' }} alt="Skin log" referrerPolicy="no-referrer" />
              )}
              <div style={{ padding: '8px', fontSize: '12px' }}>
                <div style={{ color: '#a1a1aa' }}>{log.date.split('T')[0]}</div>
                {log.metrics && (
                  <div style={{ marginTop: '4px' }}>
                    H: {Math.floor(log.metrics.hydration / 10)} | C: {Math.floor(log.metrics.clarity / 10)} | T: {Math.floor(log.metrics.texture / 10)}
                  </div>
                )}
              </div>
            </div>
          ))}
          {data.skincare.length === 0 && <p style={{ color: '#71717a', fontSize: '14px' }}>No skincare logs.</p>}
        </div>
      </div>

      <div className="space-y-4">
        <h3 style={{ color: '#71717a', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Body Progress History</h3>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {data.bodyMetrics.slice(0, 4).map((metric, i) => (
            <div key={i} style={{ width: '150px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', overflow: 'hidden' }}>
              {metric.imageUrl && (
                <img src={metric.imageUrl} style={{ width: '100%', height: '200px', objectFit: 'cover' }} alt="Body progress" referrerPolicy="no-referrer" />
              )}
              <div style={{ padding: '8px', fontSize: '12px' }}>
                <div style={{ color: '#a1a1aa' }}>{metric.date.split('T')[0]}</div>
                <div style={{ marginTop: '4px', fontWeight: 'bold' }}>
                  {metric.weight} kg
                </div>
                {metric.bodyFat && (
                  <div style={{ color: '#22d3ee', marginTop: '2px' }}>
                    {metric.bodyFat}% BF
                  </div>
                )}
              </div>
            </div>
          ))}
          {data.bodyMetrics.length === 0 && <p style={{ color: '#71717a', fontSize: '14px' }}>No body metrics logged.</p>}
        </div>
      </div>
    </div>
  );
});
