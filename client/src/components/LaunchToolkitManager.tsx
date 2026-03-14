import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Printer, Power, Download, FileJson, CheckCircle2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export function LaunchToolkitManager() {
  const { user } = useAuth();
  const cafeteriaId = (user as any)?.cafeteriaId || (user as any)?.id || "";
  const [isClosing, setIsClosing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [summary, setSummary] = useState<any>(null);

  const generateQRMutation = trpc.tables.generatePrintableQRPack.useMutation();
  const closeDayMutation = trpc.system.closeDay.useMutation();
  const exportBackupMutation = trpc.system.exportBackup.useMutation();

  const handlePrintQR = async () => {
    try {
      const result = await generateQRMutation.mutateAsync({
        cafeteriaId,
        baseUrl: window.location.origin,
      });
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(result.html);
        printWindow.document.close();
        printWindow.print();
      }
    } catch (error) {
      console.error("Failed to generate QR pack:", error);
    }
  };

  const handleCloseDay = async () => {
    if (!confirm("Are you sure you want to close the day? This will close all open orders and reset all tables.")) return;
    setIsClosing(true);
    try {
      const result = await closeDayMutation.mutateAsync({ cafeteriaId });
      setSummary(result.summary);
    } catch (error) {
      console.error("Failed to close day:", error);
    } finally {
      setIsClosing(false);
    }
  };

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const result = await exportBackupMutation.mutateAsync({ cafeteriaId });
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result.backup, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `cafeteria_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    } catch (error) {
      console.error("Failed to export backup:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* TASK 1 — Table QR Print Kit */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Printer className="w-5 h-5" />
              QR Print Kit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">Generate a printable A4 pack with QR codes for all tables.</p>
            <Button onClick={handlePrintQR} className="w-full" variant="outline">
              Generate Printable Pack
            </Button>
          </CardContent>
        </Card>

        {/* TASK 4 — Daily Closing Tool */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Power className="w-5 h-5" />
              Daily Closing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">Close all open orders and reset table statuses for the next day.</p>
            <Button 
              onClick={handleCloseDay} 
              className="w-full" 
              variant="destructive"
              disabled={isClosing}
            >
              {isClosing ? "Closing Day..." : "Close Day Now"}
            </Button>
          </CardContent>
        </Card>

        {/* TASK 5 — Backup Export Tool */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Download className="w-5 h-5" />
              Data Backup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">Export all critical system data (orders, menu, staff) as JSON.</p>
            <Button 
              onClick={handleExportBackup} 
              className="w-full" 
              variant="outline"
              disabled={isExporting}
            >
              <FileJson className="w-4 h-4 mr-2" />
              {isExporting ? "Exporting..." : "Export Daily Backup"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {summary && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Daily Closing Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-green-600">Orders Closed</p>
                <p className="text-2xl font-bold text-green-900">{summary.orderCount}</p>
              </div>
              <div>
                <p className="text-sm text-green-600">Estimated Revenue</p>
                <p className="text-2xl font-bold text-green-900">${summary.totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
