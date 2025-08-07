import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Plus, Eye, RefreshCw } from "lucide-react";
import { useAppSettings } from "@/components/settings/settings";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import type { GeneralTransaction } from "@shared/schema";

interface AccountsSidebarProps {
  selectedAccountId: string | null;
  onAccountSelect: (accountId: string | null) => void;
  transactions: GeneralTransaction[];
  onAddTransaction: () => void;
  onRefresh?: () => void;
}

export default function AccountsSidebar({ 
  selectedAccountId, 
  onAccountSelect, 
  transactions,
  onAddTransaction,
  onRefresh
}: AccountsSidebarProps) {
  const [, setLocation] = useLocation();
  const [refreshKey, setRefreshKey] = useState(0);

  // Get fresh settings on every render and when refreshKey changes
  const settings = useAppSettings();

  // Listen for account updates from settings
  useEffect(() => {
    const handleAccountsUpdated = () => {
      setRefreshKey(prev => prev + 1);
      // Force a complete re-render by triggering state change
      setTimeout(() => setRefreshKey(prev => prev + 1), 100);
    };
    
    window.addEventListener('accountsUpdated', handleAccountsUpdated);
    return () => window.removeEventListener('accountsUpdated', handleAccountsUpdated);
  }, []);

  // Force refresh when refreshKey changes
  useEffect(() => {
    if (refreshKey > 0) {
      // Settings should be re-read from localStorage
      const savedSettings = localStorage.getItem("appSettings");
      if (savedSettings) {
        // This will trigger a re-render
        window.dispatchEvent(new CustomEvent('settingsChanged'));
      }
    }
  }, [refreshKey]);

  const calculateAccountBalance = (accountId: string) => {
    const accountTransactions = transactions.filter(transaction => {
      if (transaction.type === 'transfer') {
        return transaction.fromAccountId === accountId || transaction.toAccountId === accountId;
      }
      return transaction.toAccountId === accountId;
    });

    const account = settings.bankAccounts.find(acc => acc.id === accountId);
    return accountTransactions.reduce((balance, transaction) => {
      if (transaction.type === 'transfer') {
        if (transaction.fromAccountId === accountId) {
          return balance - parseFloat(transaction.amount);
        } else if (transaction.toAccountId === accountId) {
          return balance + parseFloat(transaction.amount);
        }
      } else if (transaction.type === 'income') {
        return balance + parseFloat(transaction.amount);
      } else if (transaction.type === 'expense') {
        return balance - parseFloat(transaction.amount);
      }
      return balance;
    }, account?.balance || 0);
  };

  const getAccountTransactionCount = (accountId: string) => {
    return transactions.filter(transaction => {
      if (transaction.type === 'transfer') {
        return transaction.fromAccountId === accountId || transaction.toAccountId === accountId;
      }
      return transaction.toAccountId === accountId;
    }).length;
  };

  return (
    <div className="w-80 bg-gray-50 border-r border-gray-200 h-screen overflow-y-auto">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Accounts</h3>
          <div className="flex gap-2">
            {onRefresh && (
              <Button onClick={onRefresh} size="sm" variant="outline" className="p-2">
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
            <Button onClick={onAddTransaction} size="sm" className="bg-primary hover:bg-blue-700">
              Add Transaction
            </Button>
          </div>
        </div>



        {/* Individual Accounts */}
        <div className="space-y-3">
          {settings.bankAccounts.map((account) => {
            const balance = calculateAccountBalance(account.id);
            const transactionCount = getAccountTransactionCount(account.id);
            const isSelected = selectedAccountId === account.id;

            return (
              <Card 
                key={account.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  isSelected ? "ring-2 ring-blue-500 bg-blue-50" : "hover:bg-white"
                )}
              >
                <CardContent 
                  className="p-4"
                  onClick={() => onAccountSelect(account.id)}
                >
                  <div className="flex items-center space-x-3">
                    <div 
                      className="p-2 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: account.color }}
                    >
                      <CreditCard className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900 truncate">
                          {account.name}
                        </h4>
                        <span className="text-xs text-gray-500 capitalize bg-gray-100 px-2 py-1 rounded">
                          {account.type}
                        </span>
                      </div>
                      <div className="mt-1">
                        <p 
                          className="text-lg font-bold truncate" 
                          style={{ color: account.color }}
                        >
                          {formatCurrency(balance, account.currency)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {transactionCount} transaction{transactionCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Account Management */}
        <Card className="bg-white border-dashed border-2 border-gray-300">
          <CardContent className="p-4 text-center">
            <div className="space-y-2">
              <CreditCard className="h-8 w-8 text-gray-400 mx-auto" />
              <p className="text-sm text-gray-600">
                Need to add or manage accounts?
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => setLocation('/settings')}
              >
                Manage Accounts
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}