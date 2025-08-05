import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    isPositive: boolean;
  };
  icon: LucideIcon;
  iconColor?: string;
}

export function KPICard({ title, value, change, icon: Icon, iconColor = "text-primary" }: KPICardProps) {
  return (
    <div className="kpi-card">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {change && (
            <div className={`flex items-center text-sm ${
              change.isPositive ? 'text-primary' : 'text-destructive'
            }`}>
              <span>{change.isPositive ? '+' : ''}{change.value}%</span>
              <span className="ml-1 text-muted-foreground">vs last period</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-lg bg-secondary flex items-center justify-center ${iconColor}`} style={{ backgroundColor: 'hsl(var(--secondary))' }}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}