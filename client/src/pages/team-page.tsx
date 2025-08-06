import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, UserPlus, Settings, Trash2, Crown, Shield, Eye } from "lucide-react";
import type { User } from "@shared/schema";

interface TeamMember extends Omit<User, 'invitedBy' | 'joinedAt'> {
  invitedBy?: string | null;
  joinedAt?: Date | null;
}

export default function TeamPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"manager" | "viewer">("viewer");

  // Fetch team members
  const { data: teamMembers = [], isLoading, refetch } = useQuery<TeamMember[]>({
    queryKey: ["/api/team/members"],
    enabled: user?.role !== "viewer",
  });

  // Invite team member mutation
  const inviteMutation = useMutation({
    mutationFn: async (data: { email: string; role: "manager" | "viewer" }) => {
      const res = await apiRequest("POST", "/api/team/invite", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation sent",
        description: "Team member has been invited successfully",
      });
      setIsInviteDialogOpen(false);
      setInviteEmail("");
      setInviteRole("viewer");
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to invite member",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "manager" | "viewer" }) => {
      const res = await apiRequest("PUT", `/api/team/members/${userId}/role`, { role });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Role updated",
        description: "Team member role has been updated successfully",
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update role",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/team/members/${userId}`);
    },
    onSuccess: () => {
      toast({
        title: "Member removed",
        description: "Team member has been removed successfully",
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove member",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleInvite = () => {
    if (!inviteEmail || !inviteRole) {
      toast({
        title: "Missing information",
        description: "Please provide email and role",
        variant: "destructive",
      });
      return;
    }

    inviteMutation.mutate({ email: inviteEmail, role: inviteRole });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="h-4 w-4 text-amber-500" />;
      case "manager":
        return <Shield className="h-4 w-4 text-blue-500" />;
      case "viewer":
        return <Eye className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "default" as const;
      case "manager":
        return "secondary" as const;
      case "viewer":
        return "outline" as const;
      default:
        return "outline" as const;
    }
  };

  // Viewer role sees access denied
  if (user?.role === "viewer") {
    return (
      <div className="min-h-screen bg-black text-green-400 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <Card className="bg-gray-900 border-gray-800 text-center p-8">
              <CardHeader>
                <CardTitle className="text-red-400 flex items-center justify-center gap-2">
                  <Shield className="h-6 w-6" />
                  Access Denied
                </CardTitle>
                <CardDescription className="text-gray-400">
                  You don't have permission to view team management.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  Only Admins and Managers can access team features.
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Contact your administrator if you need access to team management.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-green-400 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <Users className="h-8 w-8 text-green-400" />
              Team Management
            </h1>
            <p className="text-gray-400 mt-1">
              {user?.role === "admin" 
                ? "Manage your team members and their permissions" 
                : "View your team members"
              }
            </p>
          </div>
          
          {/* Only admins can invite */}
          {user?.role === "admin" && (
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700 text-black">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Member
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-800 text-green-400">
                <DialogHeader>
                  <DialogTitle className="text-white">Invite Team Member</DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Send an invitation to join your team
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email" className="text-green-400">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="colleague@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white focus:border-green-400"
                    />
                  </div>
                  <div>
                    <Label htmlFor="role" className="text-green-400">Role</Label>
                    <Select value={inviteRole} onValueChange={(value: "manager" | "viewer") => setInviteRole(value)}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="manager" className="text-white">Manager</SelectItem>
                        <SelectItem value="viewer" className="text-white">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setIsInviteDialogOpen(false)}
                      className="border-gray-600 text-gray-400 hover:bg-gray-800"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleInvite}
                      disabled={inviteMutation.isPending}
                      className="bg-green-600 hover:bg-green-700 text-black"
                    >
                      {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Team Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-white">Total Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{teamMembers.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-white">Admins</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-400">
                {teamMembers.filter(member => member.role === "admin").length}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-white">Managers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">
                {teamMembers.filter(member => member.role === "manager").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Members List */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Team Members</CardTitle>
            <CardDescription className="text-gray-400">
              {user?.role === "admin" 
                ? "Manage roles and permissions for your team" 
                : "View your team members and their roles"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto"></div>
                <p className="text-gray-400 mt-2">Loading team members...</p>
              </div>
            ) : teamMembers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No team members found</p>
                {user?.role === "admin" && (
                  <p className="text-sm text-gray-500 mt-1">Start by inviting your first team member</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-700"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-black font-semibold">
                        {member.fullName?.charAt(0) || member.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-white font-medium">{member.fullName || member.email}</h3>
                        <p className="text-gray-400 text-sm">{member.email}</p>
                        {member.invitedBy && (
                          <p className="text-gray-500 text-xs">Invited by {member.invitedBy}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Badge variant={getRoleBadgeVariant(member.role)} className="flex items-center gap-1">
                        {getRoleIcon(member.role)}
                        {member.role}
                      </Badge>
                      
                      {/* Admin controls */}
                      {user?.role === "admin" && member.role !== "admin" && member.id !== user.id && (
                        <div className="flex items-center gap-2">
                          <Select
                            value={member.role}
                            onValueChange={(role: "manager" | "viewer") => 
                              updateRoleMutation.mutate({ userId: member.id, role })
                            }
                          >
                            <SelectTrigger className="w-32 bg-gray-700 border-gray-600 text-white text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-700 border-gray-600">
                              <SelectItem value="manager" className="text-white">Manager</SelectItem>
                              <SelectItem value="viewer" className="text-white">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-gray-900 border-gray-800">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-white">Remove Team Member</AlertDialogTitle>
                                <AlertDialogDescription className="text-gray-400">
                                  Are you sure you want to remove {member.fullName || member.email} from the team? 
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="border-gray-600 text-gray-400 hover:bg-gray-800">
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => removeMemberMutation.mutate(member.id)}
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                  Remove Member
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                      
                      {/* Show "You" for current user */}
                      {member.id === user?.id && (
                        <Badge variant="outline" className="text-green-400 border-green-400">
                          You
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Role Permissions Info */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Role Permissions</CardTitle>
            <CardDescription className="text-gray-400">
              Understanding different access levels in your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Crown className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <h4 className="text-white font-medium">Admin</h4>
                  <p className="text-gray-400 text-sm">
                    Full access to all features, team management, settings, and AI tools
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <h4 className="text-white font-medium">Manager</h4>
                  <p className="text-gray-400 text-sm">
                    Access to AI features, view team members, but cannot manage team or settings
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Eye className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <h4 className="text-white font-medium">Viewer</h4>
                  <p className="text-gray-400 text-sm">
                    Basic dashboard access only, no AI features or team management
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}