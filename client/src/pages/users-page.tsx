import { useState } from "react";
import { usePerms, type User, type Role } from "@/hooks/use-perms";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Plus, Edit, Trash2, Users, Mail, Shield, MapPin } from "lucide-react";
import { 
  getLocations, 
  updateUserLocations, 
  formatLocationScope, 
  canManageUserLocations,
  getLocationName
} from "@/utils/locationAccess";

export default function UsersPage() {
  const { users, roles, updateUsers, hasPermission } = usePerms();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [locationUser, setLocationUser] = useState<User | null>(null);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);

  const locations = getLocations();
  const canManageLocations = canManageUserLocations();

  // Location assignment handlers
  const handleAssignLocations = (user: User) => {
    setLocationUser(user);
    const userLocations = (user as any).allowedLocations || [];
    setSelectedLocations(userLocations);
    setIsLocationModalOpen(true);
  };

  const handleSaveLocationAssignment = () => {
    if (!locationUser) return;

    try {
      updateUserLocations(locationUser.id, selectedLocations);
      
      // Update the users list
      const updatedUsers = users.map(user => 
        user.id === locationUser.id 
          ? { ...user, allowedLocations: selectedLocations }
          : user
      );
      updateUsers(updatedUsers);

      setIsLocationModalOpen(false);
      setLocationUser(null);
      setSelectedLocations([]);

      toast({
        title: "Locations Updated",
        description: `Successfully updated location access for ${locationUser.name}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update location assignments",
        variant: "destructive",
      });
    }
  };

  const toggleLocationSelection = (locationId: string) => {
    setSelectedLocations(prev => 
      prev.includes(locationId)
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId]
    );
  };

  const selectAllLocations = () => {
    setSelectedLocations(locations.map(loc => loc.id));
  };

  const clearAllLocations = () => {
    setSelectedLocations([]);
  };

  // Check if current user can access this page
  if (!hasPermission('settings')) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <Card className="bg-zinc-900 border-zinc-800 p-8 text-center max-w-md w-full">
          <div className="flex justify-center mb-4">
            <Shield className="h-16 w-16 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-zinc-400 mb-6">
            You don't have permission to manage users. Contact your administrator.
          </p>
        </Card>
      </div>
    );
  }

  const getRoleBadgeColor = (roleId: string) => {
    switch (roleId) {
      case "owner":
        return "bg-purple-600 text-white";
      case "manager":
        return "bg-blue-600 text-white";
      case "staff":
        return "bg-gray-600 text-white";
      default:
        return "bg-zinc-600 text-white";
    }
  };

  const getRoleName = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    return role?.name || roleId;
  };

  const generateId = () => {
    return 'u' + Math.random().toString(36).substr(2, 9);
  };

  const validateForm = (data: Partial<User>) => {
    const newErrors: Record<string, string> = {};

    if (!data.name?.trim()) {
      newErrors.name = "Name is required";
    }

    if (!data.email?.trim()) {
      newErrors.email = "Email is required";
    } else if (!data.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Check for duplicate emails (excluding current user when editing)
    const existingUser = users.find(u => 
      u.email.toLowerCase() === data.email?.toLowerCase() && 
      u.id !== editingUser?.id
    );
    if (existingUser) {
      newErrors.email = "Email address is already in use";
    }

    if (!data.roleId) {
      newErrors.roleId = "Role is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setFormData({
      name: "",
      email: "",
      roleId: ""
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({ ...user });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleSaveUser = () => {
    if (!validateForm(formData)) {
      return;
    }

    const newUsers = [...users];
    
    if (editingUser) {
      // Update existing user
      const index = newUsers.findIndex(u => u.id === editingUser.id);
      if (index !== -1) {
        newUsers[index] = { ...formData } as User;
      }
      toast({
        title: "Success",
        description: "User updated successfully",
      });
    } else {
      // Create new user
      const newUser: User = {
        id: generateId(),
        name: formData.name!,
        email: formData.email!,
        roleId: formData.roleId!
      };
      newUsers.push(newUser);
      toast({
        title: "Success", 
        description: "User created successfully",
      });
    }

    updateUsers(newUsers);
    setIsModalOpen(false);
  };

  const handleDeleteUser = (user: User) => {
    // Prevent deleting the last user
    if (users.length <= 1) {
      toast({
        title: "Cannot delete user",
        description: "At least one user must exist.",
        variant: "destructive",
      });
      return;
    }

    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      const newUsers = users.filter(u => u.id !== userToDelete.id);
      updateUsers(newUsers);
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    }
    setIsDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary">Users</h1>
            <p className="text-muted-foreground mt-1">Manage user accounts and role assignments</p>
          </div>
          <Button
            onClick={handleAddUser}
            className="bg-primary hover:bg-primary/80 text-primary-foreground"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>

        {/* Users Table */}
        <Card className="bg-zinc-900 border-zinc-800">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800">
                  <TableHead className="text-zinc-300">User</TableHead>
                  <TableHead className="text-zinc-300">Email</TableHead>
                  <TableHead className="text-zinc-300">Role</TableHead>
                  <TableHead className="text-zinc-300">Locations</TableHead>
                  <TableHead className="text-zinc-300 w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} className="border-zinc-800">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-zinc-400" />
                          <span className="font-medium text-white">{user.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-zinc-300">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(user.roleId)}>
                          {getRoleName(user.roleId)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 text-zinc-400" />
                          <span className="text-sm text-zinc-300" data-testid={`locations-${user.id}`}>
                            {formatLocationScope(user as any)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {canManageLocations && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleAssignLocations(user as any)}
                              className="h-8 text-xs text-zinc-400 hover:text-white"
                              data-testid={`assign-locations-${user.id}`}
                            >
                              <MapPin className="h-3 w-3 mr-1" />
                              Locations
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditUser(user)}
                            className="h-8 w-8 p-0 text-zinc-400 hover:text-white"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteUser(user)}
                            className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Add/Edit User Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Edit User" : "Add User"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="userName" className="text-zinc-300">Name *</Label>
              <Input
                id="userName"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white mt-1"
                placeholder="Enter user name"
              />
              {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <Label htmlFor="userEmail" className="text-zinc-300">Email *</Label>
              <Input
                id="userEmail"
                type="email"
                value={formData.email || ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white mt-1"
                placeholder="Enter email address"
              />
              {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <Label htmlFor="userRole" className="text-zinc-300">Role *</Label>
              <Select 
                value={formData.roleId || ""} 
                onValueChange={(value) => setFormData({ ...formData, roleId: value })}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white mt-1">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.roleId && <p className="text-red-400 text-sm mt-1">{errors.roleId}</p>}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveUser}
                className="bg-primary hover:bg-primary/80 text-primary-foreground"
              >
                {editingUser ? "Update User" : "Create User"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Location Assignment Dialog */}
      <Dialog open={isLocationModalOpen} onOpenChange={setIsLocationModalOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-lg" data-testid="location-assignment-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Assign Locations - {locationUser?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-400">
                Select locations this user can access
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={selectAllLocations}
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  data-testid="select-all-locations"
                >
                  Select All
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={clearAllLocations}
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  data-testid="clear-all-locations"
                >
                  Clear All
                </Button>
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {locations.length === 0 ? (
                <p className="text-center text-zinc-400 py-4">No locations available</p>
              ) : (
                locations.map((location) => (
                  <div
                    key={location.id}
                    className="flex items-center space-x-3 p-3 rounded border border-zinc-700 hover:bg-zinc-800 cursor-pointer"
                    onClick={() => toggleLocationSelection(location.id)}
                    data-testid={`location-${location.id}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedLocations.includes(location.id)}
                      onChange={() => toggleLocationSelection(location.id)}
                      className="rounded border-zinc-600 text-green-600 focus:ring-green-500 focus:ring-offset-zinc-900"
                      data-testid={`checkbox-${location.id}`}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-white">{location.name}</p>
                      <p className="text-sm text-zinc-400">Region: {location.regionId}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {selectedLocations.length === 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  <strong>Warning:</strong> No locations selected. User will have no access to location-specific data.
                </p>
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Note:</strong> {['owner', 'admin'].includes(locationUser?.roleId?.toLowerCase() || '') 
                  ? 'Owners and Admins have access to all locations when no specific locations are assigned.'
                  : 'Users with Manager or Staff roles need explicit location assignments to access data.'}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsLocationModalOpen(false)}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              data-testid="cancel-location-assignment"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveLocationAssignment}
              className="bg-green-600 hover:bg-green-700 text-white"
              data-testid="save-location-assignment"
            >
              Save Assignments
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to delete {userToDelete?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}