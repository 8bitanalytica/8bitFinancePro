import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { propertiesApi, realEstateTransactionsApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Building, DollarSign, Wrench, TrendingUp, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import TransactionModal from "@/components/modals/transaction-modal";
import PropertyModal from "@/components/modals/property-modal";
import type { Property, RealEstateTransaction } from "@shared/schema";

export default function RealEstateModule() {
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<RealEstateTransaction | undefined>();
  const [editingProperty, setEditingProperty] = useState<Property | undefined>();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [transactionFilter, setTransactionFilter] = useState<string>("");

  const { data: properties = [], isLoading: propertiesLoading, refetch: refetchProperties } = useQuery({
    queryKey: ["/api/properties"],
    queryFn: propertiesApi.getAll,
  });

  const { data: transactions = [], isLoading: transactionsLoading, refetch: refetchTransactions } = useQuery({
    queryKey: ["/api/real-estate-transactions", selectedPropertyId],
    queryFn: () => realEstateTransactionsApi.getAll(selectedPropertyId && selectedPropertyId !== "all" ? parseInt(selectedPropertyId) : undefined),
  });

  const filteredTransactions = transactions.filter(transaction => {
    const matchesFilter = !transactionFilter || transactionFilter === "all" || transaction.category === transactionFilter;
    return matchesFilter;
  });

  // Calculate portfolio metrics
  const totalProperties = properties.length;
  const monthlyRent = properties.reduce((sum, p) => sum + parseFloat(p.monthlyRent), 0);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const monthlyExpenses = transactions
    .filter(t => {
      const transactionDate = new Date(t.date);
      return (
        t.type === "expense" &&
        transactionDate.getMonth() === currentMonth &&
        transactionDate.getFullYear() === currentYear
      );
    })
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const netProfit = monthlyRent - monthlyExpenses;

  const handleAddTransaction = () => {
    setEditingTransaction(undefined);
    setShowTransactionModal(true);
  };

  const handleEditTransaction = (transaction: RealEstateTransaction) => {
    setEditingTransaction(transaction);
    setShowTransactionModal(true);
  };

  const handleAddProperty = () => {
    setEditingProperty(undefined);
    setShowPropertyModal(true);
  };

  const handleEditProperty = (property: Property) => {
    setEditingProperty(property);
    setShowPropertyModal(true);
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

  const getPropertyById = (id: number) => {
    return properties.find(p => p.id === id);
  };

  const getPropertyExpenses = (propertyId: number) => {
    return transactions
      .filter(t => t.propertyId === propertyId && t.type === "expense")
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
  };

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      rent: "bg-green-100 text-green-800",
      maintenance: "bg-orange-100 text-orange-800",
      repairs: "bg-red-100 text-red-800",
      taxes: "bg-purple-100 text-purple-800",
      insurance: "bg-blue-100 text-blue-800",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  if (propertiesLoading || transactionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="surface border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Real Estate Portfolio</h2>
            <p className="text-sm text-gray-600 mt-1">Manage your property investments and rental income</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleAddProperty}>
              <Building className="mr-2 h-4 w-4" />
              Add Property
            </Button>
            <Button onClick={handleAddTransaction} className="bg-primary hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Add Transaction
            </Button>
          </div>
        </div>
      </div>

      {/* Property Selection */}
      <div className="surface border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Select Property:</label>
          <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="All Properties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {properties.map((property) => (
                <SelectItem key={property.id} value={property.id.toString()}>
                  {property.name} - {property.address}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="p-6">
        {/* Portfolio Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Properties</p>
                  <p className="text-2xl font-bold text-primary">{totalProperties}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-full">
                  <Building className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Monthly Rent</p>
                  <p className="text-2xl font-bold text-secondary">${monthlyRent.toFixed(0)}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-full">
                  <DollarSign className="h-5 w-5 text-secondary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Monthly Expenses</p>
                  <p className="text-2xl font-bold text-destructive">${monthlyExpenses.toFixed(0)}</p>
                </div>
                <div className="p-3 bg-red-50 rounded-full">
                  <Wrench className="h-5 w-5 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Net Profit</p>
                  <p className="text-2xl font-bold text-secondary">${netProfit.toFixed(0)}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-full">
                  <TrendingUp className="h-5 w-5 text-secondary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Property Cards */}
        {properties.length === 0 ? (
          <Card className="mb-8">
            <CardContent className="p-8 text-center">
              <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No properties added yet.</p>
              <Button onClick={handleAddProperty}>
                <Plus className="mr-2 h-4 w-4" />
                Add your first property
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {properties.map((property) => {
              const monthlyExpenses = getPropertyExpenses(property.id);
              const netProfit = parseFloat(property.monthlyRent) - monthlyExpenses;
              
              return (
                <Card key={property.id} className="overflow-hidden">
                  <div className="w-full h-48 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                    <Building className="h-16 w-16 text-blue-600" />
                  </div>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{property.name}</h3>
                    <p className="text-sm text-gray-600 mb-4">{property.address}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Monthly Rent:</span>
                        <span className="text-sm font-medium text-secondary">${property.monthlyRent}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Monthly Expenses:</span>
                        <span className="text-sm font-medium text-destructive">${monthlyExpenses.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-sm font-medium text-gray-900">Net Profit:</span>
                        <span className="text-sm font-bold text-secondary">${netProfit.toFixed(2)}</span>
                      </div>
                    </div>
                    <Button
                      className="w-full mt-4 bg-primary hover:bg-blue-700"
                      onClick={() => handleEditProperty(property)}
                    >
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Transactions Table */}
        <Card>
          <CardContent className="p-0">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Property Transactions</h3>
                <Select value={transactionFilter} onValueChange={setTransactionFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="rent">Rent Income</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="repairs">Repairs</SelectItem>
                    <SelectItem value="taxes">Taxes</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                      <TableHead>Property</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction) => {
                      const property = getPropertyById(transaction.propertyId);
                      return (
                        <TableRow key={transaction.id}>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(transaction.date), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>{property?.name || 'Unknown Property'}</TableCell>
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
                                  realEstateTransactionsApi.delete(transaction.id).then(() => refetchTransactions());
                                }}
                                className="text-destructive hover:text-red-700"
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showTransactionModal && (
        <TransactionModal
          transaction={editingTransaction}
          onClose={handleTransactionModalClose}
          type="real-estate"
          properties={properties}
        />
      )}

      {showPropertyModal && (
        <PropertyModal
          property={editingProperty}
          onClose={handlePropertyModalClose}
        />
      )}
    </div>
  );
}
