import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, Plus, Eye, FolderOpen, Calendar, Target } from "lucide-react";
import { useAppSettings } from "@/components/settings/settings";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { format } from "date-fns";
import type { Property, RealEstateTransaction, PropertyProject } from "@shared/schema";

interface PropertiesSidebarProps {
  selectedPropertyId: number | null;
  onPropertySelect: (propertyId: number | null) => void;
  properties: Property[];
  projects: PropertyProject[];
  transactions: RealEstateTransaction[];
  onAddProperty: () => void;
  onAddTransaction: () => void;
  onAddProject: () => void;
  onEditProject?: (project: PropertyProject) => void;
}

export default function PropertiesSidebar({ 
  selectedPropertyId, 
  onPropertySelect, 
  properties,
  projects,
  transactions,
  onAddProperty,
  onAddTransaction,
  onAddProject,
  onEditProject
}: PropertiesSidebarProps) {
  const settings = useAppSettings();
  const [, setLocation] = useLocation();

  const calculatePropertyBalance = (propertyId: number) => {
    const propertyTransactions = transactions.filter(transaction => 
      transaction.propertyId === propertyId
    );

    return propertyTransactions.reduce((balance, transaction) => {
      if (transaction.type === 'income') {
        return balance + parseFloat(transaction.amount);
      } else {
        return balance - parseFloat(transaction.amount);
      }
    }, 0);
  };

  const getPropertyTransactionCount = (propertyId: number) => {
    return transactions.filter(transaction => 
      transaction.propertyId === propertyId
    ).length;
  };

  const getPropertyProjects = (propertyId: number) => {
    return projects.filter(project => project.propertyId === propertyId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="w-80 bg-gray-50 border-r border-gray-200 h-screen overflow-y-auto">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Properties</h3>
          <div className="flex gap-2">
            <Button onClick={onAddProperty} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              Property
            </Button>
            <Button onClick={onAddProject} size="sm" variant="outline" className="text-purple-600 border-purple-200 hover:bg-purple-50">
              <FolderOpen className="h-4 w-4 mr-1" />
              Project
            </Button>
            <Button onClick={onAddTransaction} size="sm" className="bg-primary hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-1" />
              Transaction
            </Button>
          </div>
        </div>

        {/* All Properties View */}
        <Card className={cn(
          "cursor-pointer transition-all hover:shadow-md",
          selectedPropertyId === null ? "ring-2 ring-blue-500 bg-blue-50" : "hover:bg-white"
        )}>
          <CardContent 
            className="p-4"
            onClick={() => onPropertySelect(null)}
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Eye className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900">All Properties</h4>
                <p className="text-sm text-gray-600">
                  View all properties and transactions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Individual Properties */}
        <div className="space-y-3">
          {properties.map((property) => {
            const balance = calculatePropertyBalance(property.id);
            const transactionCount = getPropertyTransactionCount(property.id);
            const isSelected = selectedPropertyId === property.id;

            return (
              <Card 
                key={property.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  isSelected ? "ring-2 ring-blue-500 bg-blue-50" : "hover:bg-white"
                )}
              >
                <CardContent 
                  className="p-4"
                  onClick={() => onPropertySelect(property.id)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <Home className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900 truncate">
                          {property.name}
                        </h4>
                        <span className="text-xs text-gray-500 capitalize bg-gray-100 px-2 py-1 rounded">
                          {property.type}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-1">
                        {property.address}
                      </p>
                      
                      {/* Projects Section */}
                      {(() => {
                        const propertyProjects = getPropertyProjects(property.id);
                        return propertyProjects.length > 0 ? (
                          <div className="mt-2 mb-3 space-y-1">
                            {propertyProjects.slice(0, 2).map((project) => (
                              <div 
                                key={project.id} 
                                className="flex items-center justify-between p-2 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditProject?.(project);
                                }}
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <FolderOpen className="h-3 w-3 text-purple-500 flex-shrink-0" />
                                  <span className="text-xs font-medium text-gray-700 truncate">
                                    {project.name}
                                  </span>
                                </div>
                                <Badge 
                                  variant="secondary" 
                                  className={cn("text-xs", getStatusColor(project.status))}
                                >
                                  {project.status}
                                </Badge>
                              </div>
                            ))}
                            {propertyProjects.length > 2 && (
                              <div className="text-xs text-gray-500 pl-5">
                                +{propertyProjects.length - 2} more projects
                              </div>
                            )}
                          </div>
                        ) : null;
                      })()}

                      <div className="mt-2">
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(balance)}
                        </p>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Rent: {formatCurrency(parseFloat(property.monthlyRent))}/mo</span>
                          <span>{transactionCount} transaction{transactionCount !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Property Management */}
        <Card className="bg-white border-dashed border-2 border-gray-300">
          <CardContent className="p-4 text-center">
            <div className="space-y-2">
              <Home className="h-8 w-8 text-gray-400 mx-auto" />
              <p className="text-sm text-gray-600">
                Need to add or manage properties?
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => setLocation('/settings')}
              >
                Manage Properties
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}