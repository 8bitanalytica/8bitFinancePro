import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, XCircle, Info } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { SupportedProvider } from "@shared/schema";

const bankConnectionSchema = z.object({
  accountId: z.string().min(1, "Account ID is required"),
  provider: z.enum(["wise", "revolut"]),
  providerAccountId: z.string().min(1, "Provider account ID is required"),
  accessToken: z.string().min(1, "Access token is required"),
  refreshToken: z.string().optional(),
  syncSettings: z.object({
    autoSync: z.boolean().default(false),
    syncFrequency: z.enum(["hourly", "daily", "weekly"]).default("daily"),
    importCategories: z.boolean().default(true),
    dateRange: z.number().min(1).max(365).default(30),
  }).default({
    autoSync: false,
    syncFrequency: "daily",
    importCategories: true,
    dateRange: 30,
  })
});

type BankConnectionForm = z.infer<typeof bankConnectionSchema>;

interface BankConnectionModalProps {
  open: boolean;
  onClose: () => void;
  accountId?: string;
}

interface ProviderInfo {
  id: SupportedProvider;
  name: string;
  authType: string;
  authUrl: string;
  instructions: string;
  requiredScopes: string[];
  testable: boolean;
}

export function BankConnectionModal({ open, onClose, accountId }: BankConnectionModalProps) {
  const [step, setStep] = useState<'provider' | 'credentials' | 'test' | 'settings'>('provider');
  const [selectedProvider, setSelectedProvider] = useState<SupportedProvider | null>(null);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [testResult, setTestResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<BankConnectionForm>({
    resolver: zodResolver(bankConnectionSchema),
    defaultValues: {
      accountId: accountId || "",
      provider: "wise",
      providerAccountId: "",
      accessToken: "",
      refreshToken: "",
      syncSettings: {
        autoSync: false,
        syncFrequency: "daily",
        importCategories: true,
        dateRange: 30,
      }
    }
  });

  const loadProviders = async () => {
    try {
      const data = await apiRequest("/api/supported-providers");
      setProviders(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load supported providers",
        variant: "destructive",
      });
    }
  };

  const testConnection = async () => {
    setIsLoading(true);
    try {
      const formData = form.getValues();
      const testResponse = await fetch('/api/bank-connections/test-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: formData.provider,
          accessToken: formData.accessToken,
          refreshToken: formData.refreshToken,
        }),
      });
      
      const result = await testResponse.json();
      setTestResult(result);
      
      if (result.isValid) {
        form.setValue('providerAccountId', result.accountInfo?.id || '');
        setStep('settings');
      }
    } catch (error) {
      setTestResult({ 
        isValid: false, 
        error: error instanceof Error ? error.message : "Connection test failed" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: BankConnectionForm) => {
    setIsLoading(true);
    try {
      await apiRequest("/api/bank-connections", {
        method: "POST",
        body: JSON.stringify(data),
      });

      queryClient.invalidateQueries({ queryKey: ["/api/bank-connections"] });
      toast({
        title: "Success",
        description: "Bank connection created successfully",
      });
      onClose();
      resetForm();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create bank connection",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setStep('provider');
    setSelectedProvider(null);
    setTestResult(null);
    form.reset();
  };

  React.useEffect(() => {
    if (open) {
      loadProviders();
    } else {
      resetForm();
    }
  }, [open]);

  const currentProvider = providers.find(p => p.id === selectedProvider);

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Connect Bank Account</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Step 1: Provider Selection */}
            {step === 'provider' && (
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Select Bank Provider</Label>
                  <p className="text-sm text-muted-foreground">Choose your banking service to connect</p>
                </div>
                
                <div className="grid gap-4">
                  {providers.map((provider) => (
                    <div
                      key={provider.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedProvider === provider.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => {
                        setSelectedProvider(provider.id);
                        form.setValue('provider', provider.id);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{provider.name}</h3>
                          <p className="text-sm text-muted-foreground">{provider.instructions}</p>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {provider.authType === 'api_key' ? 'API Key' : 'OAuth'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={() => setStep('credentials')}
                    disabled={!selectedProvider}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Credentials */}
            {step === 'credentials' && currentProvider && (
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Enter {currentProvider.name} Credentials</Label>
                  <p className="text-sm text-muted-foreground">
                    Provide your API credentials for read-only access
                  </p>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Setup Instructions:</strong><br />
                    1. Visit <a href={currentProvider.authUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">{currentProvider.authUrl}</a><br />
                    2. Create a new API token with read-only permissions<br />
                    3. Copy the token and paste it below
                  </AlertDescription>
                </Alert>

                <FormField
                  control={form.control}
                  name="accessToken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {currentProvider.authType === 'api_key' ? 'API Key' : 'Access Token'} *
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder={`Enter your ${currentProvider.name} ${currentProvider.authType === 'api_key' ? 'API key' : 'access token'}`}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {currentProvider.authType === 'oauth' && (
                  <FormField
                    control={form.control}
                    name="refreshToken"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Refresh Token (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Enter refresh token if available"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => setStep('provider')}>
                    Back
                  </Button>
                  <Button type="button" onClick={testConnection} disabled={isLoading || !form.watch('accessToken')}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test Connection"}
                  </Button>
                </div>

                {testResult && (
                  <Alert className={testResult.isValid ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                    {testResult.isValid ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
                    <AlertDescription>
                      {testResult.isValid ? (
                        <div>
                          <strong>Connection successful!</strong><br />
                          Account: {testResult.accountInfo?.name}<br />
                          Balance: {testResult.accountInfo?.balance} {testResult.accountInfo?.currency}
                        </div>
                      ) : (
                        <div>
                          <strong>Connection failed:</strong><br />
                          {testResult.error || "Invalid credentials"}
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Step 3: Sync Settings */}
            {step === 'settings' && (
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Sync Settings</Label>
                  <p className="text-sm text-muted-foreground">Configure how transactions are imported</p>
                </div>

                <FormField
                  control={form.control}
                  name="syncSettings.dateRange"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Import History (Days)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="365"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="syncSettings.syncFrequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Auto-Sync Frequency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="hourly">Hourly</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => setStep('credentials')}>
                    Back
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Create Connection
                  </Button>
                </div>
              </div>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}