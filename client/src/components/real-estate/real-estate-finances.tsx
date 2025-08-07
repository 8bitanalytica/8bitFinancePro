import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { realEstateTransactionsApi, propertiesApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Home, Edit, Trash2, Search, Eye, ChevronDown, Copy } from "lucide-react";
import { format, subDays } from "date-fns";
import TransactionModal from "@/components/modals/transaction-modal";
import PropertyModal from "@/components/modals/property-modal";
import PropertiesSidebar from "@/components/real-estate/properties-sidebar";
import { useAppSettings } from "@/components/settings/settings";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { RealEstateTransaction, Property } from "@shared/schema";

export default function RealEstateFinances() {
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<RealEstateTransaction | undefined>();
  const [editingProperty, setEditingProperty] = useState<Property | undefined>();
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [visibleTransactions, setVisibleTransactions] = useState(30);
  const settings = useAppSettings();
  const { toast } = useToast();

  const { data: transactions = [], isLoading: transactionsLoading, refetch: refetchTransactions } = useQuery({
    queryKey: ["/api/real-estate-transactions"],
    queryFn: realEstateTransactionsApi.getAll,
  });

  const { data: properties = [], isLoading: propertiesLoading, refetch: refetchProperties } = useQuery({
    queryKey: ["/api/properties"],
    queryFn: propertiesApi.getAll,
  });

  // Dynamic calculations based on displayed transactions
  const displayedTransactions = useMemo(() => {
    let filtered = transactions;

    // Filter by selected property
    if (selectedPropertyId) {
      filtered = filtered.filter(transaction => transaction.propertyId === selectedPropertyId);
    } else {
      // Show last month only if no property selected
      const lastMonth = subDays(new Date(), 30);
      filtered = filtered.filter(t => new Date(t.date) >= lastMonth);
    }

    // Apply category and search filters
    filtered = filtered.filter(transaction => {
      const matchesCategory = categoryFilter === "all" || transaction.category === categoryFilter;
      const matchesSearch = !searchQuery || 
        transaction.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });

    // Sort by date (newest first)
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, selectedPropertyId, categoryFilter, searchQuery]);

  // Dynamic statistics based on displayed transactions
  const statistics = useMemo(() => {
    const totalIncome = displayedTransactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const totalExpenses = displayedTransactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const netBalance = totalIncome - totalExpenses;

    return { totalIncome, totalExpenses, netBalance };
  }, [displayedTransactions]);

  const visibleTransactionsList = displayedTransactions.slice(0, visibleTransactions);
  const hasMoreTransactions = displayedTransactions.length > visibleTransactions;

  const handleAddProperty = () => {
    setEditingProperty(undefined);
    setShowPropertyModal(true);
  };

  const handleAddTransaction = () => {
    setEditingTransaction(undefined);
    setShowTransactionModal(true);
  };

  const handleEditTransaction = (transaction: RealEstateTransaction) => {
    setEditingTransaction(transaction);
    setShowTransactionModal(true);
  };

  const handleDeleteTransaction = async (transaction: RealEstateTransaction) => {
    if (confirm(`Are you sure you want to delete this transaction: "${transaction.description}"?`)) {
      try {
        await realEstateTransactionsApi.delete(transaction.id);
        toast({ title: "Transaction deleted successfully" });
        refetchTransactions();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete transaction. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleDuplicateTransaction = (transaction: RealEstateTransaction) => {
    const now = new Date();
    const duplicatedTransaction = {
      ...transaction,
      date: now.toISOString(),
      id: undefined,
    };
    setEditingTransaction(duplicatedTransaction as any);
    setShowTransactionModal(true);
  };

  const handleTransactionModalClose = () => {
    setShowTransactionModal(false);
    setEditingTransaction(undefined);
    refetchTransactions();
  };

  const handlePropertyModalClose = () => {
    setShowPropertyModal(false);
    setEditingProperty(undefined);
    refetchProperties();
  };

  const handlePropertySelect = (propertyId: number | null) => {
    setSelectedPropertyId(propertyId);
    setVisibleTransactions(30);
  };

  const loadMoreTransactions = () => {
    setVisibleTransactions(prev => prev + 30);
  };

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      rent: "bg-green-100 text-green-800",
      maintenance: "bg-yellow-100 text-yellow-800",
      repairs: "bg-red-100 text-red-800",
      taxes: "bg-blue-100 text-blue-800",
      insurance: "bg-purple-100 text-purple-800",
    };
    return colors[category.toLowerCase()] || "bg-gray-100 text-gray-800";
  };

  const selectedProperty = selectedPropertyId ? properties.find(p => p.id === selectedPropertyId) : null;

  return (
    <div className="flex h-full">
      {/* Properties Sidebar */}
      <PropertiesSidebar
        selectedPropertyId={selectedPropertyId}
        onPropertySelect={handlePropertySelect}
        properties={properties}
        transactions={transactions}
        onAddProperty={handleAddProperty}
        onAddTransaction={handleAddTransaction}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {selectedProperty ? selectedProperty.name : "Real Estate Portfolio"}
            </h1>
            <p className="text-gray-600 mt-1">
              {selectedProperty 
                ? `${selectedProperty.address} - ${selectedProperty.type}`
                : "Manage your real estate investments and track income/expenses"
              }
            </p>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Income</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(statistics.totalIncome)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <TrendingDown className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(statistics.totalExpenses)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Home className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Net Balance</p>
                    <p className={cn(
                      "text-2xl font-bold",
                      statistics.netBalance >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {formatCurrency(statistics.netBalance)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {settings.realEstateCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Transactions Table */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Transactions</CardTitle>
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
                      {selectedPropertyId ? "This property has no transactions" : "Try adjusting your filters"}
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
                          <TableHead>Property</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visibleTransactionsList.map((transaction) => {
                          const property = properties.find(p => p.id === transaction.propertyId);
                          
                          return (
                            <TableRow key={transaction.id}>
                              <TableCell className="font-medium">
                                <div className="flex flex-col">
                                  <span>{format(new Date(transaction.date), "MMM dd, yyyy")}</span>
                                  <span className="text-xs text-gray-500">{format(new Date(transaction.date), "HH:mm")}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="capitalize">{transaction.type}</span>
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
                                  transaction.type === "income" ? "text-green-600" : "text-red-600"
                                )}>
                                  {transaction.type === "expense" ? "-" : "+"}
                                  {formatCurrency(parseFloat(transaction.amount))}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-gray-600">
                                  {property?.name || 'Unknown Property'}
                                </span>
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
          </div>
        </div>
      </div>

      {/* Modals */}
      {showTransactionModal && (
        <TransactionModal
          onClose={handleTransactionModalClose}
          transaction={editingTransaction}
          type="real-estate"
          properties={properties}
        />
      )}

      {showPropertyModal && (
        <PropertyModal
          onClose={handlePropertyModalClose}
          property={editingProperty}
        />
      )}
    </div>
  );
}