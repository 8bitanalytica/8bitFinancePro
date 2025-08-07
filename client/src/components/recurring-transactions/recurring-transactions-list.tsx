import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  Edit, 
  Trash2, 
  Play, 
  Pause, 
  Calendar, 
  Repeat, 
  DollarSign,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { RecurringTransaction } from "@shared/schema";
import { RecurringTransactionModal } from "@/components/modals/recurring-transaction-modal";

interface RecurringTransactionsListProps {
  module: string;
}

export function RecurringTransactionsList({ module }: RecurringTransactionsListProps) {
  const [editingTransaction, setEditingTransaction] = useState<RecurringTransaction | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: recurringTransactions = [], isLoading } = useQuery<RecurringTransaction[]>({
    queryKey: ["/api/recurring-transactions", { module }],
    queryFn: async () => {
      const response = await fetch(`/api/recurring-transactions?module=${module}`);
      if (!response.ok) throw new Error("Failed to fetch recurring transactions");
      return response.json();
    },
  });

  const { data: dueTransactions = [] } = useQuery<RecurringTransaction[]>({
    queryKey: ["/api/recurring-transactions/due"],
    queryFn: async () => {
      const response = await fetch("/api/recurring-transactions/due");
      if (!response.ok) throw new Error("Failed to fetch due transactions");
      return response.json();
    },
    refetchInterval: 60000, // Check every minute
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const response = await fetch(`/api/recurring-transactions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!response.ok) throw new Error("Failed to update recurring transaction");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recurring-transactions"] });
      toast({
        title: "Success",
        description: "Recurring transaction updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update recurring transaction",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/recurring-transactions/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete recurring transaction");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recurring-transactions"] });
      toast({
        title: "Success",
        description: "Recurring transaction deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete recurring transaction",
        variant: "destructive",
      });
    },
  });

  const processMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/recurring-transactions/${id}/process`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to process recurring transaction");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recurring-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/general-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/real-estate-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/device-transactions"] });
      toast({
        title: "Success",
        description: "Transaction processed successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to process transaction",
        variant: "destructive",
      });
    },
  });

  const processAllDueMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/recurring-transactions/process-due", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to process due transactions");
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/recurring-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/general-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/real-estate-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/device-transactions"] });
      toast({
        title: "Success",
        description: `Processed ${result.processed} out of ${result.total} due transactions`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to process due transactions",
        variant: "destructive",
      });
    },
  });

  const getFrequencyLabel = (frequency: string, intervalCount: number = 1) => {
    const interval = intervalCount > 1 ? `Every ${intervalCount} ` : "";
    switch (frequency) {
      case "daily":
        return `${interval}${intervalCount > 1 ? "days" : "Daily"}`;
      case "weekly":
        return `${interval}${intervalCount > 1 ? "weeks" : "Weekly"}`;
      case "monthly":
        return `${interval}${intervalCount > 1 ? "months" : "Monthly"}`;
      case "quarterly":
        return `${interval}${intervalCount > 1 ? "quarters" : "Quarterly"}`;
      case "yearly":
        return `${interval}${intervalCount > 1 ? "years" : "Yearly"}`;
      default:
        return frequency;
    }
  };

  const getStatusBadge = (transaction: RecurringTransaction) => {
    if (!transaction.isActive) {
      return <Badge variant="secondary">Inactive</Badge>;
    }

    const nextDue = new Date(transaction.nextDueDate);
    const today = new Date();
    const isDue = nextDue <= today;

    if (isDue) {
      return <Badge variant="destructive">Due</Badge>;
    }

    return <Badge variant="default">Active</Badge>;
  };

  const isDue = (transaction: RecurringTransaction) => {
    const nextDue = new Date(transaction.nextDueDate);
    const today = new Date();
    return nextDue <= today && transaction.isActive;
  };

  const moduleDueTransactions = dueTransactions.filter(t => t.module === module);

  if (isLoading) {
    return <div className="text-center py-8">Loading recurring transactions...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Due transactions alert */}
      {moduleDueTransactions.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertCircle className="h-5 w-5" />
              {moduleDueTransactions.length} Transaction{moduleDueTransactions.length > 1 ? 's' : ''} Due
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-sm text-orange-700">
                You have {moduleDueTransactions.length} recurring transaction{moduleDueTransactions.length > 1 ? 's' : ''} ready to be processed.
              </p>
              <Button
                size="sm"
                onClick={() => processAllDueMutation.mutate()}
                disabled={processAllDueMutation.isPending}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Process All
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recurring transactions list */}
      <div className="grid gap-4">
        {recurringTransactions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No recurring transactions found for this module.
            </CardContent>
          </Card>
        ) : (
          recurringTransactions.map((transaction) => (
            <Card key={transaction.id} className={`${isDue(transaction) ? 'border-orange-200 bg-orange-50' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg">{transaction.name}</CardTitle>
                      {getStatusBadge(transaction)}
                    </div>
                    <p className="text-sm text-muted-foreground">{transaction.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={transaction.isActive}
                      onCheckedChange={(checked) =>
                        toggleActiveMutation.mutate({ id: transaction.id, isActive: checked })
                      }
                      disabled={toggleActiveMutation.isPending}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingTransaction(transaction)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(transaction.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">
                        {parseFloat(transaction.amount).toLocaleString('en-US', {
                          style: 'currency',
                          currency: 'USD'
                        })}
                      </div>
                      <div className="text-muted-foreground capitalize">
                        {transaction.type}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Repeat className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">
                        {getFrequencyLabel(transaction.frequency, transaction.intervalCount)}
                      </div>
                      <div className="text-muted-foreground">
                        {transaction.category}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">
                        {format(new Date(transaction.nextDueDate), "MMM dd, yyyy")}
                      </div>
                      <div className="text-muted-foreground">Next due</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-muted-foreground">
                      {transaction.totalOccurrences ? (
                        <div>
                          <div className="font-medium">
                            {transaction.currentOccurrence}/{transaction.totalOccurrences}
                          </div>
                          <div className="text-muted-foreground">Occurrences</div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-medium">∞</div>
                          <div className="text-muted-foreground">Infinite</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {isDue(transaction) && (
                  <div className="mt-4 pt-4 border-t">
                    <Button
                      size="sm"
                      onClick={() => processMutation.mutate(transaction.id)}
                      disabled={processMutation.isPending}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Process Now
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Modal */}
      {editingTransaction && (
        <RecurringTransactionModal
          transaction={editingTransaction}
          module={module}
          onClose={() => setEditingTransaction(null)}
          trigger={<div />} // Hidden trigger since we control open state
        />
      )}
    </div>
  );
}