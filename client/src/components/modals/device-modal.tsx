import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { devicesApi } from "@/lib/api";
import { insertDeviceSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/lib/currency";
import type { Device } from "@shared/schema";

interface DeviceModalProps {
  device?: Device;
  onClose: () => void;
}

const deviceTypes = [
  { value: "laptop", label: "Laptop" },
  { value: "desktop", label: "Desktop" },
  { value: "phone", label: "Phone" },
  { value: "tablet", label: "Tablet" },
  { value: "server", label: "Server" },
  { value: "router", label: "Router" },
  { value: "printer", label: "Printer" },
  { value: "monitor", label: "Monitor" },
  { value: "keyboard", label: "Keyboard" },
  { value: "mouse", label: "Mouse" },
  { value: "headphones", label: "Headphones" },
  { value: "camera", label: "Camera" },
  { value: "appliance", label: "Household Appliance" },
  { value: "other", label: "Other" },
];

const deviceStatuses = [
  { value: "active", label: "Active" },
  { value: "maintenance", label: "Maintenance" },
  { value: "retired", label: "Retired" },
  { value: "lost", label: "Lost" },
  { value: "broken", label: "Broken" },
];

export default function DeviceModal({ device, onClose }: DeviceModalProps) {
  const { toast } = useToast();
  const currency = useCurrency();
  const isEditing = !!device;

  const formSchema = insertDeviceSchema.extend({
    purchaseDate: z.string().optional(),
    warrantyExpiry: z.string().optional(),
    purchasePrice: z.string().optional(),
    receiptImage: z.string().optional(),
    deviceImage: z.string().optional(),
    alertDays: z.string().optional(),
    isActive: z.boolean().optional(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditing ? {
      name: device.name,
      type: device.type,
      brand: device.brand,
      model: device.model,
      serialNumber: device.serialNumber || "",
      purchaseDate: device.purchaseDate ? new Date(device.purchaseDate).toISOString().split('T')[0] : "",
      purchasePrice: device.purchasePrice || "",
      warrantyExpiry: device.warrantyExpiry ? new Date(device.warrantyExpiry).toISOString().split('T')[0] : "",
      status: device.status,
      location: device.location || "",
      assignedTo: device.assignedTo || "",
      notes: device.notes || "",
      receiptImage: device.receiptImage || "",
      deviceImage: device.deviceImage || "",
      alertDays: device.alertDays?.toString() || "30",
      isActive: device.isActive ?? true,
    } : {
      name: "",
      type: "",
      brand: "",
      model: "",
      serialNumber: "",
      purchaseDate: "",
      purchasePrice: "",
      warrantyExpiry: "",
      status: "active",
      location: "",
      assignedTo: "",
      notes: "",
      receiptImage: "",
      deviceImage: "",
      alertDays: "30",
      isActive: true,
    },
  });

  // Utility function to handle image file upload and convert to base64
  const handleImageUpload = (file: File, callback: (base64: string) => void) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      callback(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const deviceData = {
        ...values,
        purchaseDate: values.purchaseDate ? new Date(values.purchaseDate) : null,
        warrantyExpiry: values.warrantyExpiry ? new Date(values.warrantyExpiry) : null,
        purchasePrice: values.purchasePrice || null,
        serialNumber: values.serialNumber || null,
        location: values.location || null,
        assignedTo: values.assignedTo || null,
        notes: values.notes || null,
        receiptImage: values.receiptImage || null,
        deviceImage: values.deviceImage || null,
        alertDays: values.alertDays ? parseInt(values.alertDays) : 30,
        isActive: values.isActive ?? true,
      };

      if (isEditing) {
        await devicesApi.update(device.id, deviceData);
        toast({ title: "Device updated successfully" });
      } else {
        await devicesApi.create(deviceData);
        toast({ title: "Device created successfully" });
      }

      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save device. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Device" : "Add Device"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Device Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., John's MacBook Pro"
                        {...field}
                      />
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
                    <FormLabel>Device Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select device type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {deviceTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
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
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Apple, Dell, Samsung"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., MacBook Pro 16-inch"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="serialNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serial Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Device serial number"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
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
                        {deviceStatuses.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
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
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="purchasePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Price ({currency.symbol})</FormLabel>
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
                name="warrantyExpiry"
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
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Office, Home, Warehouse"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assignedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned To</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., John Doe"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Warranty Alert Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="alertDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warranty Alert (Days Before Expiry)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="365"
                        placeholder="30"
                        {...field}
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
                  <FormItem className="flex items-center space-x-2 pt-6">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-medium">Device is active</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Receipt Image Upload */}
            <FormField
              control={form.control}
              name="receiptImage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Receipt Image</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleImageUpload(file, (base64) => {
                              field.onChange(base64);
                            });
                          }
                        }}
                      />
                      {field.value && (
                        <div className="mt-2">
                          <img 
                            src={field.value} 
                            alt="Receipt" 
                            className="max-w-full h-32 object-contain border rounded"
                          />
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            onClick={() => field.onChange("")}
                            className="mt-2"
                          >
                            Remove Receipt
                          </Button>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Device Image Upload */}
            <FormField
              control={form.control}
              name="deviceImage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Device Image</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleImageUpload(file, (base64) => {
                              field.onChange(base64);
                            });
                          }
                        }}
                      />
                      {field.value && (
                        <div className="mt-2">
                          <img 
                            src={field.value} 
                            alt="Device" 
                            className="max-w-full h-32 object-contain border rounded"
                          />
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            onClick={() => field.onChange("")}
                            className="mt-2"
                          >
                            Remove Image
                          </Button>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about the device..."
                      {...field}
                    />
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
                {isEditing ? "Update" : "Add"} Device
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}