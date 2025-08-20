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
import { Plus, Edit, Trash2, Users, Mail, Shield } from "lucide-react";

export default function UsersPage() {
  const { users, roles, updateUsers, hasPermission } = usePerms();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

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
                  <TableHead className="text-zinc-300 w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
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