import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, MapPin, Warehouse, Store, Building, Star, Edit, Trash2, AlertTriangle, Settings } from "lucide-react";
import { nanoid } from "nanoid";
import type { Location, InventorySettings } from "@shared/schema";
import {
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  getDefaultLocation,
  getInventorySettings,
  saveInventorySettings,
  initializeWarehouseData
} from "@/utils/warehouse";

export default function LocationsSettingsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [settings, setSettings] = useState<InventorySettings>({
    combineLocations: false,
    allowNegativeStock: false,
    defaultLocationId: undefined,
  });
  const [isAddLocationModalOpen, setIsAddLocationModalOpen] = useState(false);
  const [isEditLocationModalOpen, setIsEditLocationModalOpen] = useState(false);
  const [isDeleteLocationModalOpen, setIsDeleteLocationModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [newLocation, setNewLocation] = useState({
    name: "",
    regionId: "US" as const,
    type: "warehouse" as const,
    isDefault: false,
    isActive: true,
    address: {
      street: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
    }
  });
  const { toast } = useToast();

  useEffect(() => {
    // Initialize warehouse data if not present
    initializeWarehouseData();
    loadData();
  }, []);

  const loadData = () => {
    const locationsData = getLocations();
    const settingsData = getInventorySettings();
    setLocations(locationsData);
    setSettings(settingsData);
  };

  const handleCreateLocation = () => {
    try {
      const location = createLocation(newLocation);
      setLocations(getLocations());
      setIsAddLocationModalOpen(false);
      resetNewLocationForm();
      toast({
        title: "Location Created",
        description: `${location.name} has been created successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create location",
        variant: "destructive",
      });
    }
  };

  const handleEditLocation = () => {
    if (!selectedLocation) return;
    
    try {
      const updatedLocation = updateLocation(selectedLocation.id, selectedLocation);
      if (updatedLocation) {
        setLocations(getLocations());
        setIsEditLocationModalOpen(false);
        setSelectedLocation(null);
        toast({
          title: "Location Updated",
          description: `${updatedLocation.name} has been updated successfully.`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update location",
        variant: "destructive",
      });
    }
  };

  const handleDeleteLocation = () => {
    if (!selectedLocation) return;
    
    try {
      const success = deleteLocation(selectedLocation.id);
      if (success) {
        setLocations(getLocations());
        setIsDeleteLocationModalOpen(false);
        setSelectedLocation(null);
        toast({
          title: "Location Deleted",
          description: `${selectedLocation.name} has been deleted successfully.`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete location",
        variant: "destructive",
      });
    }
  };

  const handleSetDefault = (locationId: string) => {
    try {
      updateLocation(locationId, { isDefault: true });
      setLocations(getLocations());
      toast({
        title: "Default Location Set",
        description: "Default location has been updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to set default location",
        variant: "destructive",
      });
    }
  };

  const handleSettingsChange = (key: keyof InventorySettings, value: any) => {
    const updatedSettings = { ...settings, [key]: value };
    setSettings(updatedSettings);
    saveInventorySettings(updatedSettings);
    toast({
      title: "Settings Updated",
      description: "Inventory settings have been saved.",
    });
  };

  const resetNewLocationForm = () => {
    setNewLocation({
      name: "",
      regionId: "US",
      type: "warehouse",
      isDefault: false,
      isActive: true,
      address: {
        street: "",
        city: "",
        state: "",
        postalCode: "",
        country: "",
      }
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "warehouse":
        return <Warehouse className="h-4 w-4" />;
      case "store":
        return <Store className="h-4 w-4" />;
      case "fulfillment_center":
        return <Building className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (location: Location) => {
    if (!location.isActive) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    if (location.isDefault) {
      return <Badge className="bg-primary/20 text-primary border-primary/30">
        <Star className="h-3 w-3 mr-1" />
        Default
      </Badge>;
    }
    return <Badge variant="outline">Active</Badge>;
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Locations & Warehouses</h1>
          <p className="text-muted-foreground mt-2">
            Manage your warehouse locations and inventory distribution settings
          </p>
        </div>
        <Dialog open={isAddLocationModalOpen} onOpenChange={setIsAddLocationModalOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-location">
              <Plus className="h-4 w-4 mr-2" />
              Add Location
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Location</DialogTitle>
              <DialogDescription>
                Create a new warehouse or store location
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="location-name">Location Name</Label>
                <Input
                  id="location-name"
                  data-testid="input-location-name"
                  value={newLocation.name}
                  onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                  placeholder="e.g., London DC, NY Store"
                />
              </div>
              <div>
                <Label htmlFor="location-region">Region</Label>
                <Select
                  value={newLocation.regionId}
                  onValueChange={(value) => setNewLocation({ ...newLocation, regionId: value as any })}
                >
                  <SelectTrigger data-testid="select-location-region">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UK">United Kingdom</SelectItem>
                    <SelectItem value="UAE">United Arab Emirates</SelectItem>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="SG">Singapore</SelectItem>
                    <SelectItem value="IN">India</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="location-type">Type</Label>
                <Select
                  value={newLocation.type}
                  onValueChange={(value) => setNewLocation({ ...newLocation, type: value as any })}
                >
                  <SelectTrigger data-testid="select-location-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warehouse">Warehouse</SelectItem>
                    <SelectItem value="store">Store</SelectItem>
                    <SelectItem value="fulfillment_center">Fulfillment Center</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="location-default"
                  data-testid="switch-location-default"
                  checked={newLocation.isDefault}
                  onCheckedChange={(checked) => setNewLocation({ ...newLocation, isDefault: checked })}
                />
                <Label htmlFor="location-default">Set as default location</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddLocationModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateLocation} data-testid="button-create-location">
                Create Location
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {/* Inventory Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              Inventory Settings
            </CardTitle>
            <CardDescription>
              Configure how inventory is displayed and managed across locations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="combine-locations">Combine Locations</Label>
                <p className="text-sm text-muted-foreground">
                  Show total inventory across all locations with breakdown on hover
                </p>
              </div>
              <Switch
                id="combine-locations"
                data-testid="switch-combine-locations"
                checked={settings.combineLocations}
                onCheckedChange={(checked) => handleSettingsChange('combineLocations', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="allow-negative">Allow Negative Stock</Label>
                <p className="text-sm text-muted-foreground">
                  Allow inventory adjustments that result in negative stock levels
                </p>
              </div>
              <Switch
                id="allow-negative"
                data-testid="switch-allow-negative"
                checked={settings.allowNegativeStock}
                onCheckedChange={(checked) => handleSettingsChange('allowNegativeStock', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Locations Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Locations ({locations.length})
            </CardTitle>
            <CardDescription>
              Manage your warehouse and store locations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {locations.length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No locations configured</h3>
                <p className="text-muted-foreground mb-4">
                  Add your first warehouse or store location to get started with multi-location inventory
                </p>
                <Button onClick={() => setIsAddLocationModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Location
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locations.map((location) => (
                    <TableRow key={location.id} data-testid={`row-location-${location.id}`}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getTypeIcon(location.type)}
                          <span className="font-medium">{location.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{location.regionId}</Badge>
                      </TableCell>
                      <TableCell className="capitalize">{location.type.replace('_', ' ')}</TableCell>
                      <TableCell>{getStatusBadge(location)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {!location.isDefault && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSetDefault(location.id)}
                              data-testid={`button-set-default-${location.id}`}
                            >
                              <Star className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedLocation(location);
                              setIsEditLocationModalOpen(true);
                            }}
                            data-testid={`button-edit-${location.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedLocation(location);
                              setIsDeleteLocationModalOpen(true);
                            }}
                            data-testid={`button-delete-${location.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Location Modal */}
      <Dialog open={isEditLocationModalOpen} onOpenChange={setIsEditLocationModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Location</DialogTitle>
            <DialogDescription>
              Update location details
            </DialogDescription>
          </DialogHeader>
          {selectedLocation && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-location-name">Location Name</Label>
                <Input
                  id="edit-location-name"
                  data-testid="input-edit-location-name"
                  value={selectedLocation.name}
                  onChange={(e) => setSelectedLocation({ ...selectedLocation, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-location-region">Region</Label>
                <Select
                  value={selectedLocation.regionId}
                  onValueChange={(value) => setSelectedLocation({ ...selectedLocation, regionId: value as any })}
                >
                  <SelectTrigger data-testid="select-edit-location-region">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UK">United Kingdom</SelectItem>
                    <SelectItem value="UAE">United Arab Emirates</SelectItem>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="SG">Singapore</SelectItem>
                    <SelectItem value="IN">India</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-location-type">Type</Label>
                <Select
                  value={selectedLocation.type}
                  onValueChange={(value) => setSelectedLocation({ ...selectedLocation, type: value as any })}
                >
                  <SelectTrigger data-testid="select-edit-location-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warehouse">Warehouse</SelectItem>
                    <SelectItem value="store">Store</SelectItem>
                    <SelectItem value="fulfillment_center">Fulfillment Center</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-location-active"
                  data-testid="switch-edit-location-active"
                  checked={selectedLocation.isActive}
                  onCheckedChange={(checked) => setSelectedLocation({ ...selectedLocation, isActive: checked })}
                />
                <Label htmlFor="edit-location-active">Active</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditLocationModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditLocation} data-testid="button-save-location">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Location Modal */}
      <Dialog open={isDeleteLocationModalOpen} onOpenChange={setIsDeleteLocationModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-destructive">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Delete Location
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this location? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedLocation && (
            <div className="bg-destructive/10 p-4 rounded-lg">
              <p className="text-sm">
                <strong>Location:</strong> {selectedLocation.name}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                All inventory records for this location will be removed.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteLocationModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteLocation} data-testid="button-confirm-delete">
              Delete Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}