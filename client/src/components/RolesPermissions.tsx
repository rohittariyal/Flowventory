import { useState } from "react";
import { usePerms, type Role, type Permissions } from "@/hooks/use-perms";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Trash2, Shield } from "lucide-react";

const MODULE_LABELS = {
  inventory: "Inventory",
  pos: "Purchase Orders",
  suppliers: "Suppliers", 
  customers: "Customers",
  returns: "Returns",
  settings: "Settings",
  analytics: "Analytics"
};

export function RolesPermissions() {
  const { roles, users, updateRoles, hasPermission } = usePerms();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [formData, setFormData] = useState<Partial<Role>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Check if current user can access settings
  if (!hasPermission('settings')) {
    return null;
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

  const generateId = () => {
    return Math.random().toString(36).substr(2, 9);
  };

  const validateForm = (data: Partial<Role>) => {
    const newErrors: Record<string, string> = {};

    if (!data.name?.trim()) {
      newErrors.name = "Role name is required";
    }

    // Check for duplicate names (excluding current role when editing)
    const existingRole = roles.find(r => 
      r.name.toLowerCase() === data.name?.toLowerCase() && 
      r.id !== editingRole?.id
    );
    if (existingRole) {
      newErrors.name = "Role name must be unique";
    }

    // Check if at least one permission is enabled
    const perms = data.perms;
    if (perms && !Object.values(perms).some(Boolean)) {
      newErrors.perms = "At least one module must be enabled";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddRole = () => {
    setEditingRole(null);
    setFormData({
      name: "",
      perms: {
        inventory: false,
        pos: false,
        suppliers: false,
        customers: false,
        returns: false,
        settings: false,
        analytics: false
      }
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setFormData({ ...role });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleSaveRole = () => {
    if (!validateForm(formData)) {
      return;
    }

    const newRoles = [...roles];
    
    if (editingRole) {
      // Update existing role
      const index = newRoles.findIndex(r => r.id === editingRole.id);
      if (index !== -1) {
        newRoles[index] = { ...formData } as Role;
      }
      toast({
        title: "Success",
        description: "Role updated successfully",
      });
    } else {
      // Create new role
      const newRole: Role = {
        id: generateId(),
        name: formData.name!,
        perms: formData.perms!
      };
      newRoles.push(newRole);
      toast({
        title: "Success",
        description: "Role created successfully",
      });
    }

    updateRoles(newRoles);
    setIsModalOpen(false);
  };

  const handleDeleteRole = (role: Role) => {
    // Check if role is assigned to any users
    const assignedUsers = users.filter(u => u.roleId === role.id);
    if (assignedUsers.length > 0) {
      toast({
        title: "Cannot delete role",
        description: `This role is assigned to ${assignedUsers.length} user(s). Please reassign them first.`,
        variant: "destructive",
      });
      return;
    }

    // Prevent deleting the last role
    if (roles.length <= 1) {
      toast({
        title: "Cannot delete role",
        description: "At least one role must exist.",
        variant: "destructive",
      });
      return;
    }

    setRoleToDelete(role);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (roleToDelete) {
      const newRoles = roles.filter(r => r.id !== roleToDelete.id);
      updateRoles(newRoles);
      toast({
        title: "Success",
        description: "Role deleted successfully",
      });
    }
    setIsDeleteDialogOpen(false);
    setRoleToDelete(null);
  };

  const handlePermissionChange = (module: keyof Permissions, enabled: boolean) => {
    setFormData({
      ...formData,
      perms: {
        ...formData.perms!,
        [module]: enabled
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-white">Roles & Permissions</h3>
          <p className="text-sm text-zinc-400">Manage user roles and access control</p>
        </div>
        <Button onClick={handleAddRole} className="bg-primary hover:bg-primary/80">
          <Plus className="h-4 w-4 mr-2" />
          Add Role
        </Button>
      </div>

      {/* Roles Table */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800">
                <TableHead className="text-zinc-300">Role</TableHead>
                <TableHead className="text-zinc-300">Permissions</TableHead>
                <TableHead className="text-zinc-300 w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id} className="border-zinc-800">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-zinc-400" />
                      <span className="font-medium text-white">{role.name}</span>
                      <Badge className={getRoleBadgeColor(role.id)}>
                        {role.id}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(role.perms)
                        .filter(([, enabled]) => enabled)
                        .map(([module]) => (
                          <Badge
                            key={module}
                            variant="secondary"
                            className="text-xs bg-primary/20 text-primary border-primary/30"
                          >
                            {MODULE_LABELS[module as keyof Permissions]}
                          </Badge>
                        ))
                      }
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditRole(role)}
                        className="h-8 w-8 p-0 text-zinc-400 hover:text-white"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteRole(role)}
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Role Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingRole ? "Edit Role" : "Add Role"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <Label htmlFor="roleName" className="text-zinc-300">Role Name *</Label>
              <Input
                id="roleName"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white mt-1"
                placeholder="Enter role name"
              />
              {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <Label className="text-zinc-300">Module Permissions</Label>
              {errors.perms && <p className="text-red-400 text-sm mt-1">{errors.perms}</p>}
              <div className="grid grid-cols-2 gap-4 mt-3">
                {Object.entries(MODULE_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between p-3 rounded border border-zinc-700">
                    <span className="text-white">{label}</span>
                    <Switch
                      checked={formData.perms?.[key as keyof Permissions] || false}
                      onCheckedChange={(checked) => 
                        handlePermissionChange(key as keyof Permissions, checked)
                      }
                    />
                  </div>
                ))}
              </div>
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
                onClick={handleSaveRole}
                className="bg-primary hover:bg-primary/80 text-primary-foreground"
              >
                {editingRole ? "Update Role" : "Create Role"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to delete the role "{roleToDelete?.name}"? This action cannot be undone.
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