import React, { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { useTranslation } from '@/locales/useTranslation';
import { trpc } from '@/lib/trpc';
import { 
  Store, 
  Coins, 
  PlusCircle, 
  ShoppingCart, 
  Users, 
  Settings, 
  Clock, 
  CheckCircle2, 
  BarChart3,
  Upload
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * CAFETERIA DASHBOARD - CAFETERIA V2
 * Role: Cafeteria Admin / Manager
 * Features: Points Balance, Recharge Submission, Order Activity, Staff Management
 * RTL Support: Yes (via useTranslation hook)
 * Mobile Responsive: Yes (Tailwind CSS)
 */

export default function CafeteriaDashboard() {
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const { language } = useTranslation();
  const [rechargeAmount, setRechargeAmount] = useState('');

  // Verify user is cafeteria admin/manager
  if (!authLoading && !['manager', 'admin'].includes(user?.role ?? '')) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-red-600 font-bold">Access Denied</p>
            <p className="text-sm text-gray-500 mt-2">Only cafeteria managers can access this dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const cafeteriaId = user?.cafeteriaId ?? '';

  // Fetch cafeteria info using the correct procedure name
  const { data: cafeteriaInfo, isLoading: cafeteriaLoading } = trpc.cafeterias.getCafeteriaDetails.useQuery(
    { cafeteriaId },
    { enabled: !!cafeteriaId }
  );

  // Fetch recent orders using the correct procedure name
  const { data: ordersData, isLoading: ordersLoading } = trpc.orders.getOrders.useQuery(
    { cafeteriaId },
    { enabled: !!cafeteriaId }
  );

  // Fetch recharge history using the correct procedure name
  const { data: rechargeData, isLoading: rechargeHistoryLoading } = trpc.recharges.getRequests.useQuery(
    { cafeteriaId },
    { enabled: !!cafeteriaId }
  );

  // Submit recharge mutation using the correct procedure name
  const submitRechargeMutation = trpc.recharges.createRequest.useMutation({
    onSuccess: () => {
      setRechargeAmount('');
    }
  });

  const isRTL = language === 'ar';
  const recentOrders = ordersData;
  const rechargeHistory = rechargeData?.requests;

  return (
    <div className={`min-h-screen bg-gray-50 font-sans ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Store className="w-6 h-6 text-blue-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">{(cafeteriaInfo as any)?.name || 'Cafeteria'}</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-bold">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Online
          </div>
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">C</div>
        </div>
      </header>

      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        {/* Points Balance Card */}
        <Card className="bg-white mb-8 border border-gray-100">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                <div className="p-4 bg-amber-100 rounded-2xl text-amber-600">
                  <Coins className="w-10 h-10" />
                </div>
                <div>
                  <p className="text-gray-500 text-sm mb-1">Current Points Balance</p>
                  <h2 className="text-4xl font-black text-gray-900">
                    {(cafeteriaInfo as any)?.pointsBalance || '0'} 
                    <span className="text-lg font-normal text-gray-400 ml-2">points</span>
                  </h2>
                </div>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <Button className="flex-1 md:flex-none px-8 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2">
                  <PlusCircle className="w-5 h-5" />
                  Request Recharge
                </Button>
                <Button variant="outline" size="icon" className="p-4">
                  <Settings className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                  <ShoppingCart className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Today's Orders</p>
                  <p className="text-xl font-bold text-gray-900">{recentOrders?.length || '0'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-50 rounded-lg text-purple-600">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Active Staff</p>
                  <p className="text-xl font-bold text-gray-900">{(cafeteriaInfo as any)?.activeStaff || '0'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-50 rounded-lg text-green-600">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Grace Mode</p>
                  <p className="text-xl font-bold text-gray-900">{(cafeteriaInfo as any)?.graceMode ? 'Enabled' : 'Disabled'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Orders */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Orders</CardTitle>
                  <Button variant="link" size="sm">View All</Button>
                </div>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <p className="text-gray-500">Loading...</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="text-gray-400 text-xs border-b border-gray-100">
                          <th className="pb-3 font-medium">Order ID</th>
                          <th className="pb-3 font-medium">Table</th>
                          <th className="pb-3 font-medium">Amount</th>
                          <th className="pb-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {recentOrders?.map((order: any) => (
                          <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                            <td className="py-4 font-bold text-gray-900">{order.id.slice(0, 8)}...</td>
                            <td className="py-4 text-gray-500">Table {order.tableId || '-'}</td>
                            <td className="py-4 font-bold text-gray-900">{Number(order.totalAmount) || 0}</td>
                            <td className="py-4">
                              <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${order.status === 'closed' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                                {order.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recharge Submission & History */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-blue-600" />
                  New Recharge Request
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-2">Amount ($)</label>
                  <Input 
                    type="number" 
                    placeholder="Enter amount"
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-blue-300 transition-colors cursor-pointer">
                  <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">Attach payment receipt image</p>
                </div>
                <Button 
                  onClick={() => submitRechargeMutation.mutate({ amount: parseFloat(rechargeAmount), cafeteriaId })}
                  disabled={!rechargeAmount || submitRechargeMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Submit Request
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recharge History</CardTitle>
              </CardHeader>
              <CardContent>
                {rechargeHistoryLoading ? (
                  <p className="text-gray-500 text-sm">Loading...</p>
                ) : (
                  <div className="space-y-3">
                    {rechargeHistory?.map((h: any) => (
                      <div key={h.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <div>
                          <p className="text-sm font-bold text-gray-900">${h.amount}</p>
                          <p className="text-[10px] text-gray-400">{new Date(h.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {h.status === 'approved' ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <Clock className="w-4 h-4 text-blue-500" />
                          )}
                          <span className={`text-[10px] font-bold ${h.status === 'approved' ? 'text-green-600' : 'text-blue-600'}`}>
                            {h.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
