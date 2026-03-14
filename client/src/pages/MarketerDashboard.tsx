import React, { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { useTranslation } from '@/locales/useTranslation';
import { trpc } from '@/lib/trpc';
import { 
  User, 
  CreditCard, 
  Wallet, 
  History, 
  Send, 
  Copy, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight, 
  ArrowDownLeft,
  Share2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * MARKETER DASHBOARD - CAFETERIA V2
 * Role: Marketer
 * Features: Reference Code, Pending/Available Balances, Commission History, Withdrawal Form
 * RTL Support: Yes (via useTranslation hook)
 * Mobile Responsive: Yes (Tailwind CSS)
 */

export default function MarketerDashboard() {
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const { language } = useTranslation();
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // Verify user is marketer
  if (!authLoading && !['marketer', 'admin'].includes(user?.role || "")) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-red-600 font-bold">Access Denied</p>
            <p className="text-sm text-gray-500 mt-2">Only marketers can access this dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch marketer balance
  const { data: balance, isLoading: balanceLoading } = trpc.commissions.getBalance.useQuery(
    { marketerId: user?.marketerId || '' },
    { enabled: !!user?.marketerId }
  );

  // Fetch commission history
  const { data: commissionHistory, isLoading: historyLoading } = trpc.commissions.getCommissionHistory.useQuery(
    { marketerId: user?.marketerId || '' },
    { enabled: !!user?.marketerId }
  );

  // Request withdrawal mutation
  const withdrawalMutation = trpc.withdrawals.requestWithdrawal.useMutation({
    onSuccess: () => {
      setWithdrawalAmount('');
      // balance.refetch(); // trpc v11 hooks don't have refetch on the result object directly usually, or it's handled via queryClient
    }
  });

  const isRTL = language === 'ar';
  const marketerInfo = {
    name: user?.name || 'Marketer',
    referenceCode: user?.referenceCode || 'N/A',
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Reference code copied!');
  };

  return (
    <div className={`min-h-screen bg-gray-50 font-sans ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-100 rounded-lg">
            <User className="w-6 h-6 text-purple-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">Marketer Dashboard</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">Welcome, {marketerInfo.name}</span>
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">M</div>
        </div>
      </header>

      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        {/* Reference Code Card */}
        <Card className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white mb-8 border-0">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-purple-100 text-sm mb-1">Your Reference Code</p>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold tracking-wider">{marketerInfo.referenceCode}</h2>
                  <Button 
                    onClick={() => copyToClipboard(marketerInfo.referenceCode)}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <Button className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-purple-600 font-bold rounded-xl hover:bg-purple-50">
                <Share2 className="w-4 h-4" />
                Share Code
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Balance Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Pending</span>
              </div>
              <p className="text-sm text-gray-500 mb-1">Pending Balance</p>
              <p className="text-2xl font-bold text-gray-900">${balance?.pendingBalance || '0.00'}</p>
              <p className="text-xs text-gray-400 mt-2">Converts to available on next cafeteria recharge</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-50 rounded-lg text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">Available</span>
              </div>
              <p className="text-sm text-gray-500 mb-1">Available Balance</p>
              <p className="text-2xl font-bold text-gray-900">${balance?.availableBalance || '0.00'}</p>
              <p className="text-xs text-gray-400 mt-2">Ready to withdraw immediately</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                  <History className="w-5 h-5" />
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-1">Total Withdrawn</p>
              <p className="text-2xl font-bold text-gray-900">${balance?.totalWithdrawn || '0.00'}</p>
              <p className="text-xs text-gray-400 mt-2">Total amount successfully withdrawn</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Commission History */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Commission History</CardTitle>
                  <Button variant="link" size="sm">View All</Button>
                </div>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <p className="text-gray-500">Loading...</p>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {commissionHistory?.map((comm: any) => (
                      <div key={comm.id} className="py-4 flex items-center justify-between hover:bg-gray-50 px-2 rounded transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${comm.status === 'available' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                            {comm.status === 'available' ? <ArrowUpRight className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{comm.cafeteriaName}</p>
                            <p className="text-xs text-gray-500">{new Date(comm.createdAt).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${comm.status === 'available' ? 'text-green-600' : 'text-blue-600'}`}>+${comm.commissionAmount}</p>
                          <p className="text-[10px] text-gray-400 uppercase">{comm.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Withdrawal Form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-purple-600" />
                  Request Withdrawal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-2">Amount to Withdraw ($)</label>
                  <Input 
                    type="number" 
                    value={withdrawalAmount}
                    onChange={(e) => setWithdrawalAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full"
                  />
                  <p className="text-[10px] text-gray-400 mt-2">Max available: ${balance?.availableBalance || '0.00'}</p>
                </div>
                <Button 
                  onClick={() => withdrawalMutation.mutate({ amount: parseFloat(withdrawalAmount) || 0 })}
                  disabled={!withdrawalAmount || parseFloat(withdrawalAmount) <= 0 || parseFloat(withdrawalAmount) > (balance?.availableBalance || 0) || withdrawalMutation.isPending}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  Submit Withdrawal Request
                </Button>
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="text-xs text-amber-700 leading-relaxed">
                    * Withdrawal requests are reviewed by admin within 24-48 business hours.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
