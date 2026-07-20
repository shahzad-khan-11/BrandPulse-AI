import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer
} from 'recharts';
import { useAuth } from '../hooks/useAuth';

interface TimelineData {
  date: string;
  positive: number;
  neutral: number;
  negative: number;
  total: number;
}

interface AnalyticsChartsProps {
  data: TimelineData[];
}

export const SentimentAreaChart: React.FC<AnalyticsChartsProps> = ({ data }) => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? 'rgba(51, 65, 85, 0.3)' : 'rgba(226, 232, 240, 0.5)';

  return (
    <div className="h-80 w-full pt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPositive" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorNegative" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorNeutral" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
          <XAxis 
            dataKey="date" 
            stroke={textColor} 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
            dy={10}
          />
          <YAxis 
            stroke={textColor} 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
            dx={-10}
          />
          <ChartTooltip
            contentStyle={{
              backgroundColor: isDark ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255, 255, 255, 0.8)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderRadius: '16px',
              fontSize: '11px',
              boxShadow: '0 10px 30px -10px rgba(0,0,0,0.3)',
              color: isDark ? '#f8fafc' : '#0f172a',
            }}
          />
          <Area
            type="monotone"
            dataKey="positive"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
            fillOpacity={1}
            fill="url(#colorPositive)"
            name="Positive"
          />
          <Area
            type="monotone"
            dataKey="neutral"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
            fillOpacity={1}
            fill="url(#colorNeutral)"
            name="Neutral"
          />
          <Area
            type="monotone"
            dataKey="negative"
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
            fillOpacity={1}
            fill="url(#colorNegative)"
            name="Negative"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
