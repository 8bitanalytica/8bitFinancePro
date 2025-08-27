import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCategoryBlockSchema, type CategoryBlock, type Property } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useState, useEffect } from "react";

const categoryBlockFormSchema = insertCategoryBlockSchema.extend({
  monthlyBudget: z.string().optional().transform((val) => val ? parseFloat(val) : undefined),
  yearlyBudget: z.string().optional().transform((val) => val ? parseFloat(val) : undefined),
  alertThreshold: z.string().optional().transform((val) => val ? parseInt(val) : 80),
});

type CategoryBlockFormData = z.infer<typeof categoryBlockFormSchema>;

interface CategoryBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryBlock?: CategoryBlock | null;
  properties: Property[];
  propertyId?: number;
  module?: string;
  categories?: string[];
}

export function CategoryBlockModal({
  isOpen,
  onClose,
  categoryBlock,
  properties,
  propertyId,
  module = "real-estate",
  categories = []
}: CategoryBlockModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | undefined>(propertyId);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<CategoryBlockFormData>({
    resolver: zodResolver(categoryBlockFormSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      module: module,
      monthlyBudget: "",
      yearlyBudget: "",
      alertThreshold: "80",
      isActive: true,
      propertyId: propertyId || undefined,
    }
  });

  const selectedCategory = watch("category");

  useEffect(() => {
    if (categoryBlock) {
      setValue("name", categoryBlock.name);
      setValue("description", categoryBlock.description || "");
      setValue("category", categoryBlock.category);
      setValue("module", categoryBlock.module);
      setValue("monthlyBudget", categoryBlock.monthlyBudget?.toString() || "");
      setValue("yearlyBudget", categoryBlock.yearlyBudget?.toString() || "");
      setValue("alertThreshold", categoryBlock.alertThreshold?.toString() || "80");
      setValue("isActive", categoryBlock.isActive ?? true);
      setValue("propertyId", categoryBlock.propertyId || undefined);
      setSelectedPropertyId(categoryBlock.propertyId || undefined);
    } else {
      reset({
        name: "",
        description: "",
        category: "",
        module: module,
        monthlyBudget: "",
        yearlyBudget: "",
        alertThreshold: "80",
        isActive: true,
        propertyId: propertyId || undefined,
      });
      setSelectedPropertyId(propertyId);
    }
  }, [categoryBlock, setValue, reset, propertyId, module]);

  const createMutation = useMutation({
    mutationFn: (data: CategoryBlockFormData) => apiRequest("/api/category-blocks", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/category-blocks"] });
      toast({ title: "Success", description: "Category block created successfully" });
      onClose();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create category block", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: CategoryBlockFormData) => 
      apiRequest(`/api/category-blocks/${categoryBlock!.id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/category-blocks"] });
      toast({ title: "Success", description: "Category block updated successfully" });
      onClose();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update category block", variant: "destructive" });
    }
  });

  const onSubmit = (data: CategoryBlockFormData) => {
    // Auto-generate name if not provided
    if (!data.name.trim()) {
      const propertyName = selectedPropertyId 
        ? properties.find(p => p.id === selectedPropertyId)?.name 
        : "";
      const baseName = propertyName ? `${propertyName} - ${data.category}` : data.category;
      data.name = `${baseName} Tracker`;
    }

    if (categoryBlock) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handlePropertyChange = (value: string) => {
    const propId = value === "none" ? undefined : parseInt(value);
    setSelectedPropertyId(propId);
    setValue("propertyId", propId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {categoryBlock ? "Edit Category Block" : "Create Category Block"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Category Selection */}
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={selectedCategory} onValueChange={(value) => setValue("category", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-red-600">{errors.category.message}</p>
            )}
          </div>

          {/* Property Selection */}
          {module === "real-estate" && (
            <div className="space-y-2">
              <Label htmlFor="propertyId">Property</Label>
              <Select 
                value={selectedPropertyId?.toString() || "none"} 
                onValueChange={handlePropertyChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a property (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All Properties</SelectItem>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id.toString()}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Block Name</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder={
                selectedCategory 
                  ? `${selectedCategory} Tracker` 
                  : "Enter block name (auto-generated if empty)"
              }
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Optional description for this category block"
              rows={3}
            />
          </div>

          {/* Budget Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monthlyBudget">Monthly Budget</Label>
              <Input
                id="monthlyBudget"
                type="number"
                step="0.01"
                {...register("monthlyBudget")}
                placeholder="0.00"
              />
              {errors.monthlyBudget && (
                <p className="text-sm text-red-600">{errors.monthlyBudget.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="yearlyBudget">Yearly Budget</Label>
              <Input
                id="yearlyBudget"
                type="number"
                step="0.01"
                {...register("yearlyBudget")}
                placeholder="0.00"
              />
              {errors.yearlyBudget && (
                <p className="text-sm text-red-600">{errors.yearlyBudget.message}</p>
              )}
            </div>
          </div>

          {/* Alert Threshold */}
          <div className="space-y-2">
            <Label htmlFor="alertThreshold">Alert Threshold (%)</Label>
            <Input
              id="alertThreshold"
              type="number"
              min="1"
              max="100"
              {...register("alertThreshold")}
              placeholder="80"
            />
            <p className="text-xs text-gray-500">
              Get notified when spending reaches this percentage of budget
            </p>
            {errors.alertThreshold && (
              <p className="text-sm text-red-600">{errors.alertThreshold.message}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending 
                ? "Saving..." 
                : categoryBlock ? "Update Block" : "Create Block"
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}