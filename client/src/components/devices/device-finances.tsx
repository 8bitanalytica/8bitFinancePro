import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { deviceTransactionsApi, devicesApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Laptop, TrendingDown, AlertTriangle, Edit, Trash2, Search, Eye, ChevronDown, Copy } from "lucide-react";
import { format, subDays } from "date-fns";
import DeviceModal from "@/components/modals/device-modal";
import DeviceTransactionModal from "@/components/modals/device-transaction-modal";
import DevicesSidebar from "@/components/devices/devices-sidebar";
import { useAppSettings } from "@/components/settings/settings";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { DeviceTransaction, Device } from "@shared/schema";

export default function DeviceFinances() {
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<DeviceTransaction | undefined>();
  const [editingDevice, setEditingDevice] = useState<Device | undefined>();
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [visibleTransactions, setVisibleTransactions] = useState(30);
  const settings = useAppSettings();
  const { toast } = useToast();

  const { data: transactions = [], isLoading: transactionsLoading, refetch: refetchTransactions } = useQuery({
    queryKey: ["/api/device-transactions"],
    queryFn: deviceTransactionsApi.getAll,
  });

  const { data: devices = [], isLoading: devicesLoading, refetch: refetchDevices } = useQuery({
    queryKey: ["/api/devices"],
    queryFn: devicesApi.getAll,
  });

  // Dynamic calculations based on displayed transactions
  const displayedTransactions = useMemo(() => {
    let filtered = transactions;

    // Filter by selected device
    if (selectedDeviceId) {
      filtered = filtered.filter(transaction => transaction.deviceId === selectedDeviceId);
    } else {
      // Show last month only if no device selected
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
  }, [transactions, selectedDeviceId, categoryFilter, searchQuery]);

  // Dynamic statistics based on displayed transactions
  const statistics = useMemo(() => {
    const totalExpenses = displayedTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    // Calculate total device value (purchase prices)
    const deviceValues = selectedDeviceId 
      ? devices.filter(d => d.id === selectedDeviceId)
      : devices;
    
    const totalValue = deviceValues.reduce((sum, device) => {
      return sum + (device.purchasePrice ? parseFloat(device.purchasePrice) : 0);
    }, 0);

    return { totalExpenses, totalValue, deviceCount: deviceValues.length };
  }, [displayedTransactions, devices, selectedDeviceId]);

  const visibleTransactionsList = displayedTransactions.slice(0, visibleTransactions);
  const hasMoreTransactions = displayedTransactions.length > visibleTransactions;

  const handleAddDevice = () => {
    setEditingDevice(undefined);
    setShowDeviceModal(true);
  };

  const handleAddTransaction = () => {
    setEditingTransaction(undefined);
    setShowTransactionModal(true);
  };

  const handleEditTransaction = (transaction: DeviceTransaction) => {
    setEditingTransaction(transaction);
    setShowTransactionModal(true);
  };

  const handleDeleteTransaction = async (transaction: DeviceTransaction) => {
    if (confirm(`Are you sure you want to delete this transaction: "${transaction.description}"?`)) {
      try {
        await deviceTransactionsApi.delete(transaction.id);
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

  const handleDuplicateTransaction = (transaction: DeviceTransaction) => {
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

  const handleDeviceModalClose = () => {
    setShowDeviceModal(false);
    setEditingDevice(undefined);
    refetchDevices();
  };

  const handleDeviceSelect = (deviceId: number | null) => {
    setSelectedDeviceId(deviceId);
    setVisibleTransactions(30);
  };

  const loadMoreTransactions = () => {
    setVisibleTransactions(prev => prev + 30);
  };

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      repair: "bg-red-100 text-red-800",
      upgrade: "bg-blue-100 text-blue-800",
      accessory: "bg-green-100 text-green-800",
      maintenance: "bg-yellow-100 text-yellow-800",
      insurance: "bg-purple-100 text-purple-800",
    };
    return colors[category.toLowerCase()] || "bg-gray-100 text-gray-800";
  };

  const selectedDevice = selectedDeviceId ? devices.find(d => d.id === selectedDeviceId) : null;
  const deviceCategories = ["repair", "upgrade", "accessory", "maintenance", "insurance"];

  return (
    <div className="flex h-full">
      {/* Devices Sidebar */}
      <DevicesSidebar
        selectedDeviceId={selectedDeviceId}
        onDeviceSelect={handleDeviceSelect}
        devices={devices}
        transactions={transactions}
        onAddDevice={handleAddDevice}
        onAddTransaction={handleAddTransaction}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {selectedDevice ? selectedDevice.name : "Device Management"}
            </h1>
            <p className="text-gray-600 mt-1">
              {selectedDevice 
                ? `${selectedDevice.brand} ${selectedDevice.model} - ${selectedDevice.type}`
                : "Track your devices and their maintenance expenses"
              }
            </p>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    <Laptop className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Device Value</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(statistics.totalValue)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Device Count</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {statistics.deviceCount}
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
                {deviceCategories.map((category) => (
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
                  <CardTitle>Recent Expenses</CardTitle>
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
                      {selectedDeviceId ? "This device has no expenses" : "Try adjusting your filters"}
                    </p>
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date & Time</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Device</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visibleTransactionsList.map((transaction) => {
                          const device = devices.find(d => d.id === transaction.deviceId);
                          
                          return (
                            <TableRow key={transaction.id}>
                              <TableCell className="font-medium">
                                <div className="flex flex-col">
                                  <span>{format(new Date(transaction.date), "MMM dd, yyyy")}</span>
                                  <span className="text-xs text-gray-500">{format(new Date(transaction.date), "HH:mm")}</span>
                                </div>
                              </TableCell>
                              <TableCell>{transaction.description}</TableCell>
                              <TableCell>
                                <Badge className={getCategoryBadgeColor(transaction.category)}>
                                  {transaction.category}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className="font-medium text-red-600">
                                  -{formatCurrency(parseFloat(transaction.amount))}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-gray-600">
                                  {device?.name || 'Unknown Device'}
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
        <DeviceTransactionModal
          onClose={handleTransactionModalClose}
          transaction={editingTransaction}
          devices={devices}
          selectedDeviceId={selectedDeviceId || undefined}
        />
      )}

      {showDeviceModal && (
        <DeviceModal
          onClose={handleDeviceModalClose}
          device={editingDevice}
        />
      )}
    </div>
  );
}