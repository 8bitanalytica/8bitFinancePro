import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { generalTransactionsApi, realEstateTransactionsApi, devicesApi } from "@/lib/api";
import { insertGeneralTransactionSchema, insertRealEstateTransactionSchema, insertDeviceSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAppSettings } from "@/components/settings/settings";
import { useCurrency } from "@/lib/currency";
import { convertCurrency, formatConversion, type ConversionResult } from "@/lib/currency-converter";
import type { GeneralTransaction, RealEstateTransaction, Property } from "@shared/schema";

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
  const isEditing = !!transaction;
  const isRealEstate = type === "real-estate";

  const getCurrencySymbol = (code: string) => {
    const currencies = {
      USD: "$", EUR: "€", GBP: "£", JPY: "¥", CAD: "C$", AUD: "A$", 
      CHF: "CHF", CNY: "¥", INR: "₹", BRL: "R$"
    };
    return currencies[code as keyof typeof currencies] || code;
  };

  const categories = isRealEstate ? settings.realEstateCategories : settings.generalCategories;

  const baseSchema = isRealEstate ? insertRealEstateTransactionSchema : insertGeneralTransactionSchema;
  const formSchema = baseSchema.extend({
    date: z.string().min(1, "Date is required"),
    time: z.string().min(1, "Time is required"),
    // Account fields for transfers and regular transactions (only for general finances)
    ...(isRealEstate ? {} : {
      fromAccountId: z.string().optional(),
      toAccountId: z.string().optional(),
    }),
    // Device fields (only used when category is 'Device')
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
      // Device fields defaults
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
      // Device fields defaults
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
    },
  });

  const watchedCategory = form.watch("category");
  const watchedType = form.watch("type");
  const watchedToAccountId = form.watch("toAccountId");
  const isDeviceCategory = watchedCategory === "Device";
  const isTransfer = watchedType === "transfer";

  // When there's a selectedAccountId, get that account info
  // Otherwise use the account from the form
  const selectedAccount = selectedAccountId 
    ? settings.bankAccounts.find(acc => acc.id === selectedAccountId)
    : watchedToAccountId 
    ? settings.bankAccounts.find(acc => acc.id === watchedToAccountId)
    : null;

  // Update form values when switching to transfer and there's a selectedAccountId
  useEffect(() => {
    if (isTransfer && selectedAccountId && !isEditing) {
      form.setValue("fromAccountId", selectedAccountId);
      // Clear toAccountId to force user to select destination
      form.setValue("toAccountId", "");
    }
  }, [isTransfer, selectedAccountId, form, isEditing]);

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
      if (values.type === 'transfer' && isCrossCurrencyTransfer && !conversionResult) {
        toast({
          title: "Currency conversion required",
          description: "Please wait for currency conversion to complete before submitting.",
          variant: "destructive",
        });
        return;
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
        if (values.type === 'transfer' && conversionResult) {
          finalDescription += ` | Exchange: ${formatConversion(conversionResult)}`;
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
          toast({ title: "Transaction updated successfully" });
        } else {
          await generalTransactionsApi.create(generalData);
          
          // If category is 'Device', also create a device record
          if (values.category === "Device" && values.deviceName) {
            const deviceData = {
              name: values.deviceName,
              brand: values.deviceBrand || "",
              model: values.deviceModel || "",
              type: values.deviceType || "electronics",
              serialNumber: values.deviceSerialNumber || "",
              purchaseDate: new Date(values.date),
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
      <DialogContent className={`${isDeviceCategory ? 'sm:max-w-[700px]' : 'sm:max-w-[425px]'} max-h-[80vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Transaction" : "Add Transaction"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
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
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                      {!isRealEstate && <SelectItem value="transfer">Transfer</SelectItem>}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Amount ({selectedAccount ? getCurrencySymbol(selectedAccount.currency) : currency.symbol})
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
                      {categories.map((category) => (
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

            {/* Account Selection for General Finances */}
            {!isRealEstate && (
              <>
                {/* Transfer fields */}
                {isTransfer ? (
                  selectedAccountId ? (
                    /* When in an account context, show the selected account as "From" and dropdown for "To" */
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <FormLabel>From Account</FormLabel>
                        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-md">
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
                          <span className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded">
                            Current Account
                          </span>
                        </div>
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="toAccountId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>To Account</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value as string || undefined}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select destination account" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {settings.bankAccounts
                                  .filter(account => account.id !== selectedAccountId)
                                  .map((account) => (
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
                  ) : (
                    /* No account pre-selected - show both dropdowns */
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="fromAccountId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>From Account</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value as string || undefined}>
                              <FormControl>
                                <SelectTrigger>
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
                                <SelectTrigger>
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
                  )
                ) : (
                  /* Regular transaction account field */
                  selectedAccountId ? (
                    /* Account is pre-selected from sidebar - show read-only info */
                    <div className="space-y-2">
                      <FormLabel>Account</FormLabel>
                      <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-md">
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
                        <span className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded">
                          Pre-selected
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Transaction will be added to this account. Currency: {selectedAccount?.currency}
                      </p>
                    </div>
                  ) : (
                    /* No account pre-selected - show dropdown */
                    <FormField
                      control={form.control}
                      name="toAccountId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value as string || undefined}>
                            <FormControl>
                              <SelectTrigger>
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
                  )
                )}
              </>
            )}

            {/* Currency Conversion Display for Cross-Currency Transfers */}
            {isCrossCurrencyTransfer && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Currency Conversion</h4>
                {isConverting ? (
                  <div className="flex items-center gap-2 text-blue-700">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>Converting currency...</span>
                  </div>
                ) : conversionError ? (
                  <div className="text-red-600 text-sm">
                    <strong>Error:</strong> {conversionError}
                  </div>
                ) : conversionResult ? (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-700">From ({fromAccount?.currency}):</span>
                      <span className="font-medium">{getCurrencySymbol(fromAccount?.currency || '')}{conversionResult.originalAmount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-700">To ({toAccount?.currency}):</span>
                      <span className="font-medium text-green-700">{getCurrencySymbol(toAccount?.currency || '')}{conversionResult.convertedAmount}</span>
                    </div>
                    <div className="text-xs text-blue-600 pt-1 border-t border-blue-200">
                      Exchange rate: 1 {fromAccount?.currency} = {conversionResult.exchangeRate.toFixed(4)} {toAccount?.currency}
                      <br />
                      Rate updated: {new Date(conversionResult.date).toLocaleString()}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-blue-600">
                    Enter an amount to see the live conversion from {fromAccount?.currency} to {toAccount?.currency}
                  </div>
                )}
              </div>
            )}

            {/* Device-specific fields when category is 'Device' */}
            {isDeviceCategory && (
              <div className="space-y-4 p-4 border rounded-lg bg-blue-50">
                <h3 className="font-semibold text-blue-900">Device Information</h3>
                
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
