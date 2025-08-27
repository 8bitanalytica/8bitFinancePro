import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { generalTransactionsApi, realEstateTransactionsApi, devicesApi, propertiesApi } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { insertGeneralTransactionSchema, insertRealEstateTransactionSchema, insertDeviceSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAppSettings } from "@/components/settings/settings";
import { useCurrency } from "@/lib/currency";
import { convertCurrency, formatConversion, type ConversionResult } from "@/lib/currency-converter";
import type { GeneralTransaction, RealEstateTransaction, Property } from "@shared/schema";
import { ReceiptUploader } from "@/components/upload/ReceiptUploader";

interface TransactionModalProps {
  transaction?: GeneralTransaction | RealEstateTransaction;
  onClose: () => void;
  type: "general" | "real-estate";
  properties?: Property[];
  selectedAccountId?: string;
}

export default function TransactionModal({ transaction, onClose, type, properties = [], selectedAccountId }: TransactionModalProps) {
  const { toast } = useToast();
  const settings = useAppSettings();
  const currency = useCurrency();
  const isEditing = !!transaction && !!(transaction as any).id;
  const isRealEstate = type === "real-estate";

  // Fetch properties for Real Estate category
  const { data: propertiesList = [] } = useQuery({
    queryKey: ['/api/properties'],
    enabled: !isRealEstate, // Only fetch when in general finances
  }) as { data: Array<{ id: number; name: string; address: string }> };

  // Fetch devices for Device category
  const { data: devicesList = [] } = useQuery({
    queryKey: ['/api/devices'],
    enabled: !isRealEstate, // Only fetch when in general finances
  }) as { data: Array<{ id: number; name: string; brand: string; model: string }> };

  const getCurrencySymbol = (code: string) => {
    const currencies = {
      USD: "$", EUR: "€", GBP: "£", JPY: "¥", CAD: "C$", AUD: "A$", 
      CHF: "CHF", CNY: "¥", INR: "₹", BRL: "R$"
    };
    return currencies[code as keyof typeof currencies] || code;
  };

  // For now, use general categories until form is initialized
  const categories = isRealEstate ? settings.realEstateCategories : settings.generalCategories;

  // Recurring transaction states
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringData, setRecurringData] = useState({
    name: "",
    frequency: "monthly",
    intervalCount: 1,
    startDate: new Date().toISOString().split('T')[0],
    endDate: undefined as string | undefined,
  });

  // Real Estate subcategories
  const realEstateSubcategories = [
    "Gas",
    "Electricity", 
    "Water",
    "Heating",
    "Internet/Cable",
    "Property Tax",
    "Insurance",
    "Maintenance",
    "Repairs",
    "HOA Fees",
    "Security",
    "Cleaning",
    "Landscaping",
    "Other Utilities"
  ];

  const baseSchema = isRealEstate ? insertRealEstateTransactionSchema : insertGeneralTransactionSchema;
  const formSchema = baseSchema.extend({
    date: z.string().min(1, "Date is required"),
    time: z.string().min(1, "Time is required"),
    // Account fields for transfers and regular transactions (only for general finances)
    ...(isRealEstate ? {} : {
      fromAccountId: z.string().optional(),
      toAccountId: z.string().optional(),
    }),
    // Real Estate fields (only used when category is 'Real Estate')
    propertyId: z.number().optional(),
    realEstateSubcategory: z.string().optional(),
    // Device fields (only used when category is 'Device')
    deviceId: z.number().optional(),
    deviceName: z.string().optional(),
    deviceBrand: z.string().optional(),
    deviceModel: z.string().optional(),
    deviceType: z.string().optional(),
    deviceSerialNumber: z.string().optional(),
    deviceWarrantyExpiry: z.string().optional(),
    deviceAlertDaysBefore: z.number().optional(),
    deviceLocation: z.string().optional(),
    deviceAssignedTo: z.string().optional(),
    deviceStatus: z.string().optional(),
    deviceReceiptImage: z.string().optional(),
    deviceImage: z.string().optional(),
  }).superRefine((data, ctx) => {
    // Validate device name is required when category is 'Device'
    if (data.category === 'Device' && !data.deviceName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Device name is required when category is 'Device'",
        path: ['deviceName'],
      });
    }
    
    // Validate property selection is required when category is 'Real Estate'
    if (data.category === 'Real Estate' && !data.propertyId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Property selection is required when category is 'Real Estate'",
        path: ['propertyId'],
      });
    }
    
    // Validate real estate subcategory is required when category is 'Real Estate'
    if (data.category === 'Real Estate' && !data.realEstateSubcategory?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Real estate subcategory is required when category is 'Real Estate'",
        path: ['realEstateSubcategory'],
      });
    }
    
    // Validate transfer fields
    if (data.type === 'transfer') {
      if (!data.fromAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "From account is required for transfers",
          path: ['fromAccountId'],
        });
      }
      if (!data.toAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "To account is required for transfers",
          path: ['toAccountId'],
        });
      }
      if (data.fromAccountId === data.toAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "From and to accounts must be different",
          path: ['toAccountId'],
        });
      }
    } else {
      // For regular transactions, validate account selection
      if (!isRealEstate && !data.toAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Account selection is required",
          path: ['toAccountId'],
        });
      }
    }
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditing ? {
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      category: transaction.category,
      date: new Date(transaction.date).toISOString().split('T')[0],
      time: new Date(transaction.date).toTimeString().slice(0, 5),
      ...(isRealEstate && 'propertyId' in transaction && { propertyId: transaction.propertyId }),
      // Account fields (only for general finances)
      ...(!isRealEstate && {
        fromAccountId: ('fromAccountId' in transaction ? transaction.fromAccountId : "") || "",
        toAccountId: ('toAccountId' in transaction ? transaction.toAccountId : "") || "",
      }),
      // Real Estate fields defaults
      propertyId: ('propertyId' in transaction ? transaction.propertyId : undefined) || undefined,
      realEstateSubcategory: ('realEstateSubcategory' in transaction ? transaction.realEstateSubcategory : "") || "",
      // Device fields defaults
      deviceId: ('deviceId' in transaction ? transaction.deviceId : undefined) || undefined,
      deviceName: "",
      deviceBrand: "",
      deviceModel: "",
      deviceType: "electronics",
      deviceSerialNumber: "",
      deviceWarrantyExpiry: "",
      deviceAlertDaysBefore: 30,
      deviceLocation: "",
      deviceAssignedTo: "",
      deviceStatus: "active",
      deviceReceiptImage: "",
      deviceImage: "",
      receiptUrl: ('receiptUrl' in transaction ? transaction.receiptUrl : "") || "",
    } : {
      type: "expense",
      amount: "",
      description: "",
      category: "",
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      ...(isRealEstate && { propertyId: 0 }),
      // Account fields (only for general finances)
      ...(!isRealEstate && {
        fromAccountId: selectedAccountId || "",
        toAccountId: selectedAccountId || "",
      }),
      // Real Estate fields defaults
      propertyId: undefined,
      realEstateSubcategory: "",
      // Device fields defaults
      deviceId: undefined,
      deviceName: "",
      deviceBrand: "",
      deviceModel: "",
      deviceType: "electronics",
      deviceSerialNumber: "",
      deviceWarrantyExpiry: "",
      deviceAlertDaysBefore: 30,
      deviceLocation: "",
      deviceAssignedTo: "",
      deviceStatus: "active",
      deviceReceiptImage: "",
      deviceImage: "",
      receiptUrl: "",
    },
  });

  const watchedCategory = form.watch("category");
  const watchedType = form.watch("type");
  const watchedToAccountId = form.watch("toAccountId");
  const isDeviceCategory = watchedCategory === "Device";
  const isRealEstateCategory = watchedCategory === "Real Estate";
  const isTransfer = watchedType === "transfer";

  // Get categories based on transaction type and module
  const getCategories = () => {
    if (isRealEstate) {
      return settings.realEstateCategories || [];
    }
    
    // For general finances, use the appropriate categorized lists
    if (watchedType === "income") {
      return settings.generalIncomeCategories || [];
    } else if (watchedType === "expense") {
      return settings.generalExpenseCategories || [];
    } else if (watchedType === "transfer") {
      return settings.generalTransferCategories || [];
    }
    
    // Fallback to legacy categories
    return settings.generalCategories || [];
  };

  const dynamicCategories = getCategories();

  // When there's a selectedAccountId, get that account info
  // Otherwise use the account from the form
  const selectedAccount = selectedAccountId 
    ? settings.bankAccounts.find(acc => acc.id === selectedAccountId)
    : watchedToAccountId 
    ? settings.bankAccounts.find(acc => acc.id === watchedToAccountId)
    : null;

  // Clear transfer account fields when switching to transfer to force user selection
  useEffect(() => {
    if (isTransfer && !isEditing) {
      form.setValue("fromAccountId" as any, "");
      form.setValue("toAccountId" as any, "");
    }
  }, [isTransfer, form, isEditing]);

  const watchedFromAccountId = form.watch("fromAccountId");
  const fromAccount = watchedFromAccountId 
    ? settings.bankAccounts.find(acc => acc.id === watchedFromAccountId)
    : null;
  const toAccount = watchedToAccountId 
    ? settings.bankAccounts.find(acc => acc.id === watchedToAccountId)
    : null;

  // Check if this is a cross-currency transfer
  const isCrossCurrencyTransfer = isTransfer && fromAccount && toAccount && 
    fromAccount.currency !== toAccount.currency;

  // State for currency conversion
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionError, setConversionError] = useState<string | null>(null);
  const [manualConversion, setManualConversion] = useState(false);
  const [toAmount, setToAmount] = useState("");

  // Watch for amount changes to trigger currency conversion
  const watchedAmount = form.watch("amount");

  // Auto-convert currency when amount, from account, or to account changes for cross-currency transfers
  useEffect(() => {
    if (isCrossCurrencyTransfer && watchedAmount && parseFloat(watchedAmount) > 0) {
      handleCurrencyConversion();
    } else {
      setConversionResult(null);
      setConversionError(null);
    }
  }, [watchedAmount, watchedFromAccountId, watchedToAccountId, isCrossCurrencyTransfer]);

  const handleCurrencyConversion = async () => {
    if (!fromAccount || !toAccount || !watchedAmount) return;

    setIsConverting(true);
    setConversionError(null);

    try {
      const result = await convertCurrency(
        parseFloat(watchedAmount),
        fromAccount.currency,
        toAccount.currency
      );
      setConversionResult(result);
    } catch (error) {
      setConversionError(error instanceof Error ? error.message : 'Conversion failed');
      setConversionResult(null);
    } finally {
      setIsConverting(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      // Validate amount for cross-currency transfers
      if (values.type === 'transfer' && isCrossCurrencyTransfer) {
        if (manualConversion) {
          // Manual conversion - validate both amounts are provided
          if (!values.amount || !toAmount || parseFloat(values.amount) <= 0 || parseFloat(toAmount) <= 0) {
            toast({
              title: "Invalid amounts",
              description: "Please enter valid amounts for both source and destination accounts.",
              variant: "destructive",
            });
            return;
          }
        } else if (!conversionResult) {
          // Automatic conversion - wait for conversion to complete
          toast({
            title: "Currency conversion required",
            description: "Please wait for currency conversion to complete before submitting.",
            variant: "destructive",
          });
          return;
        }
      }

      if (isRealEstate) {
        const realEstateData = {
          type: values.type,
          amount: values.amount,
          description: values.description,
          category: values.category,
          date: new Date(`${values.date}T${values.time}:00`),
          propertyId: (values as any).propertyId || 0,
        };

        if (isEditing && 'propertyId' in transaction) {
          await realEstateTransactionsApi.update(transaction.id, realEstateData);
          toast({ title: "Transaction updated successfully" });
        } else {
          await realEstateTransactionsApi.create(realEstateData);
          toast({ title: "Transaction created successfully" });
        }
      } else {
        let finalDescription = values.description;
        
        // Add conversion info to description for cross-currency transfers
        if (values.type === 'transfer' && isCrossCurrencyTransfer) {
          if (manualConversion && toAmount) {
            // Manual conversion - store both amounts
            finalDescription += ` | Manual conversion: ${values.amount} ${fromAccount?.currency} → ${toAmount} ${toAccount?.currency}`;
          } else if (conversionResult) {
            // Automatic conversion
            finalDescription += ` | Exchange: ${formatConversion(conversionResult)}`;
          }
        }

        const generalData = {
          type: values.type,
          amount: values.amount,
          description: finalDescription,
          category: values.category,
          date: new Date(`${values.date}T${values.time}:00`),
          fromAccountId: (values as any).fromAccountId || null,
          toAccountId: (values as any).toAccountId || null,
        };

        if (isEditing) {
          await generalTransactionsApi.update(transaction.id, generalData);
          
          // If category is 'Real Estate' and we have the required fields, also update real estate
          if (values.category === "Real Estate" && values.propertyId && values.realEstateSubcategory) {
            await realEstateTransactionsApi.create({
              propertyId: values.propertyId,
              type: values.type,
              amount: values.amount,
              description: `${values.description} (${values.realEstateSubcategory})`,
              category: values.realEstateSubcategory,
              date: new Date(`${values.date}T${values.time}:00`),
            });
            toast({ title: "Transaction updated in both accounts and real estate" });
          } else {
            toast({ title: "Transaction updated successfully" });
          }
        } else {
          await generalTransactionsApi.create(generalData);
          
          // If recurring is enabled, create a recurring transaction
          if (isRecurring && values.type === "expense") {
            // Calculate next due date based on frequency
            const calculateNextDueDate = (startDate: Date, frequency: string, intervalCount: number) => {
              const nextDate = new Date(startDate);
              switch (frequency) {
                case 'daily':
                  nextDate.setDate(nextDate.getDate() + intervalCount);
                  break;
                case 'weekly':
                  nextDate.setDate(nextDate.getDate() + (intervalCount * 7));
                  break;
                case 'monthly':
                  nextDate.setMonth(nextDate.getMonth() + intervalCount);
                  break;
                case 'quarterly':
                  nextDate.setMonth(nextDate.getMonth() + (intervalCount * 3));
                  break;
                case 'yearly':
                  nextDate.setFullYear(nextDate.getFullYear() + intervalCount);
                  break;
              }
              return nextDate;
            };

            const startDate = new Date(recurringData.startDate);
            const nextDueDate = calculateNextDueDate(startDate, recurringData.frequency, recurringData.intervalCount);

            const recurringTransactionData = {
              module: "general",
              name: recurringData.name || values.description,
              type: values.type,
              amount: values.amount,
              description: values.description,
              category: values.category,
              frequency: recurringData.frequency,
              intervalCount: recurringData.intervalCount,
              startDate: startDate,
              endDate: recurringData.endDate ? new Date(recurringData.endDate) : null,
              nextDueDate: nextDueDate,
              accountId: (values as any).toAccountId,
              isActive: true,
            };
            
            try {
              await fetch('/api/recurring-transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(recurringTransactionData),
              });
              toast({ title: "Transaction and recurring schedule created successfully" });
            } catch (error) {
              console.error('Error creating recurring transaction:', error);
              toast({ title: "Transaction created, but recurring schedule failed" });
            }
          }
          
          // If category is 'Device', also create a device record
          if (values.category === "Device" && values.deviceName) {
            const deviceData = {
              name: values.deviceName,
              brand: values.deviceBrand || "",
              model: values.deviceModel || "",
              type: values.deviceType || "electronics",
              serialNumber: values.deviceSerialNumber || "",
              purchaseDate: new Date(`${values.date}T${values.time}:00`),
              purchasePrice: values.amount,
              warrantyExpiry: values.deviceWarrantyExpiry ? new Date(values.deviceWarrantyExpiry) : undefined,
              alertDaysBefore: values.deviceAlertDaysBefore || 30,
              location: values.deviceLocation || "",
              assignedTo: values.deviceAssignedTo || "",
              status: values.deviceStatus || "active",
              receiptImage: values.deviceReceiptImage || "",
              deviceImage: values.deviceImage || "",
              notes: values.description || "",
            };
            
            await devicesApi.create(deviceData);
            toast({ title: "Transaction and device created successfully" });
          } else if (values.category === "Real Estate" && values.propertyId && values.realEstateSubcategory) {
            // Also create entry in real estate transactions for dual tracking
            await realEstateTransactionsApi.create({
              propertyId: values.propertyId,
              type: values.type,
              amount: values.amount,
              description: `${values.description} (${values.realEstateSubcategory})`,
              category: values.realEstateSubcategory,
              date: new Date(`${values.date}T${values.time}:00`),
            });
            toast({ title: "Transaction created in both accounts and real estate" });
          } else {
            toast({ title: "Transaction created successfully" });
          }
        }
      }

      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save transaction. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Transaction" : "Add Transaction"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Update the transaction details below." 
              : "Fill in the details to add a new transaction."
            }
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* STEP 1: Transaction Type - Always first */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Transaction Type</h3>
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Select transaction type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="income">💰 Income</SelectItem>
                        <SelectItem value="expense">💸 Expense</SelectItem>
                        {!isRealEstate && <SelectItem value="transfer">🔄 Transfer</SelectItem>}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* STEP 2: Account Selection based on transaction type */}
            {isTransfer ? (
              /* Transfer Account Selection - Always show both dropdowns */
              <div className="bg-blue-50 p-4 rounded-lg space-y-4">
                <h3 className="text-sm font-semibold text-blue-800 mb-3">Transfer Accounts</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fromAccountId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>From Account</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value as string || undefined}>
                          <FormControl>
                            <SelectTrigger className="h-12">
                              <SelectValue placeholder="Select from account" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {settings.bankAccounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.name} ({account.currency})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="toAccountId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>To Account</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value as string || undefined}>
                          <FormControl>
                            <SelectTrigger className="h-12">
                              <SelectValue placeholder="Select to account" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {settings.bankAccounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.name} ({account.currency})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            ) : (
              /* Income/Expense Account Selection */
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-green-800 mb-3">Account</h3>
                
                {!isRealEstate && !selectedAccountId ? (
                  /* All Accounts view - show dropdown */
                  <FormField
                    control={form.control}
                    name="toAccountId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value as string || undefined}>
                          <FormControl>
                            <SelectTrigger className="h-12">
                              <SelectValue placeholder="Select account" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {settings.bankAccounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.name} ({account.currency})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  /* Specific account context - show pre-selected */
                  <div className="space-y-2">
                    <FormLabel>Account</FormLabel>
                    <div className="flex items-center justify-between p-3 bg-white border border-green-200 rounded-md">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: selectedAccount?.color }}
                        />
                        <div>
                          <span className="font-medium text-gray-900">{selectedAccount?.name}</span>
                          <span className="text-sm text-gray-600 ml-2">({selectedAccount?.currency})</span>
                        </div>
                      </div>
                      <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                        Pre-selected
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: Amount Section */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Amount</h3>
              
              {isTransfer && isCrossCurrencyTransfer ? (
                /* Cross-currency transfer - show manual conversion option */
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-sm font-medium text-gray-700">Conversion Method</label>
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant={!manualConversion ? "default" : "outline"}
                        size="sm"
                        onClick={() => setManualConversion(false)}
                      >
                        Auto Convert
                      </Button>
                      <Button
                        type="button"
                        variant={manualConversion ? "default" : "outline"}
                        size="sm"
                        onClick={() => setManualConversion(true)}
                      >
                        Manual Convert
                      </Button>
                    </div>
                  </div>

                  {manualConversion ? (
                    /* Manual conversion - two separate amount fields */
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Amount From ({fromAccount?.currency}) {getCurrencySymbol(fromAccount?.currency || '')}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div>
                        <FormLabel>
                          Amount To ({toAccount?.currency}) {getCurrencySymbol(toAccount?.currency || '')}
                        </FormLabel>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={toAmount}
                          onChange={(e) => setToAmount(e.target.value)}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Enter the exact amount to be deposited
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Automatic conversion - single amount field */
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Amount ({fromAccount?.currency}) {getCurrencySymbol(fromAccount?.currency || '')}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                          <p className="text-xs text-gray-500">
                            Amount will be automatically converted to {toAccount?.currency}
                          </p>
                          
                          {/* Live Conversion Display */}
                          {isConverting && (
                            <div className="flex items-center gap-2 text-blue-600 text-sm">
                              <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                              Converting...
                            </div>
                          )}
                          {conversionError && (
                            <div className="text-red-600 text-xs">
                              Conversion error: {conversionError}
                            </div>
                          )}
                          {conversionResult && !isConverting && (
                            <div className="text-sm text-green-700">
                              → {getCurrencySymbol(toAccount?.currency || '')}{conversionResult.convertedAmount} 
                              <span className="text-gray-500 ml-1">(Rate: {conversionResult.exchangeRate.toFixed(4)})</span>
                            </div>
                          )}
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              ) : (
                /* Regular amount field for non-cross-currency transactions */
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Amount ({selectedAccount ? getCurrencySymbol(selectedAccount.currency) : 
                          fromAccount ? getCurrencySymbol(fromAccount.currency) : 
                          currency.symbol})
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Recurring Transaction Section - Only for Expenses */}
            {(watchedType === "expense" && !isRealEstate) && (
              <div className="space-y-4 p-4 border rounded-lg bg-purple-50">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isRecurring"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <label htmlFor="isRecurring" className="text-sm font-medium text-purple-900">
                    🔄 Make this a recurring expense
                  </label>
                </div>

                {isRecurring && (
                  <div className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Frequency
                        </label>
                        <select
                          value={recurringData.frequency}
                          onChange={(e) => setRecurringData(prev => ({ ...prev, frequency: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Quarterly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Every
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={recurringData.intervalCount}
                          onChange={(e) => setRecurringData(prev => ({ ...prev, intervalCount: parseInt(e.target.value) || 1 }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={recurringData.startDate}
                          onChange={(e) => setRecurringData(prev => ({ ...prev, startDate: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          End Date (Optional)
                        </label>
                        <input
                          type="date"
                          value={recurringData.endDate || ""}
                          onChange={(e) => setRecurringData(prev => ({ ...prev, endDate: e.target.value || undefined }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Recurring Name
                        </label>
                        <input
                          type="text"
                          value={recurringData.name}
                          onChange={(e) => setRecurringData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Monthly Rent, Weekly Groceries, etc."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                    </div>

                    <div className="text-xs text-purple-600 bg-purple-100 p-2 rounded">
                      <strong>Note:</strong> This will create a recurring expense that automatically generates transactions on the specified schedule. You can manage all recurring transactions from the Dashboard.
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {dynamicCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter description"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Receipt Upload - For expense transactions only */}
              {(watchedType === "expense" || isRealEstate) && (
                <ReceiptUploader
                  currentReceiptUrl={form.watch("receiptUrl" as any) || ""}
                  onUploadComplete={(receiptUrl) => {
                    form.setValue("receiptUrl" as any, receiptUrl);
                  }}
                  onRemoveReceipt={() => {
                    form.setValue("receiptUrl" as any, "");
                  }}
                  disabled={form.formState.isSubmitting}
                />
              )}

              {/* Real Estate specific fields when category is 'Real Estate' */}
              {isRealEstateCategory && (
                <div className="space-y-4 p-4 border rounded-lg bg-orange-50">
                  <h3 className="font-semibold text-orange-900">Real Estate Information</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="propertyId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Property</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString() || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select property" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {propertiesList.map((property) => (
                                <SelectItem key={property.id} value={property.id.toString()}>
                                  {property.name} - {property.address}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="realEstateSubcategory"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subcategory</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select subcategory" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {realEstateSubcategories.map((subcategory) => (
                                <SelectItem key={subcategory} value={subcategory}>
                                  {subcategory}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Property Selection for Real Estate module */}
              {isRealEstate && (
                <FormField
                  control={form.control}
                  name="propertyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString() || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select property" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {properties.map((property) => (
                            <SelectItem key={property.id} value={property.id.toString()}>
                              {property.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>



            {/* Device-specific fields when category is 'Device' */}
            {isDeviceCategory && (
              <div className="space-y-4 p-4 border rounded-lg bg-blue-50">
                <h3 className="font-semibold text-blue-900">Device Information</h3>
                
                <FormField
                  control={form.control}
                  name="deviceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Existing Device (Optional)</FormLabel>
                      <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)} value={field.value?.toString() || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select existing device or leave empty for new" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Create new device</SelectItem>
                          {devicesList.map((device) => (
                            <SelectItem key={device.id} value={device.id.toString()}>
                              {device.name} - {device.brand} {device.model}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="deviceName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Device Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., iPhone 15" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="deviceBrand"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Brand</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Apple" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="deviceModel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Model</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Pro Max" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="deviceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="electronics">Electronics</SelectItem>
                            <SelectItem value="appliance">Appliance</SelectItem>
                            <SelectItem value="computer">Computer</SelectItem>
                            <SelectItem value="phone">Phone</SelectItem>
                            <SelectItem value="tablet">Tablet</SelectItem>
                            <SelectItem value="tv">TV</SelectItem>
                            <SelectItem value="audio">Audio</SelectItem>
                            <SelectItem value="gaming">Gaming</SelectItem>
                            <SelectItem value="kitchen">Kitchen</SelectItem>
                            <SelectItem value="cleaning">Cleaning</SelectItem>
                            <SelectItem value="tools">Tools</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="deviceSerialNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Serial Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Device serial number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="deviceStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                            <SelectItem value="retired">Retired</SelectItem>
                            <SelectItem value="broken">Broken</SelectItem>
                            <SelectItem value="lost">Lost</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="deviceLocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Living Room" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="deviceAssignedTo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assigned To</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="deviceWarrantyExpiry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Warranty Expiry</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="deviceAlertDaysBefore"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alert Days Before</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="30" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {isRealEstate && (
              <FormField
                control={form.control}
                name="propertyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value ? String(field.value) : ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select property" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {properties.map((property) => (
                          <SelectItem key={property.id} value={property.id.toString()}>
                            {property.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-blue-700">
                {isEditing ? "Update" : "Add"} Transaction
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
