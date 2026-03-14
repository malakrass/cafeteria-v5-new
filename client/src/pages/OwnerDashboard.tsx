import React, { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { useTranslation } from '@/locales/useTranslation';
import { trpc } from '@/lib/trpc';
import { 
  LayoutDashboard, 
  CreditCard, 
  Wallet, 
  BarChart3, 
  Activity, 
  CheckCircle2, 
  XCircle,
  Clock,
  TrendingUp,
  Users,
  Store
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TableQRManager } from '@/components/TableQRManager';
import { SystemTestTools } from '@/components/SystemTestTools';
import { SystemMonitorPanel } from '@/components/SystemMonitorPanel';
import { LaunchToolkitManager } from '@/components/LaunchToolkitManager';

/**
 * OWNER DASHBOARD - CAFETERIA V2
 * Role: Admin / System Owner
 * Features: Recharge Approval, Withdrawal Approval, Global Reports, System Monitoring
 * RTL Support: Yes (via useTranslation hook)
 * Mobile Responsive: Yes (Tailwind CSS)
 */

export default function OwnerDashboard() {
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const { language } = useTranslation();
  const [activeTab, setActiveTab] = useState('recharges');

  // Verify user is admin
  if (!authLoading && user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-red-600 font-bold">Access Denied</p>
            <p className="text-sm text-gray-500 mt-2">Only system administrators can access this dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch pending recharges
  const { data: rechargesData, isLoading: rechargesLoading } = trpc.recharges.getRequests.useQuery({ status: "pending" });
  const pendingRecharges = rechargesData?.requests;

  // Fetch pending withdrawals
  const { data: pendingWithdrawals, isLoading: withdrawalsLoading } = trpc.withdrawals.getRequests.useQuery({ status: "pending" });

  // Approve recharge mutation
  const approveRechargeMutation = trpc.recharges.approveRequest.useMutation({
    onSuccess: () => {
      // Refresh data
    }
  });

  // Approve withdrawal mutation
  const approveWithdrawalMutation = trpc.withdrawals.approveRequest.useMutation({
    onSuccess: () => {
      // Refresh data
    }
  });

  const isRTL = language === 'ar';

  return (
    <div className={`min-h-screen bg-gray-50 font-sans ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="w-6 h-6 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-800">Owner Dashboard</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">Welcome, Admin</span>
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">A</div>
        </div>
      </header>

      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        {/* System Monitor Panel */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-800 mb-4">System Monitor</h2>
          <SystemMonitorPanel cafeteriaId={(user as any)?.cafeteriaId || "default-cafeteria-id"} />
        </div>

        {/* Global Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Points Sold</p>
                  <p className="text-2xl font-bold text-gray-900">125,400</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-50 text-green-600">
                  <Store className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Active Cafeterias</p>
                  <p className="text-2xl font-bold text-gray-900">84</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Marketers</p>
                  <p className="text-2xl font-bold text-gray-900">32</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">System Health</p>
                  <p className="text-2xl font-bold text-gray-900">99.9%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Card>
          <CardHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
<TabsList className="grid w-full grid-cols-6">
	                <TabsTrigger value="recharges">Recharge Requests</TabsTrigger>
	                <TabsTrigger value="withdrawals">Withdrawal Requests</TabsTrigger>
	                <TabsTrigger value="reports">Commission Reports</TabsTrigger>
	                <TabsTrigger value="qr-codes">Table QR Codes</TabsTrigger>
	                <TabsTrigger value="launch-toolkit">Launch Toolkit</TabsTrigger>
	                <TabsTrigger value="test-tools">System Test Tools</TabsTrigger>
	              </TabsList>

              <TabsContent value="recharges" className="mt-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-800">Approve Recharge Requests</h3>
                  {rechargesLoading ? (
                    <p className="text-gray-500">Loading...</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-gray-400 text-sm border-b border-gray-100">
                            <th className="pb-3 font-medium">Cafeteria</th>
                            <th className="pb-3 font-medium">Amount</th>
                            <th className="pb-3 font-medium">Date</th>
                            <th className="pb-3 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {pendingRecharges?.map((req: any) => (
                            <tr key={req.id} className="text-sm">
                              <td className="py-4 font-medium text-gray-900">{req.cafeteria?.name}</td>
                              <td className="py-4 text-blue-600 font-bold">${req.amount}</td>
                              <td className="py-4 text-gray-500">{new Date(req.createdAt).toLocaleString()}</td>
                              <td className="py-4">
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => approveRechargeMutation.mutate({ rechargeRequestId: req.id })}
                                    disabled={approveRechargeMutation.isPending}
                                  >
                                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {}}
                                  >
                                    <XCircle className="w-5 h-5 text-red-600" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="withdrawals" className="mt-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-800">Approve Withdrawal Requests</h3>
                  {withdrawalsLoading ? (
                    <p className="text-gray-500">Loading...</p>
                  ) : (
                    <div className="space-y-3">
                      {pendingWithdrawals?.map((req: any) => (
                        <Card key={req.id}>
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <Wallet className="w-5 h-5 text-purple-600" />
                                <div>
                                  <p className="font-bold text-gray-900">{req.marketer?.name}</p>
                                  <p className="text-xs text-gray-500">{new Date(req.createdAt).toLocaleString()}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-6">
                                <span className="text-lg font-bold text-purple-600">${req.amount}</span>
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => approveWithdrawalMutation.mutate({ withdrawalRequestId: req.id })}>Approve</Button>
                                  <Button size="sm" variant="outline">Reject</Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="reports" className="mt-6">
                <div className="text-center py-12">
                  <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Global commission reports loading...</p>
                </div>
              </TabsContent>

              <TabsContent value="qr-codes" className="mt-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-800">Generate Table QR Codes</h3>
                  <TableQRManager cafeteriaId={(user as any)?.cafeteriaId || "default-cafeteria-id"} />
                </div>
              </TabsContent>

<TabsContent value="launch-toolkit" className="mt-6">
	                <div className="space-y-4">
	                  <h3 className="text-lg font-bold text-gray-800">Launch Toolkit</h3>
	                  <LaunchToolkitManager />
	                </div>
	              </TabsContent>

	              <TabsContent value="test-tools" className="mt-6">
	                <div className="space-y-4">
	                  <h3 className="text-lg font-bold text-gray-800">System Test Tools</h3>
	                  <SystemTestTools cafeteriaId={(user as any)?.cafeteriaId || "default-cafeteria-id"} />
	                </div>
	              </TabsContent>
            </Tabs>
          </CardHeader>
        </Card>
      </main>
    </div>
  );
}
