import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { devicesApi, deviceTransactionsApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Smartphone, DollarSign, AlertTriangle, CheckCircle, Edit, Trash2, Search } from "lucide-react";
import { format } from "date-fns";
import DeviceModal from "@/components/modals/device-modal";
import DeviceTransactionModal from "@/components/modals/device-transaction-modal";
import type { Device, DeviceTransaction } from "@shared/schema";

export default function DeviceManagement() {
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | undefined>();
  const [editingTransaction, setEditingTransaction] = useState<DeviceTransaction | undefined>();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: devices = [], isLoading: devicesLoading, refetch: refetchDevices } = useQuery({
    queryKey: ["/api/devices"],
    queryFn: devicesApi.getAll,
  });

  const { data: transactions = [], isLoading: transactionsLoading, refetch: refetchTransactions } = useQuery({
    queryKey: ["/api/device-transactions", selectedDeviceId],
    queryFn: () => deviceTransactionsApi.getAll(selectedDeviceId && selectedDeviceId !== "all" ? parseInt(selectedDeviceId) : undefined),
  });

  const filteredDevices = devices.filter(device => {
    const matchesStatus = !statusFilter || statusFilter === "all" || device.status === statusFilter;
    const matchesSearch = !searchQuery || 
      device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.model.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Calculate device metrics
  const totalDevices = devices.length;
  const activeDevices = devices.filter(d => d.status === "active").length;
  const devicesNeedingAttention = devices.filter(d => d.status === "maintenance" || d.status === "broken").length;
  const totalDeviceValue = devices.reduce((sum, d) => sum + (parseFloat(d.purchasePrice || "0")), 0);

  // Calculate warranty expiration alerts
  const getWarrantyExpirationAlerts = () => {
    const now = new Date();
    return devices.filter(device => {
      if (!device.warrantyExpiry || device.status !== "active") return false;
      const warrantyExpiry = new Date(device.warrantyExpiry);
      const alertDays = device.alertDays || 30;
      const alertDate = new Date(warrantyExpiry);
      alertDate.setDate(alertDate.getDate() - alertDays);
      return now >= alertDate && now <= warrantyExpiry;
    });
  };

  const warrantyAlerts = getWarrantyExpirationAlerts();
  const expiredWarranties = devices.filter(device => {
    if (!device.warrantyExpiry || device.status !== "active") return false;
    return new Date(device.warrantyExpiry) < new Date();
  });

  const handleAddDevice = () => {
    setEditingDevice(undefined);
    setShowDeviceModal(true);
  };

  const handleEditDevice = (device: Device) => {
    setEditingDevice(device);
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

  const handleDeviceModalClose = () => {
    setShowDeviceModal(false);
    setEditingDevice(undefined);
    refetchDevices();
  };

  const handleTransactionModalClose = () => {
    setShowTransactionModal(false);
    setEditingTransaction(undefined);
    refetchTransactions();
  };

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-100 text-green-800",
      maintenance: "bg-yellow-100 text-yellow-800",
      retired: "bg-gray-100 text-gray-800",
      lost: "bg-red-100 text-red-800",
      broken: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4" />;
      case "maintenance":
      case "broken":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Smartphone className="h-4 w-4" />;
    }
  };

  const getDeviceById = (id: number) => {
    return devices.find(d => d.id === id);
  };

  if (devicesLoading || transactionsLoading) {
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
            <h2 className="text-2xl font-bold text-gray-900">Device Management</h2>
            <p className="text-sm text-gray-600 mt-1">Track and manage your technology devices and expenses</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleAddDevice}>
              <Smartphone className="mr-2 h-4 w-4" />
              Add Device
            </Button>
            <Button onClick={handleAddTransaction} className="bg-primary hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Warranty Expiration Alerts */}
        {(warrantyAlerts.length > 0 || expiredWarranties.length > 0) && (
          <div className="mb-6 space-y-4">
            {warrantyAlerts.length > 0 && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <h3 className="font-semibold text-yellow-800">Warranty Expiration Alerts</h3>
                  </div>
                  <div className="space-y-2">
                    {warrantyAlerts.map((device) => (
                      <div key={device.id} className="flex items-center justify-between bg-white p-3 rounded border">
                        <div>
                          <p className="font-medium text-gray-900">{device.name}</p>
                          <p className="text-sm text-gray-600">
                            {device.brand} {device.model} - Warranty expires {format(new Date(device.warrantyExpiry!), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditDevice(device)}
                        >
                          View Details
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {expiredWarranties.length > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <h3 className="font-semibold text-red-800">Expired Warranties</h3>
                  </div>
                  <div className="space-y-2">
                    {expiredWarranties.map((device) => (
                      <div key={device.id} className="flex items-center justify-between bg-white p-3 rounded border">
                        <div>
                          <p className="font-medium text-gray-900">{device.name}</p>
                          <p className="text-sm text-gray-600">
                            {device.brand} {device.model} - Warranty expired {format(new Date(device.warrantyExpiry!), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditDevice(device)}
                        >
                          View Details
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Devices</p>
                  <p className="text-2xl font-bold text-primary">{totalDevices}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-full">
                  <Smartphone className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Devices</p>
                  <p className="text-2xl font-bold text-secondary">{activeDevices}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-full">
                  <CheckCircle className="h-5 w-5 text-secondary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Need Attention</p>
                  <p className="text-2xl font-bold text-destructive">{devicesNeedingAttention}</p>
                </div>
                <div className="p-3 bg-red-50 rounded-full">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-primary">${totalDeviceValue.toFixed(0)}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-full">
                  <DollarSign className="h-5 w-5 text-secondary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="retired">Retired</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                    <SelectItem value="broken">Broken</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search devices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Device Cards */}
        {filteredDevices.length === 0 ? (
          <Card className="mb-8">
            <CardContent className="p-8 text-center">
              <Smartphone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No devices found.</p>
              <Button onClick={handleAddDevice}>
                <Plus className="mr-2 h-4 w-4" />
                Add your first device
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {filteredDevices.map((device) => (
              <Card key={device.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Device Image */}
                  {device.deviceImage && (
                    <div className="h-48 bg-gray-100 overflow-hidden">
                      <img 
                        src={device.deviceImage} 
                        alt={device.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(device.status)}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{device.name}</h3>
                          <p className="text-sm text-gray-600">{device.brand} {device.model}</p>
                        </div>
                      </div>
                      <Badge className={`${getStatusBadgeColor(device.status)} border-0`}>
                        {device.status}
                      </Badge>
                    </div>
                    
                    {/* Warranty Status */}
                    {device.warrantyExpiry && (
                      <div className="mb-4 p-3 rounded-lg bg-gray-50">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Warranty Status:</span>
                          {new Date(device.warrantyExpiry) > new Date() ? (
                            <Badge className="bg-green-100 text-green-800 border-0">
                              Valid until {format(new Date(device.warrantyExpiry), 'MMM dd, yyyy')}
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800 border-0">
                              Expired
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Type:</span>
                        <span className="text-sm font-medium capitalize">{device.type}</span>
                      </div>
                      {device.purchasePrice && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Purchase Price:</span>
                          <span className="text-sm font-medium">${device.purchasePrice}</span>
                        </div>
                      )}
                      {device.assignedTo && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Assigned To:</span>
                          <span className="text-sm font-medium">{device.assignedTo}</span>
                        </div>
                      )}
                      {device.location && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Location:</span>
                          <span className="text-sm font-medium">{device.location}</span>
                        </div>
                      )}
                    </div>
                    
                    <Button
                      className="w-full bg-primary hover:bg-blue-700"
                      onClick={() => handleEditDevice(device)}
                    >
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Device Selection for Transactions */}
        <div className="surface border-b border-gray-200 px-6 py-4 mb-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Filter Transactions by Device:</label>
            <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="All Devices" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Devices</SelectItem>
                {devices.map((device) => (
                  <SelectItem key={device.id} value={device.id.toString()}>
                    {device.name} ({device.brand} {device.model})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Transactions Table */}
        <Card>
          <CardContent className="p-0">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Device Expenses</h3>
            </div>
            
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No transactions found.</p>
                <Button onClick={handleAddTransaction} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Add your first expense
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => {
                      const device = getDeviceById(transaction.deviceId);
                      return (
                        <TableRow key={transaction.id}>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(transaction.date), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>{device?.name || 'Unknown Device'}</TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell>
                            <Badge className="bg-blue-100 text-blue-800 border-0">
                              {transaction.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium text-destructive">
                            ${transaction.amount}
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
                                  deviceTransactionsApi.delete(transaction.id).then(() => refetchTransactions());
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

      {showDeviceModal && (
        <DeviceModal
          device={editingDevice}
          onClose={handleDeviceModalClose}
        />
      )}

      {showTransactionModal && (
        <DeviceTransactionModal
          transaction={editingTransaction}
          onClose={handleTransactionModalClose}
          devices={devices}
        />
      )}
    </div>
  );
}