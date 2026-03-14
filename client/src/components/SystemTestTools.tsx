import { useState } from "react";
import { trpcVanilla } from "@/lib/trpcVanilla";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Play, Trash2, RotateCcw, Zap } from "lucide-react";
import { runEndToEndSimulation, runLoadTestSimulation } from "@/lib/orderSimulationEngine";

interface SystemTestToolsProps {
  cafeteriaId: string;
}

export function SystemTestTools({ cafeteriaId }: SystemTestToolsProps) {
  const [simulating, setSimulating] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [e2eRunning, setE2eRunning] = useState(false);
  const [loadTestRunning, setLoadTestRunning] = useState(false);

  const handleSimulateOrder = async () => {
    setSimulating(true);
    try {
      const tables = await trpcVanilla.tables.getTables.query({ cafeteriaId });
      const availableTable = tables.find((t) => t.status === "available");

      if (!availableTable) {
        toast.error("No available tables to simulate order");
        return;
      }

      const menuItems = await trpcVanilla.menu.getMenuItems.query({ cafeteriaId });
      if (menuItems.length === 0) {
        toast.error("No menu items found to create order");
        return;
      }

      const randomItems = menuItems
        .sort(() => 0.5 - Math.random())
        .slice(0, 2)
        .map((item) => ({
          menuItemId: item.id,
          quantity: Math.floor(Math.random() * 2) + 1,
        }));

      await trpcVanilla.qrOrders.createCustomerOrder.mutate({
        token: availableTable.tableToken ?? "",
        items: randomItems,
      });

      toast.success(`Simulated order for Table ${availableTable.tableNumber}`);
    } catch (error: any) {
      toast.error("Simulation failed: " + error.message);
    } finally {
      setSimulating(false);
    }
  };

  const handleClearTables = async () => {
    setClearing(true);
    try {
      const tables = await trpcVanilla.tables.getTables.query({ cafeteriaId });
      for (const table of tables) {
        if (table.status !== "available") {
          await trpcVanilla.tables.updateTableStatus.mutate({
            tableId: table.id,
            status: "available",
          });
        }
      }
      toast.success("All tables cleared and set to available");
    } catch (error: any) {
      toast.error("Failed to clear tables: " + error.message);
    } finally {
      setClearing(false);
    }
  };

  const handleResetOrders = async () => {
    toast.info("Resetting orders is not fully implemented in this test tool yet.");
  };

  const handleEndToEndSimulation = async () => {
    setE2eRunning(true);
    try {
      const result = await runEndToEndSimulation(cafeteriaId);
      if (result.success) {
        toast.success(`${result.message} (${result.duration}ms)`);
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error("E2E simulation failed: " + error.message);
    } finally {
      setE2eRunning(false);
    }
  };

  const handleLoadTestSimulation = async () => {
    setLoadTestRunning(true);
    try {
      const result = await runLoadTestSimulation(cafeteriaId);
      if (result.success) {
        toast.success(`${result.message} (${result.duration}ms)`);
      } else {
        toast.error(result.message);
        if (result.errors && result.errors.length > 0) {
          console.log("Load test errors:", result.errors);
        }
      }
    } catch (error: any) {
      toast.error("Load test failed: " + error.message);
    } finally {
      setLoadTestRunning(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Simulate Order</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-gray-500 mb-4">Creates a random customer order for an available table.</p>
          <Button
            className="w-full"
            onClick={handleSimulateOrder}
            disabled={simulating}
          >
            {simulating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            Run Simulation
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Clear All Tables</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-gray-500 mb-4">Resets all tables in this cafeteria to 'available' status.</p>
          <Button
            variant="outline"
            className="w-full text-red-600 border-red-200 hover:bg-red-50"
            onClick={handleClearTables}
            disabled={clearing}
          >
            {clearing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
            Clear Tables
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Reset System State</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-gray-500 mb-4">Resets order states and clears test data (placeholder).</p>
          <Button
            variant="ghost"
            className="w-full"
            onClick={handleResetOrders}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset State
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">End-to-End Test</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-gray-500 mb-4">Complete order lifecycle: scan → order → ready → served → closed.</p>
          <Button
            variant="default"
            className="w-full bg-blue-600 hover:bg-blue-700"
            onClick={handleEndToEndSimulation}
            disabled={e2eRunning}
          >
            {e2eRunning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            Run E2E Test
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Load Test</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-gray-500 mb-4">10 tables × 3 orders each. Tests concurrent order handling.</p>
          <Button
            variant="default"
            className="w-full bg-purple-600 hover:bg-purple-700"
            onClick={handleLoadTestSimulation}
            disabled={loadTestRunning}
          >
            {loadTestRunning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
            Run Load Test
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
