import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { PropertyUtilityBlock, Property } from "@shared/schema";

const utilityBlockSchema = z.object({
  propertyId: z.number().min(1, "Property is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  type: z.string().min(1, "Type is required"),
  provider: z.string().optional(),
  accountNumber: z.string().optional(),
  monthlyBudget: z.string().optional(),
  isActive: z.boolean().default(true),
});

type UtilityBlockFormData = z.infer<typeof utilityBlockSchema>;

interface UtilityBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  utilityBlock?: PropertyUtilityBlock;
  properties: Property[];
  propertyId?: number;
}

const utilityTypes = [
  { value: "gas", label: "Gas" },
  { value: "electricity", label: "Elettricità" },
  { value: "water", label: "Acqua" },
  { value: "internet", label: "Internet" },
  { value: "heating", label: "Riscaldamento" },
  { value: "trash", label: "Raccolta rifiuti" },
  { value: "maintenance", label: "Manutenzione" },
  { value: "security", label: "Sicurezza" },
  { value: "other", label: "Altro" },
];

export function UtilityBlockModal({ isOpen, onClose, utilityBlock, properties, propertyId }: UtilityBlockModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UtilityBlockFormData>({
    resolver: zodResolver(utilityBlockSchema),
    defaultValues: {
      propertyId: utilityBlock?.propertyId || propertyId || 0,
      name: utilityBlock?.name || "",
      description: utilityBlock?.description || "",
      type: utilityBlock?.type || "",
      provider: utilityBlock?.provider || "",
      accountNumber: utilityBlock?.accountNumber || "",
      monthlyBudget: utilityBlock?.monthlyBudget ? String(utilityBlock.monthlyBudget) : "",
      isActive: utilityBlock?.isActive ?? true,
    },
  });

  useEffect(() => {
    if (utilityBlock) {
      form.reset({
        propertyId: utilityBlock.propertyId || propertyId || 0,
        name: utilityBlock.name,
        description: utilityBlock.description || "",
        type: utilityBlock.type,
        provider: utilityBlock.provider || "",
        accountNumber: utilityBlock.accountNumber || "",
        monthlyBudget: utilityBlock.monthlyBudget ? String(utilityBlock.monthlyBudget) : "",
        isActive: utilityBlock.isActive ?? true,
      });
    } else {
      form.reset({
        propertyId: propertyId || 0,
        name: "",
        description: "",
        type: "",
        provider: "",
        accountNumber: "",
        monthlyBudget: "",
        isActive: true,
      });
    }
  }, [utilityBlock, propertyId, form]);

  const createMutation = useMutation({
    mutationFn: (data: UtilityBlockFormData) =>
      apiRequest("/api/property-utility-blocks", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/property-utility-blocks"] });
      toast({
        title: "Blocco utenze creato",
        description: "Il blocco utenze è stato creato con successo.",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la creazione del blocco utenze.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UtilityBlockFormData) =>
      apiRequest(`/api/property-utility-blocks/${utilityBlock!.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/property-utility-blocks"] });
      toast({
        title: "Blocco utenze aggiornato",
        description: "Il blocco utenze è stato aggiornato con successo.",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiornamento del blocco utenze.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: UtilityBlockFormData) => {
    setIsSubmitting(true);
    
    try {
      if (utilityBlock) {
        await updateMutation.mutateAsync(data);
      } else {
        await createMutation.mutateAsync(data);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {utilityBlock ? "Modifica Blocco Utenze" : "Nuovo Blocco Utenze"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Property Selection */}
          <div className="space-y-2">
            <Label htmlFor="propertyId">Proprietà</Label>
            <Select
              value={form.watch("propertyId")?.toString() || ""}
              onValueChange={(value) => form.setValue("propertyId", parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona proprietà" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((property) => (
                  <SelectItem key={property.id} value={property.id.toString()}>
                    {property.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.propertyId && (
              <p className="text-sm text-red-600">{form.formState.errors.propertyId.message}</p>
            )}
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              {...form.register("name")}
              placeholder="es. Gas ENI, Elettricità Enel"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
            )}
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <Select
              value={form.watch("type")}
              onValueChange={(value) => form.setValue("type", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona tipo" />
              </SelectTrigger>
              <SelectContent>
                {utilityTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.type && (
              <p className="text-sm text-red-600">{form.formState.errors.type.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Provider */}
            <div className="space-y-2">
              <Label htmlFor="provider">Fornitore</Label>
              <Input
                id="provider"
                {...form.register("provider")}
                placeholder="es. ENI, Enel, Fastweb"
              />
            </div>

            {/* Account Number */}
            <div className="space-y-2">
              <Label htmlFor="accountNumber">Numero Utenza</Label>
              <Input
                id="accountNumber"
                {...form.register("accountNumber")}
                placeholder="es. 12345678"
              />
            </div>
          </div>

          {/* Monthly Budget */}
          <div className="space-y-2">
            <Label htmlFor="monthlyBudget">Budget Mensile (€)</Label>
            <Input
              id="monthlyBudget"
              {...form.register("monthlyBudget")}
              placeholder="es. 150.00"
              type="number"
              step="0.01"
              min="0"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrizione</Label>
            <Textarea
              id="description"
              {...form.register("description")}
              placeholder="Descrizione opzionale del blocco utenze"
              rows={3}
            />
          </div>

          {/* Is Active */}
          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={form.watch("isActive")}
              onCheckedChange={(checked) => form.setValue("isActive", checked)}
            />
            <Label htmlFor="isActive">Attivo</Label>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : utilityBlock ? "Aggiorna" : "Crea"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}