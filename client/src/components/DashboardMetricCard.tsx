import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReactNode } from "react";

interface DashboardMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    direction: "up" | "down";
  };
  className?: string;
}

export function DashboardMetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  className = "",
}: DashboardMetricCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="text-gray-500">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        {trend && (
          <div className={`text-xs mt-1 ${trend.direction === "up" ? "text-green-600" : "text-red-600"}`}>
            {trend.direction === "up" ? "↑" : "↓"} {trend.value}%
          </div>
        )}
      </CardContent>
    </Card>
  );
}
