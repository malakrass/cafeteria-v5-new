import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardMetricCard } from "@/components/DashboardMetricCard";
import { StaffManagement } from "@/components/StaffManagement";
import { trpc } from "@/lib/trpc";
import {
  formatCurrency,
  formatPoints,
  formatPercentage,
  calculateOccupancyPercentage,
  getOccupancyLevel,
  getOccupancyColor,
  parseDecimal,
} from "@/lib/dashboardUtils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Loader2, TrendingUp, Users, UtensilsCrossed, Table2 } from "lucide-react";

export default function ManagerDashboard() {
  const { user, loading: authLoading } = useAuth();

  // Ensure cafeteriaId is properly typed
  const cafeteriaId = (user as any)?.cafeteriaId || (user as any)?.id || "";

  // Fetch cafeteria data
  const { data: cafeteriaData, isLoading: cafeteriaLoading } = trpc.cafeterias.getCafeteriaDetails.useQuery(
    { cafeteriaId },
    { enabled: !!cafeteriaId }
  );

  // Fetch occupancy data
  const { data: occupancyData, isLoading: occupancyLoading } = trpc.tables.getCafeteriaOccupancy.useQuery(
    { cafeteriaId },
    { enabled: !!cafeteriaId }
  );

  // Fetch menu summary
  const { data: menuData, isLoading: menuLoading } = trpc.menu.getMenuSummary.useQuery(
    { cafeteriaId },
    { enabled: !!cafeteriaId }
  );

  // Fetch shift statistics
  const { data: shiftStats, isLoading: shiftLoading } = trpc.shifts.getCafeteriaShifts.useQuery(
    { cafeteriaId },
    { enabled: !!cafeteriaId }
  );

  // Fetch sales report
  const { data: salesReport, isLoading: salesLoading } = trpc.reporting.getCafeteriaReports.useQuery(
    { cafeteriaId },
    { enabled: !!cafeteriaId }
  );

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const isLoading = cafeteriaLoading || occupancyLoading || menuLoading || shiftLoading || salesLoading;

  const pointsBalance = cafeteriaData ? parseDecimal(cafeteriaData.pointsBalance as string | number) : 0;
  const occupancyRate = occupancyData
    ? calculateOccupancyPercentage(occupancyData.occupiedTables || 0, occupancyData.totalTables || 0)
    : 0;
  const report = Array.isArray(salesReport) ? salesReport[0] : salesReport;
  const totalSales = report ? parseDecimal(report.totalSales) : 0;
  const totalOrders = report?.totalOrders || 0;
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Manager Dashboard</h1>
          <p className="text-gray-600 mt-2">{cafeteriaData?.name || "Cafeteria"}</p>
        </div>

        {/* Top Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <DashboardMetricCard
            title="Points Balance"
            value={formatPoints(pointsBalance)}
            subtitle="Available for operations"
            icon={<TrendingUp className="w-4 h-4" />}
          />
          <DashboardMetricCard
            title="Table Occupancy"
            value={formatPercentage(occupancyRate)}
            subtitle={`${occupancyData?.occupiedTables || 0}/${occupancyData?.totalTables || 0} tables`}
            icon={<Table2 className="w-4 h-4" />}
          />
          <DashboardMetricCard
            title="Menu Items"
            value={menuData?.totalItems || 0}
            subtitle={`${menuData?.availableItems || 0} available`}
            icon={<UtensilsCrossed className="w-4 h-4" />}
          />
          <DashboardMetricCard
            title="Active Staff"
            value={shiftStats?.length || 0}
            subtitle="Currently working"
            icon={<Users className="w-4 h-4" />}
          />
        </div>

        {/* Sales and Occupancy Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Sales Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Today's Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Sales</span>
                  <span className="text-2xl font-bold">{formatCurrency(totalSales)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Orders</span>
                  <span className="text-2xl font-bold">{totalOrders}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Average Order Value</span>
                  <span className="text-2xl font-bold">{formatCurrency(avgOrderValue)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Points Deducted</span>
                  <span className="text-2xl font-bold">{formatPoints(report?.totalPointsDeducted || 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Occupancy Details */}
          <Card>
            <CardHeader>
              <CardTitle>Table Occupancy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Tables</span>
                  <span className="text-2xl font-bold">{occupancyData?.totalTables || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Occupied</span>
                  <span className="text-2xl font-bold text-blue-600">{occupancyData?.occupiedTables || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Available</span>
                  <span className="text-2xl font-bold text-green-600">{occupancyData?.availableTables || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Occupancy Level</span>
                  <span className={`text-2xl font-bold ${getOccupancyColor(occupancyRate)}`}>
                    {getOccupancyLevel(occupancyRate)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section Breakdown */}
        {occupancyData?.sectionStats && occupancyData.sectionStats.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Occupancy by Section</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {occupancyData.sectionStats.map((section) => (
                  <div key={section.sectionId} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium">{section.sectionName}</p>
                      <p className="text-sm text-gray-600">
                        {section.occupiedTables}/{section.totalTables} tables
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{formatPercentage(section.occupancyRate)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Staff Management */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Staff Management</CardTitle>
          </CardHeader>
          <CardContent>
            <StaffManagement cafeteriaId={cafeteriaId} />
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="default">Manage Menu</Button>
              <Button variant="outline">Manage Tables</Button>
              <Button variant="outline">View Reports</Button>
              <Button variant="outline">Approve Recharges</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
