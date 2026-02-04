'use client';

interface StatCardProps {
  title: string;
  value: string;
  icon: string;
  color?: string;
}

export default function StatCard({ title, value, icon, color = 'bg-primary/10' }: StatCardProps) {
  return (
    <div className={`rounded-lg p-6 ${color} border border-border`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-2">{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}
