import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, TrendingUp, TrendingDown, DollarSign, Building, Smartphone, BarChart3, PieChart, Menu } from "lucide-react";
import { useAppSettings } from "@/components/settings/settings";
import { formatCurrency } from "@/lib/currency";
import { generalTransactionsApi, realEstateTransactionsApi, deviceTransactionsApi } from "@/lib/api";
import { useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import type { GeneralTransaction, RealEstateTransaction, DeviceTransaction } from "@shared/schema";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const settings = useAppSettings();
  const isMobile = useIsMobile();

  // Fetch all transactions
  const { data: generalTransactions = [] } = useQuery({
    queryKey: ['/api/general-transactions'],
  }) as { data: GeneralTransaction[] };

  const { data: realEstateTransactions = [] } = useQuery({
    queryKey: ['/api/real-estate-transactions'],
  }) as { data: RealEstateTransaction[] };

  const { data: deviceTransactions = [] } = useQuery({
    queryKey: ['/api/device-transactions'],
  }) as { data: DeviceTransaction[] };

  // Calculate total balances by currency
  const totalBalancesByCurrency = settings.bankAccounts.reduce((acc, account) => {
    const accountTransactions = generalTransactions.filter(t => 
      t.toAccountId === account.id || t.fromAccountId === account.id
    );
    
    let balance = parseFloat(account.balance?.toString() || "0");
    accountTransactions.forEach(transaction => {
      const amount = parseFloat(transaction.amount);
      if (transaction.type === 'income' && transaction.toAccountId === account.id) {
        balance += amount;
      } else if (transaction.type === 'expense' && transaction.toAccountId === account.id) {
        balance -= amount;
      } else if (transaction.type === 'transfer') {
        if (transaction.toAccountId === account.id) {
          balance += amount;
        } else if (transaction.fromAccountId === account.id) {
          balance -= amount;
        }
      }
    });

    if (!acc[account.currency]) {
      acc[account.currency] = 0;
    }
    acc[account.currency] += balance;
    return acc;
  }, {} as Record<string, number>);

  // Calculate recent activity (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentGeneralTransactions = generalTransactions.filter(t => 
    new Date(t.date) >= thirtyDaysAgo
  );

  const recentIncome = recentGeneralTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const recentExpenses = recentGeneralTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Financial overview and insights</p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => setLocation('/general')}
              variant="outline"
            >
              <Wallet className="h-4 w-4 mr-2" />
              General Finances
            </Button>
            <Button 
              onClick={() => setLocation('/real-estate')}
              variant="outline"
            >
              <Building className="h-4 w-4 mr-2" />
              Real Estate
            </Button>
            <Button 
              onClick={() => setLocation('/devices')}
              variant="outline"
            >
              <Smartphone className="h-4 w-4 mr-2" />
              Devices
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* Account Balances Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(totalBalancesByCurrency).map(([currency, balance]) => (
            <Card key={currency}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Balance ({currency})
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(balance, currency)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all {currency} accounts
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Recent Income (30 days)
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                +{formatCurrency(recentIncome, 'USD')}
              </div>
              <p className="text-xs text-muted-foreground">
                From {recentGeneralTransactions.filter(t => t.type === 'income').length} transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Recent Expenses (30 days)
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                -{formatCurrency(recentExpenses, 'USD')}
              </div>
              <p className="text-xs text-muted-foreground">
                From {recentGeneralTransactions.filter(t => t.type === 'expense').length} transactions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Accounts by Category */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cash Accounts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-green-600" />
                Cash Accounts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {settings.bankAccounts
                .filter(account => account.type === "checking" || account.type === "savings")
                .map(account => {
                  const accountTransactions = generalTransactions.filter(t => 
                    t.toAccountId === account.id || t.fromAccountId === account.id
                  );
                  let balance = parseFloat(account.balance?.toString() || "0");
                  accountTransactions.forEach(transaction => {
                    const amount = parseFloat(transaction.amount);
                    if (transaction.type === 'income' && transaction.toAccountId === account.id) {
                      balance += amount;
                    } else if (transaction.type === 'expense' && transaction.toAccountId === account.id) {
                      balance -= amount;
                    } else if (transaction.type === 'transfer') {
                      if (transaction.toAccountId === account.id) {
                        balance += amount;
                      } else if (transaction.fromAccountId === account.id) {
                        balance -= amount;
                      }
                    }
                  });

                  return (
                    <div key={account.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: account.color }}
                        />
                        <span className="font-medium">{account.name}</span>
                      </div>
                      <span className="font-semibold">
                        {formatCurrency(balance, account.currency)}
                      </span>
                    </div>
                  );
                })}
            </CardContent>
          </Card>

          {/* Credit Accounts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                Credits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {settings.bankAccounts
                .filter(account => account.type === "credit")
                .map(account => {
                  const accountTransactions = generalTransactions.filter(t => 
                    t.toAccountId === account.id || t.fromAccountId === account.id
                  );
                  let balance = parseFloat(account.balance?.toString() || "0");
                  accountTransactions.forEach(transaction => {
                    const amount = parseFloat(transaction.amount);
                    if (transaction.type === 'income' && transaction.toAccountId === account.id) {
                      balance += amount;
                    } else if (transaction.type === 'expense' && transaction.toAccountId === account.id) {
                      balance -= amount;
                    } else if (transaction.type === 'transfer') {
                      if (transaction.toAccountId === account.id) {
                        balance += amount;
                      } else if (transaction.fromAccountId === account.id) {
                        balance -= amount;
                      }
                    }
                  });

                  return (
                    <div key={account.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: account.color }}
                        />
                        <span className="font-medium">{account.name}</span>
                      </div>
                      <span className="font-semibold">
                        {formatCurrency(balance, account.currency)}
                      </span>
                    </div>
                  );
                })}
            </CardContent>
          </Card>

          {/* Investment Accounts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                Investments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {settings.bankAccounts
                .filter(account => account.type === "investment")
                .map(account => {
                  const accountTransactions = generalTransactions.filter(t => 
                    t.toAccountId === account.id || t.fromAccountId === account.id
                  );
                  let balance = parseFloat(account.balance?.toString() || "0");
                  accountTransactions.forEach(transaction => {
                    const amount = parseFloat(transaction.amount);
                    if (transaction.type === 'income' && transaction.toAccountId === account.id) {
                      balance += amount;
                    } else if (transaction.type === 'expense' && transaction.toAccountId === account.id) {
                      balance -= amount;
                    } else if (transaction.type === 'transfer') {
                      if (transaction.toAccountId === account.id) {
                        balance += amount;
                      } else if (transaction.fromAccountId === account.id) {
                        balance -= amount;
                      }
                    }
                  });

                  return (
                    <div key={account.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: account.color }}
                        />
                        <span className="font-medium">{account.name}</span>
                      </div>
                      <span className="font-semibold">
                        {formatCurrency(balance, account.currency)}
                      </span>
                    </div>
                  );
                })}
            </CardContent>
          </Card>
        </div>

        {/* Module Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setLocation('/general')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-blue-600" />
                General Finances
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-2xl font-bold">{generalTransactions.length}</p>
                <p className="text-sm text-gray-600">Total transactions</p>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setLocation('/real-estate')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5 text-orange-600" />
                Real Estate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-2xl font-bold">{realEstateTransactions.length}</p>
                <p className="text-sm text-gray-600">Property transactions</p>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setLocation('/devices')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-green-600" />
                Device Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-2xl font-bold">{deviceTransactions.length}</p>
                <p className="text-sm text-gray-600">Device transactions</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
