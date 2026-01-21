interface StatCardProps {
  title: string;
  amount: number;
  currency: string;
  color: string;
  icon: string;
}

export default function StatCard({ title, amount, currency, color, icon }: StatCardProps) {
  return (
    <div
      className="bg-card border border-border rounded-lg p-6 shadow-sm"
      style={{
        borderLeftColor: color,
        borderLeftWidth: '4px',
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-2">{title}</p>
          <h3 className="text-2xl font-bold">
            {currency} {amount.toFixed(2)}
          </h3>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}
