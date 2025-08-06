import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { generalTransactionsApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, TrendingDown, Wallet, Edit, Trash2, Search, ArrowUpDown, ArrowDown, ArrowUp, CreditCard } from "lucide-react";
import { format, subDays } from "date-fns";
import TransactionModal from "@/components/modals/transaction-modal";
import BankAccountView from "./bank-account-view";
import { useAppSettings } from "@/components/settings/settings";
import { formatCurrency } from "@/lib/currency";
import type { GeneralTransaction } from "@shared/schema";

export default function GeneralFinances() {
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<GeneralTransaction | undefined>();
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<"overview" | "account">("overview");
  const settings = useAppSettings();

  const { data: transactions = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/general-transactions"],
    queryFn: generalTransactionsApi.getAll,
  });

  // Filter transactions for last month (overview)
  const lastMonth = subDays(new Date(), 30);
  const recentTransactions = transactions.filter(t => 
    new Date(t.date) >= lastMonth
  );

  const filteredTransactions = recentTransactions.filter(transaction => {
    const matchesCategory = !categoryFilter || categoryFilter === "all" || transaction.category === categoryFilter;
    const matchesSearch = !searchQuery || 
      transaction.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalIncome = transactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const totalExpenses = transactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const totalTransfers = transactions
    .filter(t => t.type === "transfer")
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const netBalance = totalIncome - totalExpenses;

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

  const handleAccountClick = (accountId: string) => {
    setSelectedAccountId(accountId);
    setCurrentView("account");
  };

  const handleBackToOverview = () => {
    setCurrentView("overview");
    setSelectedAccountId(null);
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
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show specific account view
  if (currentView === "account" && selectedAccountId) {
    return (
      <BankAccountView 
        accountId={selectedAccountId} 
        onBack={handleBackToOverview} 
      />
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="surface border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">General Finances</h2>
            <p className="text-sm text-gray-600 mt-1">Manage your personal income and expenses</p>
          </div>
          <Button onClick={handleAddTransaction} className="bg-primary hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" />
            Add Transaction
          </Button>
        </div>
      </div>

      <div className="p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Income</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
                  <p className="text-sm text-gray-500 mt-1">All time</p>
                </div>
                <div className="p-3 bg-green-50 rounded-full">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
                  <p className="text-sm text-gray-500 mt-1">All time</p>
                </div>
                <div className="p-3 bg-red-50 rounded-full">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Transfers</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalTransfers)}</p>
                  <p className="text-sm text-gray-500 mt-1">All time</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-full">
                  <ArrowUpDown className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Net Balance</p>
                  <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(netBalance)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">All time</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-full">
                  <Wallet className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bank Accounts - Clickable */}
        {settings.bankAccounts && settings.bankAccounts.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Bank Accounts
              </CardTitle>
              <p className="text-sm text-gray-600">Click on an account to view its transactions</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {settings.bankAccounts.map((account) => {
                  // Calculate balance for each account based on transactions
                  const accountTransactions = transactions.filter(transaction => {
                    if (transaction.type === 'transfer') {
                      return transaction.fromAccountId === account.id || transaction.toAccountId === account.id;
                    }
                    return transaction.toAccountId === account.id;
                  });

                  const calculatedBalance = accountTransactions.reduce((balance, transaction) => {
                    if (transaction.type === 'transfer') {
                      if (transaction.fromAccountId === account.id) {
                        return balance - parseFloat(transaction.amount);
                      } else if (transaction.toAccountId === account.id) {
                        return balance + parseFloat(transaction.amount);
                      }
                    } else if (transaction.type === 'income') {
                      return balance + parseFloat(transaction.amount);
                    } else if (transaction.type === 'expense') {
                      return balance - parseFloat(transaction.amount);
                    }
                    return balance;
                  }, account.balance || 0);

                  return (
                    <div
                      key={account.id}
                      onClick={() => handleAccountClick(account.id)}
                      className="border rounded-lg p-4 space-y-3 bg-white hover:bg-gray-50 cursor-pointer transition-colors shadow-sm hover:shadow-md"
                      style={{ borderLeft: `4px solid ${account.color}` }}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900">{account.name}</h4>
                        <span className="text-xs text-gray-500 capitalize bg-gray-100 px-2 py-1 rounded">
                          {account.type}
                        </span>
                      </div>
                      <div>
                        <p className="text-2xl font-bold" style={{ color: account.color }}>
                          {formatCurrency(calculatedBalance)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {accountTransactions.length} transaction{accountTransactions.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="flex items-center text-xs text-gray-400">
                        <span>Click to view details</span>
                        <ArrowUpDown className="h-3 w-3 ml-1" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="utilities">Utilities</SelectItem>
                    <SelectItem value="food">Food & Dining</SelectItem>
                    <SelectItem value="entertainment">Entertainment</SelectItem>
                    <SelectItem value="transportation">Transportation</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="salary">Salary</SelectItem>
                    <SelectItem value="freelance">Freelance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card>
          <CardContent className="p-0">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Recent Transactions (Last 30 Days)</h3>
              <p className="text-sm text-gray-600 mt-1">
                Showing {filteredTransactions.length} transactions from all accounts
              </p>
            </div>
            
            {filteredTransactions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No transactions found.</p>
                <Button onClick={handleAddTransaction} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Add your first transaction
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(transaction.date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell>
                          <Badge className={`${getCategoryBadgeColor(transaction.category)} border-0`}>
                            {transaction.category}
                          </Badge>
                        </TableCell>
                        <TableCell className={`font-medium ${
                          transaction.type === 'income' ? 'text-secondary' : 'text-destructive'
                        }`}>
                          {transaction.type === 'income' ? '+' : '-'}${transaction.amount}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditTransaction(transaction)}
                              className="text-primary hover:text-blue-700"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                generalTransactionsApi.delete(transaction.id).then(() => refetch());
                              }}
                              className="text-destructive hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showModal && (
        <TransactionModal
          transaction={editingTransaction}
          onClose={handleModalClose}
          type="general"
        />
      )}
    </div>
  );
}
