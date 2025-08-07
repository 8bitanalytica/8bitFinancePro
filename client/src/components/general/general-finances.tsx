import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { generalTransactionsApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, TrendingDown, Wallet, Edit, Trash2, Search, ArrowUpDown, ArrowDown, ArrowUp, Eye, ChevronDown, Copy, Repeat } from "lucide-react";
import { format, subDays } from "date-fns";
import TransactionModal from "@/components/modals/transaction-modal";
import { RecurringTransactionModal } from "@/components/modals/recurring-transaction-modal";
import { RecurringTransactionsList } from "@/components/recurring-transactions/recurring-transactions-list";
import AccountsSidebar from "@/components/general/accounts-sidebar";
import { useAppSettings } from "@/components/settings/settings";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { GeneralTransaction } from "@shared/schema";

export default function GeneralFinances() {
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<GeneralTransaction | undefined>();
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [visibleTransactions, setVisibleTransactions] = useState(30);
  const [activeTab, setActiveTab] = useState("transactions");
  const settings = useAppSettings();
  const { toast } = useToast();

  const { data: transactions = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/general-transactions"],
    queryFn: generalTransactionsApi.getAll,
  });

  // Dynamic calculations based on displayed transactions
  const displayedTransactions = useMemo(() => {
    let filtered = transactions;

    // Filter by selected account
    if (selectedAccountId) {
      filtered = filtered.filter(transaction => {
        if (transaction.type === 'transfer') {
          return transaction.fromAccountId === selectedAccountId || transaction.toAccountId === selectedAccountId;
        }
        return transaction.toAccountId === selectedAccountId;
      });
    } else {
      // Show last month only if no account selected
      const lastMonth = subDays(new Date(), 30);
      filtered = filtered.filter(t => new Date(t.date) >= lastMonth);
    }

    // Apply category and search filters
    filtered = filtered.filter(transaction => {
      const matchesCategory = !categoryFilter || categoryFilter === "all" || transaction.category === categoryFilter;
      const matchesSearch = !searchQuery || 
        transaction.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });

    // Sort by date (newest first)
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, selectedAccountId, categoryFilter, searchQuery]);

  // Dynamic statistics based on displayed transactions - now grouped by currency
  const statistics = useMemo(() => {
    // Group transactions by account currency
    const currencyGroups: Record<string, { income: number; expenses: number; transfers: number }> = {};
    
    displayedTransactions.forEach(transaction => {
      const amount = parseFloat(transaction.amount);
      
      if (transaction.type === "income" || transaction.type === "expense") {
        const account = settings.bankAccounts.find(acc => acc.id === transaction.toAccountId);
        const currency = account?.currency || 'USD';
        
        if (!currencyGroups[currency]) {
          currencyGroups[currency] = { income: 0, expenses: 0, transfers: 0 };
        }
        
        if (transaction.type === "income") {
          currencyGroups[currency].income += amount;
        } else {
          currencyGroups[currency].expenses += amount;
        }
      } else if (transaction.type === "transfer") {
        const fromAccount = settings.bankAccounts.find(acc => acc.id === transaction.fromAccountId);
        const currency = fromAccount?.currency || 'USD';
        
        if (!currencyGroups[currency]) {
          currencyGroups[currency] = { income: 0, expenses: 0, transfers: 0 };
        }
        currencyGroups[currency].transfers += amount;
      }
    });

    // Calculate totals for legacy compatibility (using USD equivalent or primary currency)
    const primaryCurrency = Object.keys(currencyGroups)[0] || 'USD';
    const primaryStats = currencyGroups[primaryCurrency] || { income: 0, expenses: 0, transfers: 0 };
    
    const totalIncome = primaryStats.income;
    const totalExpenses = primaryStats.expenses;
    const totalTransfers = primaryStats.transfers;
    const netBalance = totalIncome - totalExpenses;

    return { 
      totalIncome, 
      totalExpenses, 
      totalTransfers, 
      netBalance, 
      currencyGroups,
      primaryCurrency 
    };
  }, [displayedTransactions, settings.bankAccounts]);

  const visibleTransactionsList = displayedTransactions.slice(0, visibleTransactions);
  const hasMoreTransactions = displayedTransactions.length > visibleTransactions;

  const handleAddTransaction = () => {
    setEditingTransaction(undefined);
    setShowModal(true);
  };

  const handleEditTransaction = (transaction: GeneralTransaction) => {
    setEditingTransaction(transaction);
    setShowModal(true);
  };

  const handleDeleteTransaction = async (transaction: GeneralTransaction) => {
    if (confirm(`Are you sure you want to delete this transaction: "${transaction.description}"?`)) {
      try {
        await generalTransactionsApi.delete(transaction.id);
        toast({ title: "Transaction deleted successfully" });
        refetch();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete transaction. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleDuplicateTransaction = (transaction: GeneralTransaction) => {
    // Create a copy of the transaction with current date and time, remove the ID
    const now = new Date();
    const duplicatedTransaction = {
      ...transaction,
      date: now.toISOString(), // Current date and time
      id: undefined, // Remove ID so it creates a new transaction
    };
    setEditingTransaction(duplicatedTransaction as any);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingTransaction(undefined);
    refetch();
  };

  const handleAccountSelect = (accountId: string | null) => {
    setSelectedAccountId(accountId);
    setVisibleTransactions(30); // Reset visible transactions when changing account
  };

  const loadMoreTransactions = () => {
    setVisibleTransactions(prev => prev + 30);
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
      device: "bg-indigo-100 text-indigo-800",
    };
    return colors[category.toLowerCase()] || "bg-gray-100 text-gray-800";
  };

  const getTransactionIcon = (transaction: GeneralTransaction) => {
    if (transaction.type === "income") return <ArrowDown className="h-4 w-4 text-green-600" />;
    if (transaction.type === "expense") return <ArrowUp className="h-4 w-4 text-red-600" />;
    return <ArrowUpDown className="h-4 w-4 text-blue-600" />;
  };

  const getTransactionDirection = (transaction: GeneralTransaction) => {
    if (transaction.type !== 'transfer' || !selectedAccountId) return null;
    
    if (transaction.fromAccountId === selectedAccountId) {
      return { direction: 'out', label: 'To', accountId: transaction.toAccountId };
    } else if (transaction.toAccountId === selectedAccountId) {
      return { direction: 'in', label: 'From', accountId: transaction.fromAccountId };
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Accounts Sidebar */}
      <AccountsSidebar
        selectedAccountId={selectedAccountId}
        onAccountSelect={handleAccountSelect}
        transactions={transactions}
        onAddTransaction={handleAddTransaction}
        onRefresh={() => {
          // Trigger a custom event to notify that accounts should be refreshed
          window.dispatchEvent(new CustomEvent('accountsUpdated'));
        }}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedAccountId 
                    ? settings.bankAccounts.find(acc => acc.id === selectedAccountId)?.name || "Account"
                    : "All Accounts"
                  }
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedAccountId 
                    ? "View all transactions for this account"
                    : "Recent transactions from all accounts (last 30 days)"
                  }
                </p>
              </div>
            </div>

            {/* Statistics Cards - Multi-Currency Support */}
            {selectedAccountId ? (
              // Single account view - show stats in account's currency
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {(() => {
                  const selectedAccount = settings.bankAccounts.find(acc => acc.id === selectedAccountId);
                  const currency = selectedAccount?.currency || 'USD';
                  const currencySymbol = formatCurrency(0, currency).replace(/[\d.,\s]/g, '');
                  
                  return (
                    <>
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center">
                            <TrendingUp className="h-8 w-8 text-green-600" />
                            <div className="ml-4">
                              <p className="text-sm font-medium text-gray-600">Total Income ({currency})</p>
                              <p className="text-2xl font-bold text-green-600">
                                {formatCurrency(statistics.totalIncome, currency)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center">
                            <TrendingDown className="h-8 w-8 text-red-600" />
                            <div className="ml-4">
                              <p className="text-sm font-medium text-gray-600">Total Expenses ({currency})</p>
                              <p className="text-2xl font-bold text-red-600">
                                {formatCurrency(statistics.totalExpenses, currency)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center">
                            <ArrowUpDown className="h-8 w-8 text-blue-600" />
                            <div className="ml-4">
                              <p className="text-sm font-medium text-gray-600">Transfers ({currency})</p>
                              <p className="text-2xl font-bold text-blue-600">
                                {formatCurrency(statistics.totalTransfers, currency)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center">
                            <Wallet className={`h-8 w-8 ${statistics.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                            <div className="ml-4">
                              <p className="text-sm font-medium text-gray-600">Net Balance ({currency})</p>
                              <p className={`text-2xl font-bold ${statistics.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(statistics.netBalance, currency)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  );
                })()}
              </div>
            ) : (
              // All accounts view - Dashboard with multi-currency statistics and recent transactions
              <div className="space-y-8">
                {/* Dashboard Header */}
                <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Financial Dashboard</h3>
                    <p className="text-sm text-gray-600 mt-1">Overview of all your accounts and recent activity</p>
                  </div>
                  <div className="text-sm text-gray-500">
                    Last 30 days • {displayedTransactions.length} transactions
                  </div>
                </div>

                {/* Multi-Currency Statistics */}
                <div className="space-y-6">
                  {Object.entries(statistics.currencyGroups).map(([currency, stats]) => (
                    <div key={currency} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                          <span className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm mr-3">
                            {currency}
                          </span>
                          {currency} Portfolio
                        </h4>
                        <div className="text-sm text-gray-500">
                          {settings.bankAccounts.filter(acc => acc.currency === currency).length} account{settings.bankAccounts.filter(acc => acc.currency === currency).length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="border-l-4 border-l-green-500">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-600">Total Income</p>
                                <p className="text-xl font-bold text-green-600">
                                  {formatCurrency(stats.income, currency)}
                                </p>
                              </div>
                              <TrendingUp className="h-6 w-6 text-green-600" />
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-red-500">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                                <p className="text-xl font-bold text-red-600">
                                  {formatCurrency(stats.expenses, currency)}
                                </p>
                              </div>
                              <TrendingDown className="h-6 w-6 text-red-600" />
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="border-l-4 border-l-blue-500">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-600">Total Transfers</p>
                                <p className="text-xl font-bold text-blue-600">
                                  {formatCurrency(stats.transfers, currency)}
                                </p>
                              </div>
                              <ArrowUpDown className="h-6 w-6 text-blue-600" />
                            </div>
                          </CardContent>
                        </Card>

                        <Card className={`border-l-4 ${(stats.income - stats.expenses) >= 0 ? 'border-l-green-500' : 'border-l-red-500'}`}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-600">Net Balance</p>
                                <p className={`text-xl font-bold ${(stats.income - stats.expenses) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatCurrency(stats.income - stats.expenses, currency)}
                                </p>
                              </div>
                              <Wallet className={`h-6 w-6 ${(stats.income - stats.expenses) >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Recent Transactions Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-gray-900">Recent Transactions</h4>
                    <div className="text-sm text-gray-500">
                      Last 30 transactions from all accounts
                    </div>
                  </div>
                  
                  <Card>
                    <CardContent className="p-0">
                      <div className="divide-y divide-gray-200">
                        {displayedTransactions.slice(0, 30).map((transaction) => {
                          const account = settings.bankAccounts.find(acc => 
                            acc.id === transaction.toAccountId || acc.id === transaction.fromAccountId
                          );
                          const fromAccount = transaction.type === 'transfer' 
                            ? settings.bankAccounts.find(acc => acc.id === transaction.fromAccountId)
                            : null;
                          const toAccount = transaction.type === 'transfer' 
                            ? settings.bankAccounts.find(acc => acc.id === transaction.toAccountId)
                            : account;

                          return (
                            <div key={transaction.id} className="p-4 hover:bg-gray-50 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <div className={`p-2 rounded-full ${
                                    transaction.type === 'income' ? 'bg-green-100 text-green-600' :
                                    transaction.type === 'expense' ? 'bg-red-100 text-red-600' :
                                    'bg-blue-100 text-blue-600'
                                  }`}>
                                    {transaction.type === 'income' ? <TrendingUp className="h-4 w-4" /> :
                                     transaction.type === 'expense' ? <TrendingDown className="h-4 w-4" /> :
                                     <ArrowUpDown className="h-4 w-4" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2">
                                      <p className="text-sm font-medium text-gray-900 capitalize">
                                        {transaction.type}
                                      </p>
                                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                        {transaction.category}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-600 truncate mt-1">
                                      {transaction.description}
                                    </p>
                                    <div className="flex items-center space-x-2 mt-1">
                                      {transaction.type === 'transfer' ? (
                                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                                          <span>{fromAccount?.name}</span>
                                          <ArrowUpDown className="h-3 w-3" />
                                          <span>{toAccount?.name}</span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center space-x-2">
                                          <div 
                                            className="w-3 h-3 rounded-full border border-white shadow-sm"
                                            style={{ backgroundColor: account?.color }}
                                          />
                                          <span className="text-xs text-gray-500">{account?.name}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className={`text-sm font-semibold ${
                                    transaction.type === 'income' ? 'text-green-600' :
                                    transaction.type === 'expense' ? 'text-red-600' :
                                    'text-blue-600'
                                  }`}>
                                    {transaction.type === 'expense' ? '-' : '+'}
                                    {formatCurrency(parseFloat(transaction.amount), toAccount?.currency || 'USD')}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {format(new Date(transaction.date), 'MMM dd, HH:mm')}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {Object.keys(statistics.currencyGroups).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No transactions found for the selected period</p>
                  </div>
                )}
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab("transactions")}
                  className={cn(
                    "py-2 px-1 border-b-2 font-medium text-sm",
                    activeTab === "transactions"
                      ? "border-primary text-primary"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  )}
                >
                  Transactions
                </button>
                <button
                  onClick={() => setActiveTab("recurring")}
                  className={cn(
                    "py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2",
                    activeTab === "recurring"
                      ? "border-primary text-primary"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  )}
                >
                  <Repeat className="h-4 w-4" />
                  Recurring Transactions
                </button>
              </nav>
            </div>

            {activeTab === "transactions" && (
              <>
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search transactions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {settings.generalCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {activeTab === "transactions" && (
              <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Transactions</CardTitle>
                  <div className="text-sm text-gray-500">
                    Showing {visibleTransactionsList.length} of {displayedTransactions.length} transactions
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {visibleTransactionsList.length === 0 ? (
                  <div className="text-center py-8">
                    <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No transactions found</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {selectedAccountId ? "This account has no transactions" : "Try adjusting your filters"}
                    </p>
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date & Time</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Account</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visibleTransactionsList.map((transaction) => {
                          const transferDirection = getTransactionDirection(transaction);
                          const relatedAccount = transferDirection?.accountId 
                            ? settings.bankAccounts.find(acc => acc.id === transferDirection.accountId)
                            : null;

                          return (
                            <TableRow key={transaction.id}>
                              <TableCell className="font-medium">
                                <div className="flex flex-col">
                                  <span>{format(new Date(transaction.date), "MMM dd, yyyy")}</span>
                                  <span className="text-xs text-gray-500">{format(new Date(transaction.date), "HH:mm")}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {getTransactionIcon(transaction)}
                                  <span className="capitalize">{transaction.type}</span>
                                </div>
                              </TableCell>
                              <TableCell>{transaction.description}</TableCell>
                              <TableCell>
                                <Badge className={getCategoryBadgeColor(transaction.category)}>
                                  {transaction.category}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className={cn(
                                  "font-medium",
                                  transaction.type === "income" ? "text-green-600" : 
                                  transaction.type === "expense" ? "text-red-600" : "text-blue-600"
                                )}>
                                  {transaction.type === "expense" ? "-" : "+"}
                                  {(() => {
                                    const account = transaction.toAccountId 
                                      ? settings.bankAccounts.find(acc => acc.id === transaction.toAccountId)
                                      : (transaction.fromAccountId 
                                          ? settings.bankAccounts.find(acc => acc.id === transaction.fromAccountId)
                                          : settings.bankAccounts[0]);
                                    return formatCurrency(parseFloat(transaction.amount), account?.currency || "USD");
                                  })()}
                                </span>
                              </TableCell>
                              <TableCell>
                                {transaction.type === 'transfer' && transferDirection ? (
                                  <div className="text-sm">
                                    <span className="text-gray-500">{transferDirection.label}: </span>
                                    <span className="font-medium">{relatedAccount?.name || 'Unknown'}</span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-600">
                                    {settings.bankAccounts.find(acc => acc.id === transaction.toAccountId)?.name || 'Unknown'}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center gap-1 justify-end">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditTransaction(transaction)}
                                    title="Edit transaction"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDuplicateTransaction(transaction)}
                                    title="Duplicate transaction"
                                    className="text-blue-600 hover:text-blue-700"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteTransaction(transaction)}
                                    title="Delete transaction"
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>

                    {/* Load More Button */}
                    {hasMoreTransactions && (
                      <div className="mt-6 text-center">
                        <Button 
                          variant="outline" 
                          onClick={loadMoreTransactions}
                          className="w-full sm:w-auto"
                        >
                          <ChevronDown className="h-4 w-4 mr-2" />
                          Load More Transactions ({displayedTransactions.length - visibleTransactions} remaining)
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
              </Card>
            )}

            {activeTab === "recurring" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Recurring Transactions</h3>
                  <RecurringTransactionModal 
                    module="general"
                    trigger={
                      <Button>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Recurring Transaction
                      </Button>
                    }
                  />
                </div>
                <RecurringTransactionsList module="general" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transaction Modal */}
      {showModal && (
        <TransactionModal
          onClose={handleModalClose}
          transaction={editingTransaction}
          selectedAccountId={selectedAccountId || undefined}
          type="general"
        />
      )}
    </div>
  );
}