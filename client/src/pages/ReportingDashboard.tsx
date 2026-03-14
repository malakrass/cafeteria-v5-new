import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardMetricCard } from "@/components/DashboardMetricCard";
import { trpc } from "@/lib/trpc";
import {
  formatCurrency,
  formatPoints,
  formatPercentage,
  calculateAverage,
} from "@/lib/dashboardUtils";
import { Loader2, TrendingUp, BarChart3, Users } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ReportingDashboard() {
  const { user, loading: authLoading } = useAuth();
  const cafeteriaId = (user as any)?.cafeteriaId || (user as any)?.id || "";

  const [reportType, setReportType] = useState<"daily" | "weekly" | "monthly">("daily");
  const [startDate, setStartDate] = useState<Date>(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState<Date>(new Date());

  // Fetch cafeteria reports
  const { data: reports, isLoading: reportsLoading } = trpc.reporting.getCafeteriaReports.useQuery(
    { cafeteriaId, reportType, startDate, endDate },
    { enabled: !!cafeteriaId }
  );

  // Fetch sales comparison
  const { data: salesComparison, isLoading: salesLoading } = trpc.reporting.getSalesComparison.useQuery(
    { cafeteriaId, startDate, endDate },
    { enabled: !!cafeteriaId }
  );

  // Fetch top items
  const { data: topItems, isLoading: topItemsLoading } = trpc.reporting.getTopItemsReport.useQuery(
    { cafeteriaId, startDate, endDate, limit: 10 },
    { enabled: !!cafeteriaId }
  );

  // Fetch top staff
  const { data: topStaff, isLoading: topStaffLoading } = trpc.reporting.getTopStaffReport.useQuery(
    { cafeteriaId, startDate, endDate, limit: 10 },
    { enabled: !!cafeteriaId }
  );

  // Fetch occupancy data
  const { data: occupancyData } = trpc.tables.getCafeteriaOccupancy.useQuery(
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

  const isLoading = reportsLoading || salesLoading || topItemsLoading || topStaffLoading;

  // Calculate aggregated metrics
  const totalSales = salesComparison?.totalSales || 0;
  const totalOrders = salesComparison?.totalOrders || 0;
  const totalItemsSold = salesComparison?.totalItemsSold || 0;
  const totalPointsDeducted = salesComparison?.totalPointsDeducted || 0;
  const averageOrderValue = salesComparison?.averageOrderValue || 0;
  const occupancyRate = occupancyData ? (occupancyData.occupiedTables || 0) / (occupancyData.totalTables || 1) : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-2">Cafeteria performance and insights</p>
        </div>

        {/* Date Range Filter */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Report Period</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Report Type</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Start Date</label>
                <input
                  type="date"
                  value={startDate.toISOString().split("T")[0]}
                  onChange={(e) => setStartDate(new Date(e.target.value))}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">End Date</label>
                <input
                  type="date"
                  value={endDate.toISOString().split("T")[0]}
                  onChange={(e) => setEndDate(new Date(e.target.value))}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div className="flex items-end">
                <Button variant="default" className="w-full">
                  Apply Filter
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <DashboardMetricCard
            title="Total Sales"
            value={formatCurrency(totalSales)}
            subtitle={`${totalOrders} orders`}
            icon={<TrendingUp className="w-4 h-4" />}
          />
          <DashboardMetricCard
            title="Average Order Value"
            value={formatCurrency(averageOrderValue)}
            subtitle="Per order"
            icon={<BarChart3 className="w-4 h-4" />}
          />
          <DashboardMetricCard
            title="Items Sold"
            value={totalItemsSold}
            subtitle="Total items"
            icon={<Users className="w-4 h-4" />}
          />
          <DashboardMetricCard
            title="Points Deducted"
            value={formatPoints(totalPointsDeducted)}
            subtitle="Total points"
            icon={<TrendingUp className="w-4 h-4" />}
          />
        </div>

        {/* Tabs for different reports */}
        <Tabs defaultValue="sales" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sales">Sales Report</TabsTrigger>
            <TabsTrigger value="items">Top Items</TabsTrigger>
            <TabsTrigger value="staff">Staff Performance</TabsTrigger>
          </TabsList>

          {/* Sales Report */}
          <TabsContent value="sales">
            <Card>
              <CardHeader>
                <CardTitle>Sales Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin" />
                  </div>
                ) : reports && reports.length > 0 ? (
                  <div className="space-y-4">
                    {reports.map((report) => (
                      <div key={report.id} className="p-4 bg-gray-50 rounded-lg border">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Date</p>
                            <p className="font-semibold">
                              {new Date(report.reportDate).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Total Sales</p>
                            <p className="font-semibold">{formatCurrency(report.totalSales)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Orders</p>
                            <p className="font-semibold">{report.totalOrders}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Avg Order Value</p>
                            <p className="font-semibold">
                              {formatCurrency(report.averageOrderValue)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No sales data available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Top Items Report */}
          <TabsContent value="items">
            <Card>
              <CardHeader>
                <CardTitle>Top Selling Items</CardTitle>
              </CardHeader>
              <CardContent>
                {topItemsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin" />
                  </div>
                ) : topItems && topItems.length > 0 ? (
                  <div className="space-y-3">
                    {topItems.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                        <div>
                          <p className="font-semibold">#{idx + 1}</p>
                          <p className="text-sm text-gray-600">Item ID: {item.itemId?.slice(0, 8)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-lg">{item.quantity}</p>
                          <p className="text-sm text-gray-600">sold</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No item data available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Staff Performance Report */}
          <TabsContent value="staff">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Staff</CardTitle>
              </CardHeader>
              <CardContent>
                {topStaffLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin" />
                  </div>
                ) : topStaff && topStaff.length > 0 ? (
                  <div className="space-y-3">
                    {topStaff.map((staff: any, idx: number) => (
                      <div key={idx} className="p-4 bg-gray-50 rounded-lg border">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Rank</p>
                            <p className="font-semibold text-lg">#{idx + 1}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Staff ID</p>
                            <p className="font-semibold">{staff.staffId?.slice(0, 8)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Total Sales</p>
                            <p className="font-semibold">{formatCurrency(staff.totalSales)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Orders</p>
                            <p className="font-semibold">{staff.totalOrders}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No staff data available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Occupancy Summary */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Table Occupancy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-600">Occupied Tables</p>
                <p className="text-3xl font-bold text-blue-900">{occupancyData?.occupiedTables || 0}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-600">Available Tables</p>
                <p className="text-3xl font-bold text-green-900">{occupancyData?.availableTables || 0}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-600">Occupancy Rate</p>
                <p className="text-3xl font-bold text-purple-900">{formatPercentage(occupancyRate)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
