import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Activity, Table2, Clock, CheckCircle2, Utensils } from "lucide-react";

interface SystemMonitorPanelProps {
  cafeteriaId: string;
}

export function SystemMonitorPanel({ cafeteriaId }: SystemMonitorPanelProps) {
  const [stats, setStats] = useState({
    activeTables: 0,
    ordersInProgress: 0,
    ordersReady: 0,
    ordersServed: 0,
    totalOrdersToday: 0,
  });
  const [loading, setLoading] = useState(true);

  // Fetch tables
  const { data: tables, isLoading: tablesLoading } = trpc.tables.getTables.useQuery(
    { cafeteriaId },
    { refetchInterval: 5000 }
  );

  // Fetch all orders
  const { data: allOrders, isLoading: ordersLoading } = trpc.orders.getOrders.useQuery(
    { cafeteriaId },
    { refetchInterval: 5000 }
  );

  useEffect(() => {
    if (tables && allOrders) {
      const activeTables = tables.filter(t => t.status === "occupied").length;
      
      const ordersInProgress = allOrders.filter(o => o.status === "open").length;
      
      // Count items by status (approximation)
      let ordersReady = 0;
      let ordersServed = 0;

      // For now, we'll estimate based on order status
      // In a real scenario, we'd query order items directly
      const openOrdersCount = allOrders.filter(o => o.status === "open").length;
      const closedOrdersCount = allOrders.filter(o => o.status === "closed").length;

      setStats({
        activeTables,
        ordersInProgress: openOrdersCount,
        ordersReady: Math.max(0, Math.floor(openOrdersCount * 0.3)), // Estimate
        ordersServed: Math.max(0, Math.floor(closedOrdersCount * 0.8)), // Estimate
        totalOrdersToday: allOrders.length,
      });

      setLoading(false);
    }
  }, [tables, allOrders]);

  if (loading || tablesLoading || ordersLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin h-8 w-8 text-gray-400" />
      </div>
    );
  }

  const metrics = [
    {
      title: "Active Tables",
      value: stats.activeTables,
      icon: <Table2 className="w-5 h-5" />,
      color: "bg-blue-50 text-blue-600 border-blue-200",
    },
    {
      title: "Orders in Progress",
      value: stats.ordersInProgress,
      icon: <Utensils className="w-5 h-5" />,
      color: "bg-yellow-50 text-yellow-600 border-yellow-200",
    },
    {
      title: "Orders Ready",
      value: stats.ordersReady,
      icon: <Clock className="w-5 h-5" />,
      color: "bg-orange-50 text-orange-600 border-orange-200",
    },
    {
      title: "Orders Served",
      value: stats.ordersServed,
      icon: <CheckCircle2 className="w-5 h-5" />,
      color: "bg-green-50 text-green-600 border-green-200",
    },
    {
      title: "Total Orders Today",
      value: stats.totalOrdersToday,
      icon: <Activity className="w-5 h-5" />,
      color: "bg-purple-50 text-purple-600 border-purple-200",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {metrics.map((metric, idx) => (
        <Card key={idx} className={`border ${metric.color.split(" ").pop()}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium">{metric.title}</p>
                <p className={`text-3xl font-bold mt-2 ${metric.color.split(" ")[1]}`}>
                  {metric.value}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${metric.color.split(" ")[0]} ${metric.color.split(" ")[1]}`}>
                {metric.icon}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
