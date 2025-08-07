import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Plus, Eye } from "lucide-react";
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
}

export default function AccountsSidebar({ 
  selectedAccountId, 
  onAccountSelect, 
  transactions,
  onAddTransaction 
}: AccountsSidebarProps) {
  const settings = useAppSettings();
  const [, setLocation] = useLocation();

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
          <Button onClick={onAddTransaction} size="sm" className="bg-primary hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        {/* All Accounts View */}
        <Card className={cn(
          "cursor-pointer transition-all hover:shadow-md",
          selectedAccountId === null ? "ring-2 ring-blue-500 bg-blue-50" : "hover:bg-white"
        )}>
          <CardContent 
            className="p-4"
            onClick={() => onAccountSelect(null)}
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Eye className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900">All Accounts</h4>
                <p className="text-sm text-gray-600">
                  View all recent transactions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

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