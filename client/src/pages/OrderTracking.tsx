import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface OrderStatus {
  stage: "submitted" | "sent_to_kitchen" | "in_preparation" | "ready" | "served";
  label: string;
  timestamp?: Date;
  duration?: string;
  completed: boolean;
}

export default function OrderTracking() {
  const { orderId } = useParams<{ orderId: string }>();
  const [elapsedTime, setElapsedTime] = useState<string>("0m");

  const { data: order, isLoading, error, refetch } = trpc.qrOrders.getCustomerOrder.useQuery(
    { orderId: orderId || "" },
    { enabled: !!orderId, refetchInterval: 3000 } // Refetch every 3 seconds
  );

  // Calculate elapsed time
  useEffect(() => {
    if (!order?.createdAt) return;

    const interval = setInterval(() => {
      const now = new Date();
      const created = new Date(order.createdAt);
      const diffMs = now.getTime() - created.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffSecs = Math.floor((diffMs % 60000) / 1000);

      if (diffMins > 0) {
        setElapsedTime(`${diffMins}m ${diffSecs}s`);
      } else {
        setElapsedTime(`${diffSecs}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [order?.createdAt]);

  // Build order status timeline
  const getOrderStatuses = (): OrderStatus[] => {
    if (!order) return [];

    const statuses: OrderStatus[] = [
      {
        stage: "submitted",
        label: "Order Submitted",
        timestamp: new Date(order.createdAt),
        completed: true,
      },
    ];

    // Check if any items were sent to kitchen
    const sentToKitchenItems = order.items.filter((item) => item.status === "sent_to_kitchen" || item.status === "in_preparation" || item.status === "ready" || item.status === "served");
    if (sentToKitchenItems.length > 0) {
      const firstSentTime = sentToKitchenItems[0].sentToKitchenAt ? new Date(sentToKitchenItems[0].sentToKitchenAt) : undefined;
      statuses.push({
        stage: "sent_to_kitchen",
        label: "Sent to Kitchen",
        timestamp: firstSentTime,
        completed: true,
      });
    }

    // Check if any items are in preparation
    const inPrepItems = order.items.filter((item) => item.status === "in_preparation" || item.status === "ready" || item.status === "served");
    if (inPrepItems.length > 0) {
      statuses.push({
        stage: "in_preparation",
        label: "Being Prepared",
        completed: true,
      });
    }

    // Check if any items are ready
    const readyItems = order.items.filter((item) => item.status === "ready" || item.status === "served");
    if (readyItems.length > 0) {
      const firstReadyTime = readyItems[0].readyAt ? new Date(readyItems[0].readyAt) : undefined;
      statuses.push({
        stage: "ready",
        label: "Ready for Pickup",
        timestamp: firstReadyTime,
        completed: true,
      });
    }

    // Check if order is served/completed
    if (order.status === "closed") {
      statuses.push({
        stage: "served",
        label: "Completed",
        timestamp: new Date(order.createdAt), // Use closedAt if available
        completed: true,
      });
    }

    return statuses;
  };

  const calculateDuration = (from?: Date, to?: Date): string => {
    if (!from || !to) return "";
    const diffMs = to.getTime() - from.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    return `${diffMins}m ${diffSecs}s`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
          <p className="text-gray-600">{error?.message || "Unable to load order details."}</p>
        </Card>
      </div>
    );
  }

  const statuses = getOrderStatuses();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Order Tracking</h1>
          <p className="text-gray-600">Order ID: {orderId}</p>
          <Badge className="mt-2" variant={order.status === "closed" ? "default" : "secondary"}>
            {order.status === "closed" ? "Completed" : "In Progress"}
          </Badge>
        </div>

        {/* Total Time Elapsed */}
        <Card className="p-6 mb-6 bg-white shadow-lg">
          <div className="text-center">
            <p className="text-gray-600 text-sm mb-2">Total Time Elapsed</p>
            <p className="text-4xl font-bold text-indigo-600">{elapsedTime}</p>
          </div>
        </Card>

        {/* Order Items Summary */}
        <Card className="p-6 mb-6 bg-white shadow-lg">
          <h2 className="text-lg font-semibold mb-4">Order Items ({order.items.length})</h2>
          <div className="space-y-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium">Item {item.menuItemId}</p>
                  <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                </div>
                <Badge variant="outline" className="capitalize">
                  {item.status.replace(/_/g, " ")}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Timeline */}
        <Card className="p-6 bg-white shadow-lg">
          <h2 className="text-lg font-semibold mb-6">Order Timeline</h2>
          <div className="space-y-6">
            {statuses.map((status, index) => (
              <div key={status.stage} className="flex gap-4">
                {/* Timeline dot and line */}
                <div className="flex flex-col items-center">
                  <div className={`w-4 h-4 rounded-full border-2 ${status.completed ? "bg-green-500 border-green-500" : "bg-gray-300 border-gray-300"}`} />
                  {index < statuses.length - 1 && (
                    <div className={`w-1 h-12 ${status.completed ? "bg-green-500" : "bg-gray-300"}`} />
                  )}
                </div>

                {/* Status content */}
                <div className="flex-1 pb-4">
                  <p className="font-semibold text-gray-900">{status.label}</p>
                  {status.timestamp && (
                    <p className="text-sm text-gray-600">
                      {status.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </p>
                  )}
                  {status.completed && status.timestamp && index > 0 && statuses[index - 1].timestamp && (
                    <p className="text-xs text-gray-500 mt-1">
                      Duration: {calculateDuration(statuses[index - 1].timestamp, status.timestamp)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Order Summary */}
        <Card className="p-6 mt-6 bg-white shadow-lg">
          <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Amount:</span>
              <span className="font-semibold">${parseFloat(order.totalAmount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Order Status:</span>
              <span className="font-semibold capitalize">{order.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Items Count:</span>
              <span className="font-semibold">{order.items.length}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
