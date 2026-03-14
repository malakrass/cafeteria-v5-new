import { useState, useEffect } from "react";
import { trpcVanilla } from "@/lib/trpcVanilla";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, QrCode, RefreshCw } from "lucide-react";

interface TableQRManagerProps {
  cafeteriaId: string;
}

export function TableQRManager({ cafeteriaId }: TableQRManagerProps) {
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState<string | null>(null);

  const fetchTables = async () => {
    try {
      const data = await trpcVanilla.tables.getTables.query({ cafeteriaId });
      setTables(data);
    } catch (error: any) {
      toast.error("Failed to fetch tables: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (cafeteriaId) {
      fetchTables();
    }
  }, [cafeteriaId]);

  const handleRegenerateToken = async (tableId: string) => {
    setRegenerating(tableId);
    try {
      await trpcVanilla.tables.regenerateTableToken.mutate({ tableId });
      toast.success("QR Token regenerated successfully");
      await fetchTables();
    } catch (error: any) {
      toast.error("Failed to regenerate token: " + error.message);
    } finally {
      setRegenerating(null);
    }
  };

  const getQRUrl = (token: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/menu/${token}`;
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-700";
      case "occupied":
        return "bg-red-100 text-red-700";
      case "reserved":
        return "bg-yellow-100 text-yellow-700";
      case "cleaning":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Table QR Codes</h3>
        <Button variant="outline" size="sm" onClick={fetchTables}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {tables.length === 0 ? (
        <Card className="p-8 text-center">
          <QrCode className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No tables found for this cafeteria.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tables.map((table) => (
            <Card key={table.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Table {table.tableNumber}</CardTitle>
                  <Badge className={`text-xs ${getStatusColor(table.status)}`}>
                    {table.status || "unknown"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">QR URL</p>
                  <p className="text-xs font-mono text-gray-700 break-all">
                    {table.tableToken ? getQRUrl(table.tableToken) : "No token"}
                  </p>
                </div>
                {table.capacity && (
                  <p className="text-xs text-gray-500">Capacity: {table.capacity} seats</p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => handleRegenerateToken(table.id)}
                  disabled={regenerating === table.id}
                >
                  {regenerating === table.id ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="w-3 h-3 mr-2" />
                  )}
                  Regenerate QR Token
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
