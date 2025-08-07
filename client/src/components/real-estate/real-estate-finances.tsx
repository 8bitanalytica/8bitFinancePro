import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { realEstateTransactionsApi, propertiesApi, propertyProjectsApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Home, Edit, Trash2, Search, Eye, ChevronDown, Copy, FolderOpen, Plus } from "lucide-react";
import { format, subDays } from "date-fns";
import TransactionModal from "@/components/modals/transaction-modal";
import PropertyModal from "@/components/modals/property-modal";
import PropertyProjectModal from "@/components/modals/property-project-modal";
import PropertiesSidebar from "@/components/real-estate/properties-sidebar";
import { useAppSettings } from "@/components/settings/settings";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { RealEstateTransaction, Property, PropertyProject } from "@shared/schema";

export default function RealEstateFinances() {
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<RealEstateTransaction | undefined>();
  const [editingProperty, setEditingProperty] = useState<Property | undefined>();
  const [editingProject, setEditingProject] = useState<PropertyProject | undefined>();
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

  const { data: projects = [], isLoading: projectsLoading, refetch: refetchProjects } = useQuery({
    queryKey: ["/api/property-projects"],
    queryFn: propertyProjectsApi.getAll,
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

  // Dynamic statistics based on displayed transactions - grouped by currency
  const statistics = useMemo(() => {
    const currencyGroups: Record<string, { income: number; expenses: number }> = {};
    
    displayedTransactions.forEach(transaction => {
      const amount = parseFloat(transaction.amount);
      // Note: Real estate transactions don't have direct account linking like general transactions
      // They use property-specific accounts, so we'll use USD as default or property currency if available
      const currency = 'USD'; // TODO: Add property-specific currency support if needed
      
      if (!currencyGroups[currency]) {
        currencyGroups[currency] = { income: 0, expenses: 0 };
      }
      
      if (transaction.type === "income") {
        currencyGroups[currency].income += amount;
      } else {
        currencyGroups[currency].expenses += amount;
      }
    });

    // Calculate primary totals for backward compatibility
    const primaryCurrency = Object.keys(currencyGroups)[0] || 'USD';
    const primaryStats = currencyGroups[primaryCurrency] || { income: 0, expenses: 0 };
    
    const totalIncome = primaryStats.income;
    const totalExpenses = primaryStats.expenses;

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

  const handleAddProject = () => {
    setEditingProject(undefined);
    setShowProjectModal(true);
  };

  const handleAddProjectToProperty = (propertyId: number) => {
    setSelectedPropertyId(propertyId); // Set the property context
    setEditingProject(undefined);
    setShowProjectModal(true);
  };

  const handleEditProject = (project: PropertyProject) => {
    setEditingProject(project);
    setShowProjectModal(true);
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

  const handleProjectModalClose = () => {
    setShowProjectModal(false);
    setEditingProject(undefined);
    refetchProjects();
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
  
  // Get projects for selected property
  const selectedPropertyProjects = useMemo(() => {
    if (!selectedPropertyId) return [];
    return projects.filter(project => project.propertyId === selectedPropertyId);
  }, [projects, selectedPropertyId]);

  return (
    <div className="flex h-full">
      {/* Properties Sidebar */}
      <PropertiesSidebar
        selectedPropertyId={selectedPropertyId}
        onPropertySelect={handlePropertySelect}
        properties={properties}
        projects={projects}
        transactions={transactions}
        onAddProperty={handleAddProperty}
        onAddTransaction={handleAddTransaction}
        onEditProject={handleEditProject}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
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
            
            {/* Add Project Button - Only shown when a property is selected */}
            {selectedProperty && (
              <Button 
                onClick={() => handleAddProjectToProperty(selectedProperty.id)} 
                size="sm" 
                variant="outline" 
                className="text-purple-600 border-purple-200 hover:bg-purple-50"
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                Add Project
              </Button>
            )}
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

          {/* Projects Section - Only shown when a property is selected */}
          {selectedProperty && selectedPropertyProjects.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-purple-600" />
                  Active Projects for {selectedProperty.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {selectedPropertyProjects.map((project) => {
                    // Filter transactions for this specific project
                    const projectTransactions = displayedTransactions.filter(t => t.projectId === project.id);
                    const projectExpenses = projectTransactions
                      .filter(t => t.type === 'expense')
                      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
                    const projectBudget = project.budget ? parseFloat(project.budget) : 0;
                    const budgetUsed = projectBudget > 0 ? (projectExpenses / projectBudget) * 100 : 0;

                    return (
                      <div key={project.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-900">{project.name}</h4>
                            <p className="text-sm text-gray-600">{project.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="secondary" 
                              className={cn(
                                "text-xs",
                                project.status === 'active' ? 'bg-green-100 text-green-800' :
                                project.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              )}
                            >
                              {project.status}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditProject(project)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Project Budget and Expenses */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-xs text-gray-500">Budget</p>
                            <p className="font-semibold text-blue-600">
                              {project.budget ? formatCurrency(parseFloat(project.budget)) : 'No budget set'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Spent</p>
                            <p className="font-semibold text-red-600">
                              {formatCurrency(projectExpenses)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Remaining</p>
                            <p className={cn(
                              "font-semibold",
                              (projectBudget - projectExpenses) >= 0 ? "text-green-600" : "text-red-600"
                            )}>
                              {projectBudget > 0 ? formatCurrency(projectBudget - projectExpenses) : 'No budget'}
                            </p>
                          </div>
                        </div>

                        {/* Budget Progress Bar */}
                        {projectBudget > 0 && (
                          <div className="mb-4">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>Budget Usage</span>
                              <span>{budgetUsed.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={cn(
                                  "h-2 rounded-full transition-all",
                                  budgetUsed > 100 ? "bg-red-500" :
                                  budgetUsed > 80 ? "bg-yellow-500" : "bg-green-500"
                                )}
                                style={{ width: `${Math.min(budgetUsed, 100)}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Project Transactions */}
                        {projectTransactions.length > 0 && (
                          <div>
                            <h5 className="font-medium text-gray-900 mb-2">Recent Project Expenses</h5>
                            <div className="space-y-2">
                              {projectTransactions.slice(0, 3).map((transaction) => (
                                <div key={transaction.id} className="flex justify-between items-center text-sm">
                                  <div>
                                    <p className="font-medium">{transaction.description}</p>
                                    <p className="text-gray-500">{format(new Date(transaction.date), "MMM dd, yyyy")}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className={cn(
                                      "font-semibold",
                                      transaction.type === 'income' ? "text-green-600" : "text-red-600"
                                    )}>
                                      {transaction.type === 'expense' ? '-' : '+'}{formatCurrency(parseFloat(transaction.amount))}
                                    </p>
                                    <p className="text-xs text-gray-500">{transaction.category}</p>
                                  </div>
                                </div>
                              ))}
                              {projectTransactions.length > 3 && (
                                <p className="text-xs text-gray-500 text-center pt-2">
                                  +{projectTransactions.length - 3} more transactions
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {projectTransactions.length === 0 && (
                          <div className="text-center py-4 text-gray-500">
                            <p className="text-sm">No expenses recorded for this project yet</p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2"
                              onClick={handleAddTransaction}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add Project Expense
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

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

      {showProjectModal && (
        <PropertyProjectModal
          isOpen={showProjectModal}
          onClose={handleProjectModalClose}
          project={editingProject}
          properties={properties}
          propertyId={selectedPropertyId || undefined}
        />
      )}
    </div>
  );
}