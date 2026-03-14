import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardMetricCard } from "@/components/DashboardMetricCard";
import { trpc } from "@/lib/trpc";
import { formatTime, getItemStatusColor } from "@/lib/dashboardUtils";
import { Loader2, Clock, ChefHat, AlertCircle } from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";

export default function ChefDashboard() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevOrdersCount = useRef<number>(0);
  const { user, loading: authLoading } = useAuth();
  const staffId = (user as any)?.id || "";
  const cafeteriaId = (user as any)?.cafeteriaId || (user as any)?.id || "";

  const [selectedCategory, setSelectedCategory] = useState<string>("");

  // Fetch assigned categories
  const { data: assignedCategories, isLoading: categoriesLoading } = trpc.staff.getAssignedCategories.useQuery(
    { staffId },
    { enabled: !!staffId }
  );

  // Fetch all menu categories
  const { data: allCategories, isLoading: allCategoriesLoading } = trpc.menu.getCategories.useQuery(
    { cafeteriaId },
    { enabled: !!cafeteriaId }
  );

  // Fetch kitchen orders with polling
  const { data: kitchenOrders, isLoading: ordersLoading } = trpc.orders.getKitchenOrders.useQuery(
    { chefId: staffId, cafeteriaId },
    { 
      enabled: !!staffId && !!cafeteriaId,
      refetchInterval: 5000, // Poll every 5 seconds
    }
  );

  // TASK 3 — Kitchen Sound Alert
  useEffect(() => {
    if (kitchenOrders && kitchenOrders.length > prevOrdersCount.current) {
      // New order arrived
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.log("Audio play failed:", e));
      }
    }
    if (kitchenOrders) {
      prevOrdersCount.current = kitchenOrders.length;
    }
  }, [kitchenOrders]);

  // Mutations
  const updateItemStatusMutation = trpc.orders.updateItemStatus.useMutation();
  const startShiftMutation = trpc.shifts.startShift.useMutation();
  const endShiftMutation = trpc.shifts.endShift.useMutation();

  // Fetch active shift
  const { data: activeShift } = trpc.shifts.getStaffShifts.useQuery(
    { staffId, cafeteriaId, status: "active" },
    { enabled: !!staffId && !!cafeteriaId }
  );

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const isLoading = categoriesLoading || allCategoriesLoading || ordersLoading;
  const hasActiveShift = activeShift && activeShift.length > 0;
  const currentShift = hasActiveShift ? activeShift[0] : null;

  // Filter categories based on assigned categories
  const visibleCategories = allCategories?.filter((category) =>
    assignedCategories?.categoryIds?.some((c) => c.id === category.id)
  ) || [];

  if (!selectedCategory && visibleCategories.length > 0) {
    setSelectedCategory(visibleCategories[0].id);
  }

  // Group orders by status
  const ordersByStatus = useMemo(() => {
    const pending = kitchenOrders?.filter((o) => o.status === "sent_to_kitchen") || [];
    const preparing = kitchenOrders?.filter((o) => o.status === "in_preparation") || [];
    const ready = kitchenOrders?.filter((o) => o.status === "ready") || [];

    return { pending, preparing, ready };
  }, [kitchenOrders]);

  const handleUpdateStatus = async (itemId: string, newStatus: "in_preparation" | "ready" | "served") => {
    try {
      await updateItemStatusMutation.mutateAsync({
        orderItemId: itemId,
        newStatus,
      });
    } catch (error) {
      console.error("Failed to update item status:", error);
    }
  };

  const handleStartShift = async () => {
    try {
      await startShiftMutation.mutateAsync({ staffId, cafeteriaId });
    } catch (error) {
      console.error("Failed to start shift:", error);
    }
  };

  const handleEndShift = async () => {
    if (!currentShift) return;
    try {
      await endShiftMutation.mutateAsync({ shiftId: currentShift.id });
    } catch (error) {
      console.error("Failed to end shift:", error);
    }
  };

  // Calculate time since order placed
  const getTimeSinceOrder = (sentTime: Date | null | undefined): string => {
    if (!sentTime) return "N/A";
    const minutes = Math.floor((Date.now() - new Date(sentTime).getTime()) / 60000);
    return `${minutes}m ago`;
  };

  // Get priority color based on age
  const getPriorityColor = (sentTime: Date | null | undefined): string => {
    if (!sentTime) return "bg-gray-50";
    const minutes = Math.floor((Date.now() - new Date(sentTime).getTime()) / 60000);
    if (minutes > 15) return "bg-red-50 border-red-300";
    if (minutes > 5) return "bg-yellow-50 border-yellow-300";
    return "bg-green-50 border-green-300";
  };

  return (
    <div className="min-h-screen bg-gray-900 p-2 md:p-4 landscape:p-2">
      <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3" preload="auto" />
      <div className="max-w-full mx-auto">
        {/* Header - Compact for landscape */}
        <div className="mb-4 landscape:mb-2">
          <h1 className="text-2xl md:text-3xl font-bold text-white landscape:text-xl">Kitchen Display</h1>
          <p className="text-gray-400 text-sm landscape:text-xs">Manage incoming orders</p>
        </div>

        {/* Shift Control & Status */}
        <div className="flex gap-2 mb-4 landscape:mb-2 landscape:flex-row">
          <Card className="flex-1 landscape:flex-none landscape:w-auto bg-gray-800 border-gray-700">
            <CardContent className="p-3 landscape:p-2">
              {hasActiveShift ? (
                <div className="flex items-center justify-between">
                  <div className="text-green-400 font-semibold text-sm landscape:text-xs">Shift Active</div>
                  <Button
                    onClick={handleEndShift}
                    variant="destructive"
                    size="sm"
                    className="landscape:text-xs landscape:py-1 landscape:px-2"
                  >
                    End
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleStartShift}
                  variant="default"
                  size="sm"
                  className="w-full landscape:text-xs landscape:py-1"
                >
                  Start Shift
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Order Counts */}
          <div className="flex gap-2 landscape:gap-1">
            <div className="bg-red-900 text-red-100 rounded px-3 py-2 landscape:px-2 landscape:py-1 text-center">
              <div className="text-lg landscape:text-sm font-bold">{ordersByStatus.pending.length}</div>
              <div className="text-xs landscape:text-xs">Pending</div>
            </div>
            <div className="bg-yellow-900 text-yellow-100 rounded px-3 py-2 landscape:px-2 landscape:py-1 text-center">
              <div className="text-lg landscape:text-sm font-bold">{ordersByStatus.preparing.length}</div>
              <div className="text-xs landscape:text-xs">Prep</div>
            </div>
            <div className="bg-green-900 text-green-100 rounded px-3 py-2 landscape:px-2 landscape:py-1 text-center">
              <div className="text-lg landscape:text-sm font-bold">{ordersByStatus.ready.length}</div>
              <div className="text-xs landscape:text-xs">Ready</div>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        {visibleCategories.length > 0 && (
          <div className="mb-4 landscape:mb-2 flex gap-2 overflow-x-auto pb-2">
            {visibleCategories.map((category) => (
              <Button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                className="whitespace-nowrap landscape:text-xs landscape:py-1 landscape:px-2"
              >
                {category.name}
              </Button>
            ))}
          </div>
        )}

        {/* Kitchen Display - Landscape Optimized */}
        <div className="grid grid-cols-1 landscape:grid-cols-3 gap-3 landscape:gap-2">
          {/* Pending Orders */}
          <div className="landscape:col-span-1">
            <div className="bg-red-900 text-white p-3 landscape:p-2 rounded-t font-bold text-lg landscape:text-sm">
              PENDING ({ordersByStatus.pending.length})
            </div>
            <div className="space-y-2 landscape:space-y-1 max-h-[60vh] landscape:max-h-[80vh] overflow-y-auto bg-gray-800 p-2 rounded-b">
              {ordersByStatus.pending.length === 0 ? (
                <div className="text-gray-400 text-center py-8 landscape:py-4 text-sm">No pending orders</div>
              ) : (
                ordersByStatus.pending.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 landscape:p-2 rounded border-2 border-red-500 animate-pulse-once ${getPriorityColor(
                        item.sentToKitchenAt
                      )}`}
                    >
                    <div className="flex justify-between items-start mb-2 landscape:mb-1">
                      <div className="font-bold text-lg landscape:text-sm">Table {item.orderId?.slice(0, 4)}</div>
                      <div className="text-xs landscape:text-xs text-gray-600">
                        {getTimeSinceOrder(item.sentToKitchenAt)}
                      </div>
                    </div>
                    <div className="text-sm landscape:text-xs mb-2 landscape:mb-1">
                      <div className="font-semibold">Item #{item.menuItemId?.slice(0, 4)}</div>
                      <div className="text-gray-700">Qty: {item.quantity}</div>
                      {item.notes && <div className="text-gray-700 italic mt-1">{item.notes}</div>}
                    </div>
                    <div className="flex gap-2 landscape:gap-1">
                      <Button
                        onClick={() => handleUpdateStatus(item.id, "in_preparation")}
                        variant="default"
                        size="sm"
                        className="flex-1 landscape:text-xs landscape:py-1 landscape:px-2"
                      >
                        Start
                      </Button>
                      <Button
                        onClick={() => handleUpdateStatus(item.id, "ready")}
                        variant="outline"
                        size="sm"
                        className="flex-1 landscape:text-xs landscape:py-1 landscape:px-2"
                      >
                        Ready
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Preparing Orders */}
          <div className="landscape:col-span-1">
            <div className="bg-yellow-900 text-white p-3 landscape:p-2 rounded-t font-bold text-lg landscape:text-sm">
              PREPARING ({ordersByStatus.preparing.length})
            </div>
            <div className="space-y-2 landscape:space-y-1 max-h-[60vh] landscape:max-h-[80vh] overflow-y-auto bg-gray-800 p-2 rounded-b">
              {ordersByStatus.preparing.length === 0 ? (
                <div className="text-gray-400 text-center py-8 landscape:py-4 text-sm">No items being prepared</div>
              ) : (
                ordersByStatus.preparing.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 landscape:p-2 rounded border-2 border-yellow-500 ${getPriorityColor(
                      item.sentToKitchenAt
                    )}`}
                  >
                    <div className="flex justify-between items-start mb-2 landscape:mb-1">
                      <div className="font-bold text-lg landscape:text-sm">Table {item.orderId?.slice(0, 4)}</div>
                      <div className="text-xs landscape:text-xs text-gray-600">
                        {getTimeSinceOrder(item.sentToKitchenAt)}
                      </div>
                    </div>
                    <div className="text-sm landscape:text-xs mb-2 landscape:mb-1">
                      <div className="font-semibold">Item #{item.menuItemId?.slice(0, 4)}</div>
                      <div className="text-gray-700">Qty: {item.quantity}</div>
                      {item.notes && <div className="text-gray-700 italic mt-1">{item.notes}</div>}
                    </div>
                    <Button
                      onClick={() => handleUpdateStatus(item.id, "ready")}
                      variant="default"
                      size="sm"
                      className="w-full landscape:text-xs landscape:py-1"
                    >
                      Mark Ready
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Ready Orders */}
          <div className="landscape:col-span-1">
            <div className="bg-green-900 text-white p-3 landscape:p-2 rounded-t font-bold text-lg landscape:text-sm">
              READY ({ordersByStatus.ready.length})
            </div>
            <div className="space-y-2 landscape:space-y-1 max-h-[60vh] landscape:max-h-[80vh] overflow-y-auto bg-gray-800 p-2 rounded-b">
              {ordersByStatus.ready.length === 0 ? (
                <div className="text-gray-400 text-center py-8 landscape:py-4 text-sm">No ready items</div>
              ) : (
                ordersByStatus.ready.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 landscape:p-2 rounded border-2 border-green-500 bg-green-50"
                  >
                    <div className="flex justify-between items-start mb-2 landscape:mb-1">
                      <div className="font-bold text-lg landscape:text-sm text-green-900">
                        Table {item.orderId?.slice(0, 4)}
                      </div>
                      <div className="text-xs landscape:text-xs text-green-700">
                        {getTimeSinceOrder(item.sentToKitchenAt)}
                      </div>
                    </div>
                    <div className="text-sm landscape:text-xs mb-2 landscape:mb-1 text-green-900">
                      <div className="font-semibold">Item #{item.menuItemId?.slice(0, 4)}</div>
                      <div>Qty: {item.quantity}</div>
                      {item.notes && <div className="italic mt-1">{item.notes}</div>}
                    </div>
                    <div className="text-xs landscape:text-xs text-green-700 font-semibold">
                      ✓ Ready for pickup
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
