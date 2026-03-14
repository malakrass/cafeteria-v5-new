import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardMetricCard } from "@/components/DashboardMetricCard";
import { trpc } from "@/lib/trpc";
import {
  formatCurrency,
  formatPoints,
  formatDuration,
  getOccupancyColor,
  parseDecimal,
} from "@/lib/dashboardUtils";
import { Loader2, Clock, TrendingUp, Users, Plus, X, ShoppingCart } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function WaiterDashboard() {
  const { user, loading: authLoading } = useAuth();
  const staffId = (user as any)?.id || "";
  const cafeteriaId = (user as any)?.cafeteriaId || (user as any)?.id || "";

  const [selectedSection, setSelectedSection] = useState<string>("");
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [orderItems, setOrderItems] = useState<Array<{ itemId: string; quantity: number; price: number; name: string }>>([]);
  const [quickOrderSearch, setQuickOrderSearch] = useState("");
  const [elapsedTimes, setElapsedTimes] = useState<Record<string, string>>({});

  // Fetch assigned sections
  const { data: assignedSections, isLoading: sectionsLoading } = trpc.staff.getAssignedSections.useQuery(
    { staffId },
    { enabled: !!staffId }
  );

  // Fetch sections for cafeteria
  const { data: allSections, isLoading: allSectionsLoading } = trpc.tables.getSections.useQuery(
    { cafeteriaId },
    { enabled: !!cafeteriaId }
  );

  // Fetch tables for selected section
  const { data: tables, isLoading: tablesLoading } = trpc.tables.getTables.useQuery(
    { cafeteriaId, sectionId: selectedSection },
    { enabled: !!selectedSection && !!cafeteriaId }
  );

  // Fetch active shift
  const { data: activeShift, isLoading: shiftLoading } = trpc.shifts.getStaffShifts.useQuery(
    { staffId, cafeteriaId, status: "active" },
    { enabled: !!staffId && !!cafeteriaId }
  );

  // Fetch open orders with polling
  const { data: openOrders, isLoading: ordersLoading } = trpc.orders.getOrders.useQuery(
    { cafeteriaId, status: "open" },
    { 
      enabled: !!cafeteriaId,
      refetchInterval: 3000, // Poll every 3 seconds
    }
  );

  // Update elapsed times every second
  useEffect(() => {
    const interval = setInterval(() => {
      const newTimes: Record<string, string> = {};
      if (openOrders) {
        openOrders.forEach((order: any) => {
          const now = new Date();
          const created = new Date(order.createdAt);
          const diffMs = now.getTime() - created.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          const diffSecs = Math.floor((diffMs % 60000) / 1000);
          newTimes[order.id] = diffMins > 0 ? `${diffMins}m ${diffSecs}s` : `${diffSecs}s`;
        });
      }
      setElapsedTimes(newTimes);
    }, 1000);

    return () => clearInterval(interval);
  }, [openOrders]);

  // Fetch cafeteria details for points balance
  const { data: cafeteriaData } = trpc.cafeterias.getCafeteriaDetails.useQuery(
    { cafeteriaId },
    { enabled: !!cafeteriaId }
  );

  // Fetch menu categories
  const { data: categories, isLoading: categoriesLoading } = trpc.menu.getCategories.useQuery(
    { cafeteriaId },
    { enabled: !!cafeteriaId }
  );

  // Fetch all menu items for quick order
  const { data: allMenuItems } = trpc.menu.getMenuItems.useQuery(
    { cafeteriaId },
    { enabled: !!cafeteriaId }
  );

  const filteredMenuItems = useMemo(() => {
    if (!allMenuItems) return [];
    if (!quickOrderSearch) return allMenuItems.slice(0, 10);
    return allMenuItems.filter(item => 
      item.name.toLowerCase().includes(quickOrderSearch.toLowerCase())
    ).slice(0, 10);
  }, [allMenuItems, quickOrderSearch]);

  // Mutations
  const startShiftMutation = trpc.shifts.startShift.useMutation();
  const endShiftMutation = trpc.shifts.endShift.useMutation();
  const createOrderMutation = trpc.orders.createOrder.useMutation();
  const addItemMutation = trpc.orders.addItem.useMutation();
  const closeOrderMutation = trpc.orders.closeOrder.useMutation();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const isLoading = sectionsLoading || allSectionsLoading || tablesLoading || shiftLoading || ordersLoading;
  const pointsBalance = cafeteriaData ? parseDecimal(cafeteriaData.pointsBalance as string | number) : 0;
  const hasActiveShift = activeShift && activeShift.length > 0;
  const currentShift = hasActiveShift ? activeShift[0] : null;

  // Filter sections based on assigned sections
  const visibleSections = allSections?.filter((section) =>
    assignedSections?.sectionIds?.map((s: any) => s.id).includes(section.id)
  ) || [];

  if (!selectedSection && visibleSections.length > 0) {
    setSelectedSection(visibleSections[0].id);
  }

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

  const handleCreateOrder = async () => {
    if (!selectedTable) return;
    try {
      const order = await createOrderMutation.mutateAsync({
        cafeteriaId,
        tableId: selectedTable,
        waiterId: staffId,
      });
      // Add items to order
      for (const item of orderItems) {
        await addItemMutation.mutateAsync({
          orderId: order.id,
          menuItemId: item.itemId,
          quantity: item.quantity,
          unitPrice: item.price,
        });
      }
      
      // TASK 2 — Waiter Quick Order: Automatically send to kitchen


      setIsOrderFormOpen(false);
      setOrderItems([]);
      setSelectedTable(null);
      setQuickOrderSearch("");
    } catch (error) {
      console.error("Failed to create order:", error);
    }
  };

  const addQuickItem = (item: any) => {
    setOrderItems(prev => {
      const existing = prev.find(i => i.itemId === item.id);
      if (existing) {
        return prev.map(i => i.itemId === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { itemId: item.id, quantity: 1, price: parseFloat(item.price), name: item.name }];
    });
  };

  const handleCloseOrder = async (orderId: string) => {
    try {
      await closeOrderMutation.mutateAsync({
        orderId,
        exchangeRate: 1,
        shiftId: currentShift?.id,
      });
    } catch (error) {
      console.error("Failed to close order:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Waiter Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your tables and orders</p>
        </div>

        {/* Shift Controls & Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Shift Status</CardTitle>
            </CardHeader>
            <CardContent>
              {hasActiveShift ? (
                <div className="space-y-3">
                  <div className="text-green-600 font-semibold">Active</div>
                  <Button
                    onClick={handleEndShift}
                    variant="destructive"
                    size="sm"
                    className="w-full"
                  >
                    End Shift
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleStartShift}
                  variant="default"
                  size="sm"
                  className="w-full"
                >
                  Start Shift
                </Button>
              )}
            </CardContent>
          </Card>

          <DashboardMetricCard
            title="Points Balance"
            value={formatPoints(pointsBalance)}
            subtitle="Available for operations"
            icon={<TrendingUp className="w-4 h-4" />}
          />

          <DashboardMetricCard
            title="Open Orders"
            value={openOrders?.length || 0}
            subtitle="Active orders"
            icon={<Users className="w-4 h-4" />}
          />
        </div>

        {/* Section Tabs */}
        {visibleSections.length > 0 && (
          <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
            {visibleSections.map((section) => (
              <Button
                key={section.id}
                onClick={() => setSelectedSection(section.id)}
                variant={selectedSection === section.id ? "default" : "outline"}
                className="whitespace-nowrap"
              >
                {section.name}
              </Button>
            ))}
          </div>
        )}

        {/* Tables Grid */}
        {selectedSection && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Tables</CardTitle>
            </CardHeader>
            <CardContent>
              {tablesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin" />
                </div>
              ) : tables && tables.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {tables.map((table) => (
                    <div
                      key={table.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        table.status === "available"
                          ? "border-green-500 bg-green-50 hover:bg-green-100"
                          : table.status === "occupied"
                          ? "border-blue-500 bg-blue-50"
                          : table.status === "reserved"
                          ? "border-yellow-500 bg-yellow-50"
                          : "border-red-500 bg-red-50"
                      }`}
                      onClick={() => {
                        if (table.status === "available" && hasActiveShift) {
                          setSelectedTable(table.id);
                          setIsOrderFormOpen(true);
                        }
                      }}
                    >
                      <div className="font-bold text-lg">Table {table.tableNumber}</div>
                      <div className="text-sm text-gray-600">Capacity: {table.capacity}</div>
                      <div className={`text-xs font-semibold mt-2 ${
                        table.status === "available" ? "text-green-700" :
                        table.status === "occupied" ? "text-blue-700" :
                        table.status === "reserved" ? "text-yellow-700" :
                        "text-red-700"
                      }`}>
                        {table.status?.toUpperCase() || "N/A"}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No tables in this section</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Active Orders */}
        {openOrders && openOrders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Active Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                 {openOrders?.map((order: any) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
                  >
                    <div className="flex-1">
                      <div className="font-semibold">Order #{order.id.slice(0, 8)}</div>
                      <div className="text-sm text-gray-600">
                        Table: {order.tableId ? `#${order.tableId.slice(0, 4)}` : "N/A"} | {formatCurrency(order.totalAmount)}
                      </div>
                      <div className="text-xs text-blue-600 font-semibold mt-1">
                        ⏱️ {elapsedTimes[order.id] || "0s"}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleCloseOrder(order.id)}
                      variant="default"
                      size="sm"
                      disabled={!hasActiveShift}
                    >
                      Close
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Form Dialog */}
        <Dialog open={isOrderFormOpen} onOpenChange={setIsOrderFormOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Order</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Table</Label>
                <Input
                  value={selectedTable ? `Table ${selectedTable.slice(0, 4)}` : ""}
                  disabled
                />
              </div>

              {/* TASK 2 — Waiter Quick Order UI */}
              <div className="space-y-2">
                <Label>Quick Add Item</Label>
                <Input 
                  placeholder="Search menu..." 
                  value={quickOrderSearch}
                  onChange={(e) => setQuickOrderSearch(e.target.value)}
                />
                <div className="flex flex-wrap gap-1 max-h-[120px] overflow-y-auto p-1 border rounded bg-gray-50">
                  {filteredMenuItems.map(item => (
                    <Button 
                      key={item.id} 
                      size="sm" 
                      variant="outline" 
                      className="text-xs h-7"
                      onClick={() => addQuickItem(item)}
                    >
                      + {item.name}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="border rounded p-3 min-h-[100px] max-h-[150px] overflow-y-auto bg-white">
                <Label className="text-xs text-gray-500 mb-2 block">Order Summary</Label>
                {orderItems.length === 0 ? (
                  <p className="text-gray-500 text-sm italic">No items added yet</p>
                ) : (
                  orderItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm mb-2 border-b pb-1">
                      <span>{item.quantity}x {item.name}</span>
                      <div className="flex items-center gap-2">
                        <span>{formatCurrency(item.price * item.quantity)}</span>
                        <X 
                          className="w-3 h-3 text-red-500 cursor-pointer" 
                          onClick={() => setOrderItems(prev => prev.filter((_, i) => i !== idx))}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setIsOrderFormOpen(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateOrder}
                  variant="default"
                  className="flex-1"
                  disabled={orderItems.length === 0}
                >
                  Create Order
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
