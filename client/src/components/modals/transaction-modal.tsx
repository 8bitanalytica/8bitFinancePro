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

  const categories = isRealEstate ? settings.realEstateCategories : settings.generalCategories;

  const baseSchema = isRealEstate ? insertRealEstateTransactionSchema : insertGeneralTransactionSchema;
  const formSchema = baseSchema.extend({
    date: z.string().min(1, "Date is required"),
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
      ...(isRealEstate && { propertyId: 0 }),
      // Account fields (only for general finances)
      ...(!isRealEstate && {
        fromAccountId: "",
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
  const isDeviceCategory = watchedCategory === "Device";
  const isTransfer = watchedType === "transfer";

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (isRealEstate) {
        const realEstateData = {
          type: values.type,
          amount: values.amount,
          description: values.description,
          category: values.category,
          date: values.date,
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
        const generalData = {
          type: values.type,
          amount: values.amount,
          description: values.description,
          category: values.category,
          date: values.date,
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
                  <FormLabel>Amount ({currency.symbol})</FormLabel>
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
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="fromAccountId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>From Account</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select from account" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {settings.bankAccounts.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  {account.name}
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
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select to account" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {settings.bankAccounts.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  {account.name}
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
                  /* Regular transaction account field */
                  <FormField
                    control={form.control}
                    name="toAccountId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select account" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {settings.bankAccounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </>
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
