import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Users, 
  Search, 
  Plus, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye,
  Mail,
  Phone,
  Building
} from "lucide-react";
import type { Customer } from "@shared/schema";

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers", searchQuery, companyFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (companyFilter) params.append("company", companyFilter);
      
      const response = await fetch(`/api/customers?${params}`);
      if (!response.ok) throw new Error("Failed to fetch customers");
      return response.json();
    },
  });

  // Get unique companies for filter
  const companies = Array.from(new Set(customers.map(c => c.company).filter(Boolean)));

  const handleDeleteCustomer = async (customerId: string) => {
    if (!window.confirm("Are you sure you want to delete this customer? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete customer");
      
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    } catch (error) {
      console.error("Error deleting customer:", error);
      alert("Failed to delete customer. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="border border-zinc-800 rounded-lg bg-zinc-950 p-8">
            <div className="text-center text-zinc-400">Loading customers...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Users className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Customers</h1>
              <p className="text-zinc-400">Manage your customer database and relationships</p>
            </div>
          </div>
          
          <Button asChild className="bg-green-600 hover:bg-green-700">
            <Link href="/customers/new">
              <Plus className="w-4 h-4 mr-2" />
              Add Customer
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <Card className="bg-zinc-950 border-zinc-800 p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-4 h-4" />
              <Input
                placeholder="Search customers by name, email, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-zinc-900 border-zinc-700 text-white"
              />
            </div>
            
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="w-48 bg-zinc-900 border-zinc-700 text-white">
                <SelectValue placeholder="Filter by company" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="">All Companies</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company} value={company!}>
                    {company}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Customers Table */}
        <Card className="bg-zinc-950 border-zinc-800">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">
                Customer Directory ({customers.length})
              </h2>
            </div>

            {customers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-zinc-300 mb-2">No customers found</h3>
                <p className="text-zinc-400 mb-6">
                  {searchQuery || companyFilter 
                    ? "Try adjusting your search filters" 
                    : "Get started by adding your first customer"
                  }
                </p>
                {!searchQuery && !companyFilter && (
                  <Button asChild className="bg-green-600 hover:bg-green-700">
                    <Link href="/customers/new">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Customer
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-zinc-800">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-zinc-900/50">
                      <TableHead className="text-zinc-300">Customer</TableHead>
                      <TableHead className="text-zinc-300">Contact</TableHead>
                      <TableHead className="text-zinc-300">Company</TableHead>
                      <TableHead className="text-zinc-300">Created</TableHead>
                      <TableHead className="text-zinc-300 w-16">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer) => (
                      <TableRow 
                        key={customer.id} 
                        className="border-zinc-800 hover:bg-zinc-900/50"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                              <span className="text-green-400 font-medium text-sm">
                                {customer.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <Link 
                                href={`/customers/${customer.id}`}
                                className="text-white font-medium hover:text-green-400 transition-colors"
                              >
                                {customer.name}
                              </Link>
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="space-y-1">
                            {customer.email && (
                              <div className="flex items-center gap-2 text-zinc-400 text-sm">
                                <Mail className="w-3 h-3" />
                                <span>{customer.email}</span>
                              </div>
                            )}
                            {customer.phone && (
                              <div className="flex items-center gap-2 text-zinc-400 text-sm">
                                <Phone className="w-3 h-3" />
                                <span>{customer.phone}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          {customer.company ? (
                            <div className="flex items-center gap-2 text-zinc-300">
                              <Building className="w-3 h-3" />
                              <span>{customer.company}</span>
                            </div>
                          ) : (
                            <span className="text-zinc-500">-</span>
                          )}
                        </TableCell>
                        
                        <TableCell className="text-zinc-400 text-sm">
                          {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : "-"}
                        </TableCell>
                        
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-zinc-400 hover:text-white"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent 
                              align="end" 
                              className="bg-zinc-900 border-zinc-700"
                            >
                              <DropdownMenuItem asChild className="text-zinc-300 hover:bg-zinc-800">
                                <Link href={`/customers/${customer.id}`}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Profile
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild className="text-zinc-300 hover:bg-zinc-800">
                                <Link href={`/customers/${customer.id}/edit`}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit Customer
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteCustomer(customer.id)}
                                className="text-red-400 hover:bg-red-900/20 hover:text-red-300"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Customer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}