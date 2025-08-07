import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Laptop, Plus, Eye, AlertTriangle } from "lucide-react";
import { useAppSettings } from "@/components/settings/settings";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { format, isAfter, addDays } from "date-fns";
import type { Device, DeviceTransaction } from "@shared/schema";

interface DevicesSidebarProps {
  selectedDeviceId: number | null;
  onDeviceSelect: (deviceId: number | null) => void;
  devices: Device[];
  transactions: DeviceTransaction[];
  onAddDevice: () => void;
  onAddTransaction: () => void;
}

export default function DevicesSidebar({ 
  selectedDeviceId, 
  onDeviceSelect, 
  devices,
  transactions,
  onAddDevice,
  onAddTransaction 
}: DevicesSidebarProps) {
  const settings = useAppSettings();
  const [, setLocation] = useLocation();

  const calculateDeviceExpenses = (deviceId: number) => {
    const deviceTransactions = transactions.filter(transaction => 
      transaction.deviceId === deviceId
    );

    return deviceTransactions.reduce((total, transaction) => {
      return total + parseFloat(transaction.amount);
    }, 0);
  };

  const getDeviceTransactionCount = (deviceId: number) => {
    return transactions.filter(transaction => 
      transaction.deviceId === deviceId
    ).length;
  };

  const isWarrantyExpiring = (device: Device) => {
    if (!device.warrantyExpiry) return false;
    const alertDate = addDays(new Date(), device.alertDays || 30);
    return isAfter(alertDate, new Date(device.warrantyExpiry));
  };

  const getDeviceStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-100 text-green-800",
      maintenance: "bg-yellow-100 text-yellow-800",
      retired: "bg-gray-100 text-gray-800",
      lost: "bg-red-100 text-red-800",
      broken: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="w-80 bg-gray-50 border-r border-gray-200 h-screen overflow-y-auto">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Devices</h3>
          <div className="flex gap-2">
            <Button onClick={onAddDevice} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              Device
            </Button>
            <Button onClick={onAddTransaction} size="sm" className="bg-primary hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-1" />
              Expense
            </Button>
          </div>
        </div>

        {/* All Devices View */}
        <Card className={cn(
          "cursor-pointer transition-all hover:shadow-md",
          selectedDeviceId === null ? "ring-2 ring-blue-500 bg-blue-50" : "hover:bg-white"
        )}>
          <CardContent 
            className="p-4"
            onClick={() => onDeviceSelect(null)}
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Eye className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900">All Devices</h4>
                <p className="text-sm text-gray-600">
                  View all devices and expenses
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Individual Devices */}
        <div className="space-y-3">
          {devices.map((device) => {
            const expenses = calculateDeviceExpenses(device.id);
            const transactionCount = getDeviceTransactionCount(device.id);
            const isSelected = selectedDeviceId === device.id;
            const isExpiring = isWarrantyExpiring(device);

            return (
              <Card 
                key={device.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md relative",
                  isSelected ? "ring-2 ring-blue-500 bg-blue-50" : "hover:bg-white"
                )}
              >
                {isExpiring && (
                  <div className="absolute top-2 right-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  </div>
                )}
                <CardContent 
                  className="p-4"
                  onClick={() => onDeviceSelect(device.id)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-100 rounded-full">
                      <Laptop className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900 truncate">
                          {device.name}
                        </h4>
                        <Badge className={getDeviceStatusColor(device.status)} variant="secondary">
                          {device.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-1">
                        {device.brand} {device.model}
                      </p>
                      <div className="mt-2">
                        <p className="text-lg font-bold text-purple-600">
                          {formatCurrency(expenses)}
                        </p>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>
                            {device.purchasePrice ? `Purchase: ${formatCurrency(parseFloat(device.purchasePrice))}` : 'No purchase price'}
                          </span>
                          <span>{transactionCount} expense{transactionCount !== 1 ? 's' : ''}</span>
                        </div>
                        {device.warrantyExpiry && (
                          <p className={cn(
                            "text-xs mt-1",
                            isExpiring ? "text-amber-600 font-medium" : "text-gray-500"
                          )}>
                            Warranty: {format(new Date(device.warrantyExpiry), "MMM dd, yyyy")}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Device Management */}
        <Card className="bg-white border-dashed border-2 border-gray-300">
          <CardContent className="p-4 text-center">
            <div className="space-y-2">
              <Laptop className="h-8 w-8 text-gray-400 mx-auto" />
              <p className="text-sm text-gray-600">
                Need to add or manage devices?
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => setLocation('/settings')}
              >
                Manage Devices
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}