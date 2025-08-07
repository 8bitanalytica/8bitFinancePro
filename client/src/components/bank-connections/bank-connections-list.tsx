import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, 
  Download, 
  Trash2, 
  TestTube, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Settings,
  RefreshCw
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BankConnectionModal } from "./bank-connection-modal";
import type { BankConnection } from "@shared/schema";

interface BankConnectionsListProps {
  accountId?: string;
}

export function BankConnectionsList({ accountId }: BankConnectionsListProps) {
  const [showModal, setShowModal] = useState(false);
  const [isImporting, setIsImporting] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: connections = [], isLoading } = useQuery({
    queryKey: accountId ? ["/api/bank-connections/account", accountId] : ["/api/bank-connections"],
    queryFn: () => apiRequest(
      accountId ? `/api/bank-connections/account/${accountId}` : "/api/bank-connections"
    ),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/bank-connections/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bank-connections"] });
      toast({ title: "Success", description: "Bank connection deleted successfully" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete connection",
        variant: "destructive",
      });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async ({ id, days = 30 }: { id: number; days?: number }) => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      return apiRequest(`/api/bank-connections/${id}/sync`, {
        method: "POST",
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          limit: 100,
        }),
      });
    },
    onSuccess: (data, variables) => {
      setIsImporting(null);
      queryClient.invalidateQueries({ queryKey: ["/api/general-transactions"] });
      toast({
        title: "Import Complete",
        description: `Imported ${data.imported} of ${data.total} transactions`,
      });
    },
    onError: (error, variables) => {
      setIsImporting(null);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import transactions",
        variant: "destructive",
      });
    },
  });

  const testConnection = async (connection: BankConnection) => {
    try {
      const result = await apiRequest(`/api/bank-connections/${connection.id}/test`);
      
      toast({
        title: result.isValid ? "Connection Test Passed" : "Connection Test Failed",
        description: result.isValid 
          ? `Connected to ${result.accountInfo?.name || 'account'}`
          : result.error || "Invalid credentials",
        variant: result.isValid ? "default" : "destructive",
      });
    } catch (error) {
      toast({
        title: "Test Failed",
        description: error instanceof Error ? error.message : "Connection test failed",
        variant: "destructive",
      });
    }
  };

  const handleImport = (connection: BankConnection) => {
    setIsImporting(connection.id);
    syncMutation.mutate({ 
      id: connection.id, 
      days: connection.syncSettings?.dateRange || 30 
    });
  };

  const getProviderBadgeColor = (provider: string) => {
    switch (provider) {
      case 'wise': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'revolut': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusBadge = (connection: BankConnection) => {
    if (!connection.isActive) {
      return <Badge variant="secondary" className="bg-gray-100 text-gray-600">Inactive</Badge>;
    }
    
    if (connection.lastSyncAt) {
      const lastSync = new Date(connection.lastSyncAt);
      const daysSinceSync = Math.floor((Date.now() - lastSync.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceSync <= 1) {
        return <Badge variant="default" className="bg-green-100 text-green-800">Recently Synced</Badge>;
      } else if (daysSinceSync <= 7) {
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Sync Pending</Badge>;
      } else {
        return <Badge variant="destructive" className="bg-red-100 text-red-800">Outdated</Badge>;
      }
    }
    
    return <Badge variant="outline">Never Synced</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Bank Connections</h3>
          <p className="text-sm text-muted-foreground">
            Connect your bank accounts for automatic transaction import
          </p>
        </div>
        <Button onClick={() => setShowModal(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Connection
        </Button>
      </div>

      {connections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-4">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No Bank Connections</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Connect your bank accounts to automatically import transactions and keep your finances up to date.
            </p>
            <Button onClick={() => setShowModal(true)}>
              Connect First Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {connections.map((connection: BankConnection) => (
            <Card key={connection.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex flex-col">
                      <CardTitle className="text-base">
                        {connection.provider.charAt(0).toUpperCase() + connection.provider.slice(1)} Account
                      </CardTitle>
                      <CardDescription>
                        Account ID: {connection.providerAccountId}
                      </CardDescription>
                    </div>
                    <Badge className={getProviderBadgeColor(connection.provider)}>
                      {connection.provider}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(connection)}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(connection.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Created:</span><br />
                    {new Date(connection.createdAt!).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last Sync:</span><br />
                    {connection.lastSyncAt 
                      ? new Date(connection.lastSyncAt).toLocaleDateString()
                      : "Never"
                    }
                  </div>
                </div>

                {connection.syncSettings && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Sync Settings:</span><br />
                    Frequency: {connection.syncSettings.syncFrequency}, 
                    History: {connection.syncSettings.dateRange} days
                  </div>
                )}

                <Separator />

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testConnection(connection)}
                    disabled={!connection.isActive}
                  >
                    <TestTube className="h-4 w-4 mr-2" />
                    Test
                  </Button>

                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleImport(connection)}
                    disabled={!connection.isActive || isImporting === connection.id}
                  >
                    {isImporting === connection.id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Import Transactions
                  </Button>

                  {connection.syncSettings?.autoSync && (
                    <Badge variant="outline" className="ml-auto">
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Auto-sync enabled
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <BankConnectionModal
        open={showModal}
        onClose={() => setShowModal(false)}
        accountId={accountId}
      />
    </div>
  );
}