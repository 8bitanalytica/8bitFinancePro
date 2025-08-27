import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { generalTransactionsApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, TrendingDown, Wallet, Edit, Trash2, Search, ArrowUpDown, ArrowDown, ArrowUp, Eye, ChevronDown, Copy, Repeat, Clock, PieChart, CreditCard, DollarSign, PiggyBank, Landmark, Bitcoin, Users, Smartphone, Building, Play } from "lucide-react";
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
  const [dateFilter, setDateFilter] = useState<string>("all");
  const settings = useAppSettings();
  const { toast } = useToast();

  const { data: transactions = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/general-transactions"],
    queryFn: generalTransactionsApi.getAll,
  });

  const { data: dueRecurringTransactions = [] } = useQuery({
    queryKey: ["/api/recurring-transactions/due"],
    queryFn: async () => {
      const response = await fetch('/api/recurring-transactions/due');
      return response.json();
    },
  });

  const { data: recurringTransactions = [] } = useQuery({
    queryKey: ['/api/recurring-transactions'],
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

    // Apply category, search and date filters
    filtered = filtered.filter(transaction => {
      const matchesCategory = !categoryFilter || categoryFilter === "all" || transaction.category === categoryFilter;
      const matchesSearch = !searchQuery || 
        transaction.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Date filter logic
      let matchesDate = true;
      if (dateFilter !== "all") {
        const transactionDate = new Date(transaction.date);
        const now = new Date();
        
        if (dateFilter === "this-month") {
          matchesDate = transactionDate.getMonth() === now.getMonth() && 
                       transactionDate.getFullYear() === now.getFullYear();
        } else if (dateFilter === "last-month") {
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          matchesDate = transactionDate.getMonth() === lastMonth.getMonth() && 
                       transactionDate.getFullYear() === lastMonth.getFullYear();
        } else if (dateFilter === "this-year") {
          matchesDate = transactionDate.getFullYear() === now.getFullYear();
        } else if (dateFilter === "last-year") {
          matchesDate = transactionDate.getFullYear() === now.getFullYear() - 1;
        } else if (dateFilter.includes("-")) {
          // Format: "2024-08" for specific month-year
          const [year, month] = dateFilter.split("-").map(Number);
          matchesDate = transactionDate.getFullYear() === year && 
                       transactionDate.getMonth() === month - 1;
        }
      }
      
      return matchesCategory && matchesSearch && matchesDate;
    });

    // Sort by date (newest first)
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, selectedAccountId, categoryFilter, searchQuery, dateFilter]);

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

  const handleDuplicateTransaction = async (transaction: GeneralTransaction) => {
    try {
      const now = new Date();
      const duplicatedTransaction = {
        type: transaction.type,
        amount: transaction.amount,
        description: `${transaction.description} (Copy)`,
        category: transaction.category,
        date: now,
        toAccountId: transaction.toAccountId || null,
        fromAccountId: transaction.fromAccountId || null,
        receiptUrl: null,
      };
      
      await generalTransactionsApi.create(duplicatedTransaction);
      toast({ title: "Transaction duplicated successfully" });
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to duplicate transaction",
        variant: "destructive",
      });
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingTransaction(undefined);
    refetch();
  };

  const handleAccountSelect = (accountId: string | null) => {
    setSelectedAccountId(accountId);
    setVisibleTransactions(30); // Reset visible transactions when changing account
    // When no account is selected, show dashboard view
    if (accountId === null) {
      setActiveTab("dashboard");
    } else {
      setActiveTab("transactions");
    }
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
    <div className="flex min-h-full">
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
        <div className="min-h-full overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedAccountId 
                    ? settings.bankAccounts.find(acc => acc.id === selectedAccountId)?.name || "Account"
                    : "Dashboard"
                  }
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedAccountId 
                    ? "View all transactions for this account"
                    : "Overview of your financial data and recurring transactions"
                  }
                </p>
              </div>
            </div>

            {/* Due Recurring Transactions Alert */}
            {dueRecurringTransactions.length > 0 && (
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Clock className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-purple-900">
                        Transazioni Ricorrenti in Scadenza
                      </h3>
                      <p className="text-sm text-purple-700">
                        Hai {dueRecurringTransactions.length} transazione{dueRecurringTransactions.length > 1 ? 'i' : ''} ricorrente{dueRecurringTransactions.length > 1 ? 'i' : ''} pronte per essere elaborate
                      </p>
                    </div>
                    <Button
                      onClick={async () => {
                        try {
                          await fetch('/api/recurring-transactions/process-due', { method: 'POST' });
                          toast({ title: "Transazioni ricorrenti elaborate con successo" });
                          refetch();
                        } catch (error) {
                          toast({
                            title: "Errore",
                            description: "Impossibile elaborare le transazioni ricorrenti",
                            variant: "destructive",
                          });
                        }
                      }}
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Repeat className="h-4 w-4 mr-2" />
                      Elabora Tutte
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

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
              // All accounts view - Intelligent Dashboard
              <div className="space-y-8">
                {/* Upcoming Recurring Transactions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-orange-600" />
                      Prossime Transazioni Ricorrenti
                    </CardTitle>
                    <p className="text-sm text-gray-600">Le tue prossime entrate e uscite programmate</p>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const processRecurringTransaction = async (id: number) => {
                        try {
                          await fetch(`/api/recurring-transactions/${id}/process`, { method: 'POST' });
                          toast({ title: "Transazione ricorrente elaborata" });
                          refetch();
                        } catch (error) {
                          toast({
                            title: "Errore",
                            description: "Impossibile elaborare la transazione",
                            variant: "destructive",
                          });
                        }
                      };

                      const getTypeColor = (type: string) => {
                        switch (type) {
                          case "income": return "bg-green-100 text-green-800";
                          case "expense": return "bg-red-100 text-red-800";
                          case "transfer": return "bg-blue-100 text-blue-800";
                          default: return "bg-gray-100 text-gray-800";
                        }
                      };

                      const getFrequencyText = (frequency: string, intervalCount: number) => {
                        const interval = intervalCount > 1 ? ` ogni ${intervalCount}` : '';
                        switch (frequency) {
                          case 'daily': return `Giornaliera${intervalCount > 1 ? ` (${intervalCount} giorni)` : ''}`;
                          case 'weekly': return `Settimanale${intervalCount > 1 ? ` (${intervalCount} settimane)` : ''}`;
                          case 'monthly': return `Mensile${intervalCount > 1 ? ` (${intervalCount} mesi)` : ''}`;
                          case 'quarterly': return `Trimestrale${intervalCount > 1 ? ` (${intervalCount} trimestri)` : ''}`;
                          case 'yearly': return `Annuale${intervalCount > 1 ? ` (${intervalCount} anni)` : ''}`;
                          default: return frequency;
                        }
                      };

                      if (recurringTransactions.length === 0) {
                        return (
                          <div className="text-center py-8">
                            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500 mb-2">Nessuna transazione ricorrente configurata</p>
                            <p className="text-sm text-gray-400">
                              Crea una transazione e abilita l'opzione ricorrente per automatizzare le tue entrate e spese
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-4">
                          {recurringTransactions.map((transaction: any) => {
                            const account = settings.bankAccounts.find(acc => acc.id === transaction.accountId);
                            const currency = account?.currency || 'EUR';
                            const nextDue = new Date(transaction.nextDueDate);
                            const isOverdue = nextDue < new Date();
                            
                            return (
                              <div
                                key={transaction.id}
                                className={cn(
                                  "p-4 border rounded-lg transition-colors",
                                  isOverdue ? "bg-red-50 border-red-200" : "bg-gray-50",
                                  !transaction.isActive && "opacity-60"
                                )}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <h4 className="font-semibold text-gray-900">{transaction.name}</h4>
                                      <Badge className={getTypeColor(transaction.type)}>
                                        {transaction.type === 'income' ? 'Entrata' : 
                                         transaction.type === 'expense' ? 'Spesa' : 'Trasferimento'}
                                      </Badge>
                                      <Badge variant="outline" className="text-xs">
                                        {getFrequencyText(transaction.frequency, transaction.intervalCount)}
                                      </Badge>
                                      {!transaction.isActive && (
                                        <Badge variant="secondary" className="bg-gray-200 text-gray-600">
                                          In Pausa
                                        </Badge>
                                      )}
                                      {isOverdue && (
                                        <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-300">
                                          Scaduta
                                        </Badge>
                                      )}
                                    </div>
                                    
                                    <p className="text-sm text-gray-600 mb-3">{transaction.description}</p>
                                    
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                      <div>
                                        <span className="text-gray-500">Importo:</span>
                                        <p className="font-semibold text-lg">
                                          {formatCurrency(parseFloat(transaction.amount), currency)}
                                        </p>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Categoria:</span>
                                        <p className="font-medium">{transaction.category}</p>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Conto:</span>
                                        <p className="font-medium">{account?.name || 'Sconosciuto'}</p>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Prossima scadenza:</span>
                                        <p className={cn(
                                          "font-medium",
                                          isOverdue ? "text-red-600" : "text-gray-900"
                                        )}>
                                          {format(nextDue, "dd MMM yyyy")}
                                        </p>
                                      </div>
                                    </div>

                                    {transaction.endDate && (
                                      <div className="mt-3 pt-3 border-t text-xs text-gray-500">
                                        <div className="flex justify-between">
                                          <span>Progresso: {transaction.currentOccurrence} esecuzioni</span>
                                          <span>Termina: {format(new Date(transaction.endDate), "dd MMM yyyy")}</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 ml-4">
                                    {transaction.isActive && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => processRecurringTransaction(transaction.id)}
                                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                        title="Elabora ora"
                                      >
                                        <Play className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* Monthly Account Analysis */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {settings.bankAccounts.map(account => {
                    const accountTransactions = transactions.filter(t => 
                      t.toAccountId === account.id || t.fromAccountId === account.id
                    );
                    
                    // Calculate current month stats
                    const currentMonth = new Date();
                    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
                    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
                    
                    const monthlyTransactions = accountTransactions.filter(t => {
                      const transactionDate = new Date(t.date);
                      return transactionDate >= startOfMonth && transactionDate <= endOfMonth;
                    });

                    const monthlyIncome = monthlyTransactions
                      .filter(t => t.type === 'income' && t.toAccountId === account.id)
                      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

                    const monthlyExpenses = monthlyTransactions
                      .filter(t => t.type === 'expense' && t.toAccountId === account.id)
                      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

                    const transfersIn = monthlyTransactions
                      .filter(t => t.type === 'transfer' && t.toAccountId === account.id)
                      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

                    const transfersOut = monthlyTransactions
                      .filter(t => t.type === 'transfer' && t.fromAccountId === account.id)
                      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

                    // Calculate current balance
                    let currentBalance = parseFloat(account.balance?.toString() || "0");
                    accountTransactions.forEach(transaction => {
                      const amount = parseFloat(transaction.amount);
                      if (transaction.type === 'income' && transaction.toAccountId === account.id) {
                        currentBalance += amount;
                      } else if (transaction.type === 'expense' && transaction.toAccountId === account.id) {
                        currentBalance -= amount;
                      } else if (transaction.type === 'transfer') {
                        if (transaction.toAccountId === account.id) {
                          currentBalance += amount;
                        } else if (transaction.fromAccountId === account.id) {
                          currentBalance -= amount;
                        }
                      }
                    });

                    return (
                      <Card key={account.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div 
                                className="p-2 rounded-full"
                                style={{ backgroundColor: account.color }}
                              >
                                {(() => {
                                  if (account.iconType === "custom" && account.customIcon) {
                                    return (
                                      <img 
                                        src={account.customIcon} 
                                        alt="Account icon" 
                                        className="h-4 w-4 object-cover rounded"
                                      />
                                    );
                                  }
                                  
                                  // Default to lucide icons
                                  const iconName = account.iconName || "CreditCard";
                                  const iconMap: Record<string, any> = {
                                    CreditCard,
                                    Wallet,
                                    Building,
                                    DollarSign,
                                    PiggyBank,
                                    Landmark,
                                    Bitcoin,
                                    TrendingUp,
                                    Users,
                                    Smartphone
                                  };
                                  
                                  const IconComponent = iconMap[iconName] || CreditCard;
                                  return <IconComponent className="h-4 w-4 text-white" />;
                                })()}
                              </div>
                              <div>
                                <CardTitle className="text-lg">{account.name}</CardTitle>
                                <p className="text-sm text-gray-600 capitalize">{account.type}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-600">Saldo Attuale</p>
                              <p className="text-xl font-bold" style={{ color: account.color }}>
                                {formatCurrency(currentBalance, account.currency)}
                              </p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Monthly Stats */}
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-3">
                              Movimento {format(currentMonth, "MMMM yyyy")}
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="text-center p-3 bg-green-50 rounded-lg">
                                <TrendingUp className="h-5 w-5 text-green-600 mx-auto mb-1" />
                                <p className="text-sm text-gray-600">Entrate</p>
                                <p className="font-bold text-green-600">
                                  {formatCurrency(monthlyIncome + transfersIn, account.currency)}
                                </p>
                              </div>
                              <div className="text-center p-3 bg-red-50 rounded-lg">
                                <TrendingDown className="h-5 w-5 text-red-600 mx-auto mb-1" />
                                <p className="text-sm text-gray-600">Uscite</p>
                                <p className="font-bold text-red-600">
                                  {formatCurrency(monthlyExpenses + transfersOut, account.currency)}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Net Monthly Movement */}
                          <div className="pt-3 border-t">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Movimento Netto:</span>
                              <span className={`font-bold ${
                                (monthlyIncome + transfersIn - monthlyExpenses - transfersOut) >= 0 
                                  ? 'text-green-600' 
                                  : 'text-red-600'
                              }`}>
                                {formatCurrency(
                                  monthlyIncome + transfersIn - monthlyExpenses - transfersOut, 
                                  account.currency
                                )}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Category Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5 text-purple-600" />
                      Analisi Spese per Categoria
                    </CardTitle>
                    <p className="text-sm text-gray-600">Distribuzione delle tue spese del mese corrente</p>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const currentMonth = new Date();
                      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
                      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
                      
                      const monthlyExpenses = transactions.filter(t => {
                        const transactionDate = new Date(t.date);
                        return t.type === 'expense' && 
                               transactionDate >= startOfMonth && 
                               transactionDate <= endOfMonth;
                      });

                      const categoryTotals = monthlyExpenses.reduce((acc, transaction) => {
                        const category = transaction.category;
                        if (!acc[category]) {
                          acc[category] = { total: 0, count: 0, currency: 'EUR' }; // Default currency
                        }
                        acc[category].total += parseFloat(transaction.amount);
                        acc[category].count += 1;
                        
                        // Get currency from account
                        const account = settings.bankAccounts.find(acc => acc.id === transaction.toAccountId);
                        if (account) {
                          acc[category].currency = account.currency;
                        }
                        
                        return acc;
                      }, {} as Record<string, { total: number; count: number; currency: string }>);

                      const sortedCategories = Object.entries(categoryTotals)
                        .sort(([,a], [,b]) => b.total - a.total)
                        .slice(0, 8); // Top 8 categories

                      const totalExpenses = Object.values(categoryTotals).reduce((sum, cat) => sum + cat.total, 0);

                      // Generate colors for categories
                      const colors = [
                        '#ef4444', '#f97316', '#eab308', '#22c55e', 
                        '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
                      ];

                      return sortedCategories.length > 0 ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {sortedCategories.map(([category, data], index) => {
                              const percentage = (data.total / totalExpenses * 100).toFixed(1);
                              return (
                                <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                  <div className="flex items-center gap-3">
                                    <div 
                                      className="w-4 h-4 rounded-full"
                                      style={{ backgroundColor: colors[index] }}
                                    />
                                    <div>
                                      <p className="font-medium">{category}</p>
                                      <p className="text-xs text-gray-600">{data.count} transazioni</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold text-red-600">
                                      {formatCurrency(data.total, data.currency)}
                                    </p>
                                    <p className="text-xs text-gray-600">{percentage}%</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          
                          <div className="pt-4 border-t">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">Totale Spese {format(currentMonth, "MMMM")}:</span>
                              <span className="text-xl font-bold text-red-600">
                                {formatCurrency(totalExpenses, 'EUR')}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <PieChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p>Nessuna spesa registrata questo mese</p>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
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
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filter by date" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="this-month">This Month</SelectItem>
                      <SelectItem value="last-month">Last Month</SelectItem>
                      <SelectItem value="this-year">This Year</SelectItem>
                      <SelectItem value="last-year">Last Year</SelectItem>
                      {(() => {
                        // Generate recent months
                        const months = [];
                        const now = new Date();
                        for (let i = 0; i < 12; i++) {
                          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                          const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                          const label = format(date, "MMMM yyyy");
                          months.push(<SelectItem key={value} value={value}>{label}</SelectItem>);
                        }
                        return months;
                      })()}
                    </SelectContent>
                  </Select>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {/* Income Categories */}
                      {settings.generalIncomeCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                      {/* Expense Categories */}
                      {settings.generalExpenseCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                      {/* Transfer Categories */}
                      {settings.generalTransferCategories.map((category) => (
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

                          const isRecurring = !!(transaction as any).recurringTransactionId;
                          
                          return (
                            <TableRow 
                              key={transaction.id}
                              className={isRecurring ? "bg-purple-50 border-l-4 border-l-purple-500" : ""}
                            >
                              <TableCell className="font-medium">
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <span>{format(new Date(transaction.date), "MMM dd, yyyy")}</span>
                                    {isRecurring && (
                                      <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-xs">
                                        🔄 Ricorrente
                                      </Badge>
                                    )}
                                  </div>
                                  <span className="text-xs text-gray-500">{format(new Date(transaction.date), "HH:mm")}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {getTransactionIcon(transaction)}
                                  <span className="capitalize">{transaction.type}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span>{transaction.description}</span>
                                  {isRecurring && (
                                    <span className="text-xs text-purple-600">Generata automaticamente</span>
                                  )}
                                </div>
                              </TableCell>
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