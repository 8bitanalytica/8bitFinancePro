import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { generalTransactionsApi, realEstateTransactionsApi } from "@/lib/api";
import { insertGeneralTransactionSchema, insertRealEstateTransactionSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAppSettings } from "@/components/settings/settings";
import { useCurrency } from "@/lib/currency";
import type { GeneralTransaction, RealEstateTransaction, Property } from "@shared/schema";

interface TransactionModalProps {
  transaction?: GeneralTransaction | RealEstateTransaction;
  onClose: () => void;
  type: "general" | "real-estate";
  properties?: Property[];
}

export default function TransactionModal({ transaction, onClose, type, properties = [] }: TransactionModalProps) {
  const { toast } = useToast();
  const settings = useAppSettings();
  const currency = useCurrency();
  const isEditing = !!transaction;
  const isRealEstate = type === "real-estate";

  const categories = isRealEstate ? settings.realEstateCategories : settings.generalCategories;

  const baseSchema = isRealEstate ? insertRealEstateTransactionSchema : insertGeneralTransactionSchema;
  const formSchema = baseSchema.extend({
    date: z.string().min(1, "Date is required"),
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
    } : {
      type: "expense",
      amount: "",
      description: "",
      category: "",
      date: new Date().toISOString().split('T')[0],
      ...(isRealEstate && { propertyId: 0 }),
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const transactionData = {
        ...values,
        date: new Date(values.date),
      };

      if (isRealEstate) {
        if (isEditing && 'propertyId' in transaction) {
          await realEstateTransactionsApi.update(transaction.id, transactionData);
          toast({ title: "Transaction updated successfully" });
        } else {
          await realEstateTransactionsApi.create(transactionData);
          toast({ title: "Transaction created successfully" });
        }
      } else {
        if (isEditing) {
          await generalTransactionsApi.update(transaction.id, transactionData);
          toast({ title: "Transaction updated successfully" });
        } else {
          await generalTransactionsApi.create(transactionData);
          toast({ title: "Transaction created successfully" });
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
      <DialogContent className="sm:max-w-[425px]">
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

            {isRealEstate && (
              <FormField
                control={form.control}
                name="propertyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
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
