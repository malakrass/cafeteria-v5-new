import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

interface OrderItemWithTiming {
  id: string;
  menuItemId: string;
  quantity: number;
  status: string;
  sentToKitchenAt: Date;
  readyAt?: Date;
  elapsedTime: string;
  preparationTime?: string;
}

export default function ChefDashboard() {
  const { user, loading: authLoading } = useAuth();
  const staffId = (user as any)?.id || "";
  const cafeteriaId = (user as any)?.cafeteriaId || "";

  const [elapsedTimes, setElapsedTimes] = useState<Record<string, string>>({});
  const [preparationTimes, setPreparationTimes] = useState<Record<string, string>>({});

  // Fetch kitchen orders
  const { data: kitchenOrders, isLoading: ordersLoading, refetch } = trpc.orders.getKitchenOrders.useQuery(
    { cafeteriaId, staffId },
    { enabled: !!cafeteriaId && !!staffId, refetchInterval: 3000 }
  );

  // Update elapsed times every second
  useEffect(() => {
    const interval = setInterval(() => {
      const newElapsedTimes: Record<string, string> = {};
      const newPreparationTimes: Record<string, string> = {};

      if (kitchenOrders) {
        kitchenOrders.forEach((order: any) => {
          order.items.forEach((item: any) => {
            if (item.sentToKitchenAt) {
              const now = new Date();
              const sentTime = new Date(item.sentToKitchenAt);
              const diffMs = now.getTime() - sentTime.getTime();
              const diffMins = Math.floor(diffMs / 60000);
              const diffSecs = Math.floor((diffMs % 60000) / 1000);
              newElapsedTimes[item.id] = diffMins > 0 ? `${diffMins}m ${diffSecs}s` : `${diffSecs}s`;

              // Calculate preparation time if ready
              if (item.readyAt) {
                const prepMs = new Date(item.readyAt).getTime() - sentTime.getTime();
                const prepMins = Math.floor(prepMs / 60000);
                const prepSecs = Math.floor((prepMs % 60000) / 1000);
                newPreparationTimes[item.id] = prepMins > 0 ? `${prepMins}m ${prepSecs}s` : `${prepSecs}s`;
              }
            }
          });
        });
      }

      setElapsedTimes(newElapsedTimes);
      setPreparationTimes(newPreparationTimes);
    }, 1000);

    return () => clearInterval(interval);
  }, [kitchenOrders]);

  const markAsReady = async (itemId: string) => {
    try {
      // Call mutation to mark item as ready
      await trpc.orders.markItemReady.mutate({ itemId });
      refetch();
    } catch (error) {
      console.error("Failed to mark item as ready:", error);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Chef Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage kitchen orders and track preparation time</p>
        </div>

        {ordersLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin" />
          </div>
        ) : !kitchenOrders || kitchenOrders.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-gray-600">No orders in kitchen</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {kitchenOrders.map((order: any) => (
              <Card key={order.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">Order #{order.id.slice(0, 8)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {order.items.map((item: any) => (
                      <div key={item.id} className="p-4 border rounded-lg bg-gray-50">
                        {/* Item Header */}
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-semibold">Item {item.menuItemId}</p>
                            <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                          </div>
                          <Badge variant={item.status === "ready" ? "default" : "secondary"}>
                            {item.status.replace(/_/g, " ")}
                          </Badge>
                        </div>

                        {/* Timing Information */}
                        <div className="grid grid-cols-2 gap-3 mb-3 p-3 bg-white rounded border border-gray-200">
                          <div>
                            <p className="text-xs text-gray-600">Elapsed Time</p>
                            <p className="text-lg font-bold text-blue-600">{elapsedTimes[item.id] || "0s"}</p>
                          </div>
                          {item.readyAt && (
                            <div>
                              <p className="text-xs text-gray-600">Prep Time</p>
                              <p className="text-lg font-bold text-green-600">{preparationTimes[item.id] || "0s"}</p>
                            </div>
                          )}
                        </div>

                        {/* Notes */}
                        {item.notes && (
                          <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                            <p className="text-gray-700"><strong>Notes:</strong> {item.notes}</p>
                          </div>
                        )}

                        {/* Action Button */}
                        {item.status !== "ready" && (
                          <Button
                            onClick={() => markAsReady(item.id)}
                            className="w-full"
                            variant="default"
                          >
                            Mark as Ready
                          </Button>
                        )}
                        {item.status === "ready" && (
                          <div className="w-full p-2 bg-green-100 border border-green-300 rounded text-center text-green-700 font-semibold">
                            ✓ Ready for Pickup
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
