'use client';

import React from "react"

import { useMemo } from 'react';
import { Category } from '@/lib/context';

interface ExpenseChartProps {
  data: Array<{ category: string; amount: number }>;
  categories: Category[];
}

export default function ExpenseChart({ data, categories }: ExpenseChartProps) {
  const chartData = useMemo(() => {
    return data.map((item) => {
      const category = categories.find((c) => c.name === item.category);
      return {
        ...item,
        color: category?.color || '#999999',
      };
    });
  }, [data, categories]);

  const total = useMemo(() => data.reduce((sum, item) => sum + item.amount, 0), [data]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>No expense data this month</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Pie Chart */}
      <div className="flex-1 flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-48 h-48">
          {chartData.reduce(
            (acc, item, index) => {
              const percentage = (item.amount / total) * 100;
              const startAngle = acc.currentAngle;
              const endAngle = acc.currentAngle + (percentage * 3.6);

              const startRadians = (startAngle * Math.PI) / 180;
              const endRadians = (endAngle * Math.PI) / 180;

              const x1 = 50 + 40 * Math.cos(startRadians);
              const y1 = 50 + 40 * Math.sin(startRadians);
              const x2 = 50 + 40 * Math.cos(endRadians);
              const y2 = 50 + 40 * Math.sin(endRadians);

              const largeArc = percentage > 50 ? 1 : 0;

              const pathData = [
                `M 50 50`,
                `L ${x1} ${y1}`,
                `A 40 40 0 ${largeArc} 1 ${x2} ${y2}`,
                `Z`,
              ].join(' ');

              acc.paths.push(
                <path key={index} d={pathData} fill={item.color} stroke="white" strokeWidth="1" />
              );

              return {
                ...acc,
                currentAngle: endAngle,
              };
            },
            { currentAngle: 0, paths: [] as React.ReactNode[] }
          ).paths}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex-1 space-y-3">
        {chartData.map((item, index) => {
          const percentage = ((item.amount / total) * 100).toFixed(1);
          const category = categories.find((c) => c.name === item.category);

          return (
            <div key={index} className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <div className="flex-1">
                <div className="font-medium text-sm">{item.category}</div>
                <div className="text-xs text-muted-foreground">
                  {percentage}% ({item.amount.toFixed(2)})
                </div>
              </div>
              <span className="text-lg">{category?.icon}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
