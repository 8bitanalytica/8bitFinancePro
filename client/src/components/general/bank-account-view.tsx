import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { generalTransactionsApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Edit, Trash2, ArrowUpDown, ArrowDown, ArrowUp } from "lucide-react";
import { format } from "date-fns";
import TransactionModal from "@/components/modals/transaction-modal";
import { useAppSettings } from "@/components/settings/settings";
import { formatCurrency } from "@/lib/currency";
import type { GeneralTransaction } from "@shared/schema";

interface BankAccountViewProps {
  accountId: string;
  onBack: () => void;
}

export default function BankAccountView({ accountId, onBack }: BankAccountViewProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<GeneralTransaction | undefined>();
  const settings = useAppSettings();

  const account = settings.bankAccounts.find(acc => acc.id === accountId);

  const { data: allTransactions = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/general-transactions"],
    queryFn: generalTransactionsApi.getAll,
  });

  // Filter transactions for this specific account
  const accountTransactions = allTransactions.filter(transaction => {
    // For transfers, show transactions where this account is involved
    if (transaction.type === 'transfer') {
      return transaction.fromAccountId === accountId || transaction.toAccountId === accountId;
    }
    // For regular transactions, show where this account is the target
    return transaction.toAccountId === accountId;
  });

  // Calculate account balance
  const accountBalance = accountTransactions.reduce((balance, transaction) => {
    if (transaction.type === 'transfer') {
      if (transaction.fromAccountId === accountId) {
        // Money going out
        return balance - parseFloat(transaction.amount);
      } else if (transaction.toAccountId === accountId) {
        // Money coming in
        return balance + parseFloat(transaction.amount);
      }
    } else if (transaction.type === 'income') {
      return balance + parseFloat(transaction.amount);
    } else if (transaction.type === 'expense') {
      return balance - parseFloat(transaction.amount);
    }
    return balance;
  }, account?.balance || 0);

  const handleAddTransaction = () => {
    setEditingTransaction(undefined);
    setShowModal(true);
  };

  const handleEditTransaction = (transaction: GeneralTransaction) => {
    setEditingTransaction(transaction);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingTransaction(undefined);
    refetch();
  };

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      salary: "bg-green-100 text-green-800",
      freelance: "bg-green-100 text-green-800",
      utilities: "bg-yellow-100 text-yellow-800",
      food: "bg-blue-100 text-blue-800",
      entertainment: "bg-purple-100 text-purple-800",
      transportation: "bg-orange-100 text-orange-800",
      healthcare: "bg-red-100 text-red-800",
      transfer: "bg-blue-100 text-blue-800",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  const getTransactionIcon = (transaction: GeneralTransaction) => {
    if (transaction.type === 'transfer') {
      if (transaction.fromAccountId === accountId) {
        return <ArrowUp className="h-4 w-4 text-red-500" />;
      } else {
        return <ArrowDown className="h-4 w-4 text-green-500" />;
      }
    } else if (transaction.type === 'income') {
      return <ArrowDown className="h-4 w-4 text-green-500" />;
    } else {
      return <ArrowUp className="h-4 w-4 text-red-500" />;
    }
  };

  const getTransactionDescription = (transaction: GeneralTransaction) => {
    if (transaction.type === 'transfer') {
      const fromAccount = settings.bankAccounts.find(acc => acc.id === transaction.fromAccountId);
      const toAccount = settings.bankAccounts.find(acc => acc.id === transaction.toAccountId);
      
      if (transaction.fromAccountId === accountId) {
        return `Transfer to ${toAccount?.name || 'Unknown Account'}`;
      } else {
        return `Transfer from ${fromAccount?.name || 'Unknown Account'}`;
      }
    }
    return transaction.description;
  };

  if (!account) {
    return (
      <div className="p-6">
        <p className="text-red-500">Account not found</p>
        <Button onClick={onBack} variant="outline" className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button onClick={onBack} variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{account.name}</h2>
            <p className="text-sm text-gray-600 capitalize">{account.type} Account</p>
          </div>
        </div>
        <Button onClick={handleAddTransaction} className="bg-primary hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" />
          Add Transaction
        </Button>
      </div>

      {/* Account Balance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Account Balance</span>
            <div 
              className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
              style={{ backgroundColor: account.color }}
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold" style={{ color: account.color }}>
            {formatCurrency(accountBalance)}
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {accountTransactions.length} transaction{accountTransactions.length !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">Loading transactions...</div>
            </div>
          ) : accountTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No transactions found for this account
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accountTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {getTransactionIcon(transaction)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {getTransactionDescription(transaction)}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary" 
                        className={getCategoryBadgeColor(transaction.category)}
                      >
                        {transaction.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {format(new Date(transaction.date), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <span className={
                        transaction.type === 'transfer' 
                          ? (transaction.fromAccountId === accountId ? 'text-red-600' : 'text-green-600')
                          : transaction.type === 'income' 
                            ? 'text-green-600' 
                            : 'text-red-600'
                      }>
                        {transaction.type === 'transfer' && transaction.fromAccountId === accountId ? '-' : '+'}
                        {formatCurrency(parseFloat(transaction.amount))}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditTransaction(transaction)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Transaction Modal */}
      {showModal && (
        <TransactionModal
          transaction={editingTransaction}
          onClose={handleModalClose}
          type="general"
          selectedAccountId={accountId}
        />
      )}
    </div>
  );
}