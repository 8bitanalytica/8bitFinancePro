import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Repeat, Play, Pause, Trash2, Edit } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { useAppSettings } from "@/components/settings/settings";

interface RecurringTransaction {
  id: number;
  name: string;
  type: "income" | "expense" | "transfer";
  amount: string;
  description: string;
  category: string;
  accountId?: string;
  frequency: string;
  intervalCount: number;
  startDate: string;
  endDate?: string;
  nextDueDate: string;
  isActive: boolean;

  currentOccurrence: number;
  module: string;
}

interface RecurringTransactionsListProps {
  onEdit?: (transaction: RecurringTransaction) => void;
}

export function RecurringTransactionsList({ onEdit }: RecurringTransactionsListProps) {
  const settings = useAppSettings();

  const { data: recurringTransactions = [] } = useQuery<RecurringTransaction[]>({
    queryKey: ['/api/recurring-transactions'],
  });

  const deleteRecurringTransaction = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/recurring-transactions/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recurring-transactions'] });
    }
  });

  const toggleRecurringTransaction = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const response = await fetch(`/api/recurring-transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      if (!response.ok) throw new Error('Failed to toggle');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recurring-transactions'] });
    }
  });

  const processRecurringTransaction = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/recurring-transactions/${id}/process`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to process');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recurring-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/general-transactions'] });
    }
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case "income": return "bg-green-100 text-green-800";
      case "expense": return "bg-red-100 text-red-800";
      case "transfer": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getFrequencyText = (frequency: string, intervalCount: number) => {
    const interval = intervalCount > 1 ? ` every ${intervalCount}` : '';
    switch (frequency) {
      case 'daily': return `Daily${intervalCount > 1 ? ` (${intervalCount} days)` : ''}`;
      case 'weekly': return `Weekly${intervalCount > 1 ? ` (${intervalCount} weeks)` : ''}`;
      case 'monthly': return `Monthly${intervalCount > 1 ? ` (${intervalCount} months)` : ''}`;
      case 'quarterly': return `Quarterly${intervalCount > 1 ? ` (${intervalCount} quarters)` : ''}`;
      case 'yearly': return `Yearly${intervalCount > 1 ? ` (${intervalCount} years)` : ''}`;
      default: return frequency;
    }
  };

  const getAccountCurrency = (accountId?: string) => {
    if (!accountId) return 'USD';
    const account = settings.bankAccounts.find(acc => acc.id === accountId);
    return account?.currency || 'USD';
  };

  if (recurringTransactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5" />
            Recurring Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-4">
            No recurring transactions set up yet. Create one by adding a transaction and enabling the recurring option.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Repeat className="h-5 w-5" />
          Recurring Transactions ({recurringTransactions.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {recurringTransactions.map((transaction: RecurringTransaction) => (
          <div
            key={transaction.id}
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-medium">{transaction.name}</h4>
                <Badge className={getTypeColor(transaction.type)}>
                  {transaction.type}
                </Badge>
                <Badge variant="outline">
                  {getFrequencyText(transaction.frequency, transaction.intervalCount)}
                </Badge>
                {!transaction.isActive && (
                  <Badge variant="secondary">Paused</Badge>
                )}
              </div>
              
              <div className="text-sm text-gray-600 space-y-1">
                <p>{transaction.description}</p>
                <div className="flex gap-4">
                  <span className="font-medium">
                    Amount: {formatCurrency(parseFloat(transaction.amount), getAccountCurrency(transaction.accountId))}
                  </span>
                  <span>Category: {transaction.category}</span>
                  <span>Next due: {new Date(transaction.nextDueDate).toLocaleDateString()}</span>
                </div>
                {transaction.endDate && (
                  <p className="text-xs">
                    Progress: {transaction.currentOccurrence}{transaction.endDate ? ` (ends ${new Date(transaction.endDate).toLocaleDateString()})` : ' (ongoing)'}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => processRecurringTransaction.mutate(transaction.id)}
                disabled={!transaction.isActive || processRecurringTransaction.isPending}
              >
                <Play className="h-4 w-4" />
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => toggleRecurringTransaction.mutate({
                  id: transaction.id,
                  isActive: !transaction.isActive
                })}
                disabled={toggleRecurringTransaction.isPending}
              >
                {transaction.isActive ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>

              {onEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(transaction)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={() => deleteRecurringTransaction.mutate(transaction.id)}
                disabled={deleteRecurringTransaction.isPending}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}