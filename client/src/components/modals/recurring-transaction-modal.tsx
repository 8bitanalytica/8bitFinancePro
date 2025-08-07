import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { CalendarIcon, Plus, Settings } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Property, Device, RecurringTransaction, InsertRecurringTransaction } from "@shared/schema";

const recurringTransactionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["income", "expense"], { required_error: "Type is required" }),
  amount: z.string().min(1, "Amount is required").refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "Amount must be a positive number"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  accountId: z.string().optional(),
  frequency: z.enum(["daily", "weekly", "monthly", "quarterly", "yearly"], { required_error: "Frequency is required" }),
  intervalCount: z.number().min(1, "Interval must be at least 1").default(1),
  startDate: z.date({ required_error: "Start date is required" }),
  endDate: z.date().optional(),
  totalOccurrences: z.number().min(1).optional(),
  isActive: z.boolean().default(true),
  module: z.enum(["general", "real-estate", "devices"]).default("general"),
  propertyId: z.number().optional(),
  deviceId: z.number().optional(),
});

type RecurringTransactionFormData = z.infer<typeof recurringTransactionSchema>;

interface RecurringTransactionModalProps {
  transaction?: RecurringTransaction;
  module: string;
  onClose?: () => void;
  trigger?: React.ReactNode;
}

export function RecurringTransactionModal({ 
  transaction, 
  module, 
  onClose,
  trigger = <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Recurring</Button>
}: RecurringTransactionModalProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch properties for real estate module
  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
    enabled: module === "real-estate",
  });

  // Fetch devices for devices module
  const { data: devices = [] } = useQuery<Device[]>({
    queryKey: ["/api/devices"],
    enabled: module === "devices",
  });

  const form = useForm<RecurringTransactionFormData>({
    resolver: zodResolver(recurringTransactionSchema),
    defaultValues: {
      name: transaction?.name || "",
      type: (transaction?.type as "income" | "expense") || "expense",
      amount: transaction?.amount || "",
      description: transaction?.description || "",
      category: transaction?.category || "",
      accountId: transaction?.accountId || "",
      frequency: (transaction?.frequency as any) || "monthly",
      intervalCount: transaction?.intervalCount || 1,
      startDate: transaction?.startDate ? new Date(transaction.startDate) : new Date(),
      endDate: transaction?.endDate ? new Date(transaction.endDate) : undefined,
      totalOccurrences: transaction?.totalOccurrences || undefined,
      isActive: transaction?.isActive ?? true,
      module: module as any,
      propertyId: transaction?.propertyId || undefined,
      deviceId: transaction?.deviceId || undefined,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertRecurringTransaction) => {
      const response = await fetch("/api/recurring-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create recurring transaction");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recurring-transactions"] });
      setOpen(false);
      onClose?.();
      toast({
        title: "Success",
        description: "Recurring transaction created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create recurring transaction",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<InsertRecurringTransaction>) => {
      const response = await fetch(`/api/recurring-transactions/${transaction?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update recurring transaction");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recurring-transactions"] });
      setOpen(false);
      onClose?.();
      toast({
        title: "Success",
        description: "Recurring transaction updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update recurring transaction",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RecurringTransactionFormData) => {
    const submitData: InsertRecurringTransaction = {
      ...data,
      amount: data.amount,
      nextDueDate: data.startDate,
      module,
    };

    if (transaction) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const getCategories = () => {
    const settings = JSON.parse(localStorage.getItem('financialSettings') || '{}');
    const moduleKey = module === 'real-estate' ? 'realEstate' : module;
    const categories = settings.categories?.[moduleKey] || {};
    
    return form.watch("type") === "income" 
      ? categories.income || []
      : categories.expenses || [];
  };

  const getBankAccounts = () => {
    const settings = JSON.parse(localStorage.getItem('financialSettings') || '{}');
    return settings.bankAccounts || [];
  };

  useEffect(() => {
    if (open) {
      form.reset({
        name: transaction?.name || "",
        type: (transaction?.type as "income" | "expense") || "expense",
        amount: transaction?.amount || "",
        description: transaction?.description || "",
        category: transaction?.category || "",
        accountId: transaction?.accountId || "",
        frequency: (transaction?.frequency as any) || "monthly",
        intervalCount: transaction?.intervalCount || 1,
        startDate: transaction?.startDate ? new Date(transaction.startDate) : new Date(),
        endDate: transaction?.endDate ? new Date(transaction.endDate) : undefined,
        totalOccurrences: transaction?.totalOccurrences || undefined,
        isActive: transaction?.isActive ?? true,
        module: module as any,
        propertyId: transaction?.propertyId || undefined,
        deviceId: transaction?.deviceId || undefined,
      });
    }
  }, [open, transaction, module, form]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {transaction ? "Edit Recurring Transaction" : "Add Recurring Transaction"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Monthly Rent" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
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
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {getCategories().map((category: string) => (
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
            </div>

            {module === "general" && (
              <FormField
                control={form.control}
                name="accountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Account</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {getBankAccounts().map((account: any) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name} ({account.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {module === "real-estate" && (
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

            {module === "devices" && (
              <FormField
                control={form.control}
                name="deviceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Device</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString() || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select device" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {devices.map((device) => (
                          <SelectItem key={device.id} value={device.id.toString()}>
                            {device.name} ({device.brand} {device.model})
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Description of the recurring transaction" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="intervalCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Every (interval)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        placeholder="1" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date()
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date (Optional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>No end date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date() || (form.watch("startDate") && date <= form.watch("startDate"))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="totalOccurrences"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Occurrences (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="1" 
                      placeholder="Leave empty for infinite" 
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Enable automatic processing of this recurring transaction
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {transaction ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}