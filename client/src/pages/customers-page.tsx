import { useState, useEffect } from "react";
import { Search, UserPlus, Building2, Mail, Phone, MapPin, Eye, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  company?: string;
}

const STORAGE_KEY = "flowventory:customers";

// Initial seed data
const SEED_CUSTOMERS: Customer[] = [
  {
    id: 'c1',
    name: 'Acme Inc.',
    email: 'ops@acme.com',
    phone: '+1 555-0100',
    address: 'NY, USA',
    company: 'Acme Inc.'
  },
  {
    id: 'c2',
    name: 'BlueBay Retail',
    email: 'hello@bluebay.sg',
    phone: '+65 555-0123',
    address: 'Singapore',
    company: 'BlueBay'
  }
];

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<Partial<Customer>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  // Load customers from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setCustomers(JSON.parse(stored));
      } catch {
        // If parsing fails, use seed data
        setCustomers(SEED_CUSTOMERS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_CUSTOMERS));
      }
    } else {
      // No data found, use seed data
      setCustomers(SEED_CUSTOMERS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_CUSTOMERS));
    }
  }, []);

  // Save customers to localStorage
  const saveCustomers = (newCustomers: Customer[]) => {
    setCustomers(newCustomers);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newCustomers));
  };

  // Generate random ID
  const generateId = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'c_';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Validate form
  const validateForm = (data: Partial<Customer>) => {
    const newErrors: Record<string, string> = {};

    if (!data.name?.trim()) {
      newErrors.name = "Name is required";
    }

    if (data.email && !data.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (data.phone && data.phone.length < 5) {
      newErrors.phone = "Phone number must be at least 5 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Open modal for adding new customer
  const handleAddCustomer = () => {
    setEditingCustomer(null);
    setFormData({});
    setErrors({});
    setIsModalOpen(true);
  };

  // Open modal for editing customer
  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({ ...customer });
    setErrors({});
    setIsModalOpen(true);
  };

  // Save customer (create or update)
  const handleSaveCustomer = () => {
    if (!validateForm(formData)) {
      return;
    }

    const newCustomers = [...customers];
    
    if (editingCustomer) {
      // Update existing customer
      const index = newCustomers.findIndex(c => c.id === editingCustomer.id);
      if (index !== -1) {
        newCustomers[index] = { ...formData } as Customer;
      }
      toast({
        title: "Success",
        description: "Customer updated successfully",
      });
    } else {
      // Create new customer
      const newCustomer: Customer = {
        id: generateId(),
        name: formData.name!,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        company: formData.company || undefined,
      };
      newCustomers.unshift(newCustomer); // Add to beginning
      toast({
        title: "Success",
        description: "Customer created successfully",
      });
    }

    saveCustomers(newCustomers);
    setIsModalOpen(false);
  };

  // Delete customer
  const handleDeleteCustomer = (customer: Customer) => {
    setCustomerToDelete(customer);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (customerToDelete) {
      const newCustomers = customers.filter(c => c.id !== customerToDelete.id);
      saveCustomers(newCustomers);
      toast({
        title: "Success",
        description: "Customer deleted successfully",
      });
    }
    setIsDeleteDialogOpen(false);
    setCustomerToDelete(null);
  };

  // Filter customers
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = !searchQuery || 
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.company?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCompany = !companyFilter || customer.company === companyFilter;

    return matchesSearch && matchesCompany;
  });

  // Get unique companies for filter
  const companies = Array.from(new Set(customers.map(c => c.company).filter(Boolean)));

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary">Customers</h1>
            <p className="text-muted-foreground mt-1">Manage your customer database</p>
          </div>
          <Button
            onClick={handleAddCustomer}
            className="bg-primary hover:bg-primary/80 text-primary-foreground"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>

        {/* Filters */}
        <Card className="bg-zinc-900 border-zinc-800 p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-zinc-900 border-zinc-700 text-white"
              />
            </div>
            
            <Select 
              value={companyFilter || "all"} 
              onValueChange={(value) => setCompanyFilter(value === "all" ? "" : value)}
            >
              <SelectTrigger className="w-48 bg-zinc-900 border-zinc-700 text-white">
                <SelectValue placeholder="Filter by company" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="all">All Companies</SelectItem>
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
        <Card className="bg-zinc-900 border-zinc-800">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800">
                  <TableHead className="text-zinc-300">Name</TableHead>
                  <TableHead className="text-zinc-300">Company</TableHead>
                  <TableHead className="text-zinc-300">Email</TableHead>
                  <TableHead className="text-zinc-300">Phone</TableHead>
                  <TableHead className="text-zinc-300">Address</TableHead>
                  <TableHead className="text-zinc-300 w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {searchQuery || companyFilter ? "No customers match your filters" : "No customers found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => (
                    <TableRow key={customer.id} className="border-zinc-800">
                      <TableCell className="font-medium text-white">
                        {customer.name}
                      </TableCell>
                      <TableCell>
                        {customer.company ? (
                          <Badge variant="secondary" className="bg-zinc-800 text-zinc-300">
                            <Building2 className="h-3 w-3 mr-1" />
                            {customer.company}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {customer.email ? (
                          <span className="flex items-center text-zinc-300">
                            <Mail className="h-3 w-3 mr-1" />
                            {customer.email}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {customer.phone ? (
                          <span className="flex items-center text-zinc-300">
                            <Phone className="h-3 w-3 mr-1" />
                            {customer.phone}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {customer.address ? (
                          <span className="flex items-center text-zinc-300">
                            <MapPin className="h-3 w-3 mr-1" />
                            {customer.address}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditCustomer(customer)}
                            className="h-8 w-8 p-0 text-zinc-400 hover:text-white"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteCustomer(customer)}
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

      {/* Add/Edit Customer Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? "Edit Customer" : "Add Customer"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-zinc-300">Name *</Label>
              <Input
                id="name"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white mt-1"
                placeholder="Enter customer name"
              />
              {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <Label htmlFor="email" className="text-zinc-300">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white mt-1"
                placeholder="Enter email address"
              />
              {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <Label htmlFor="phone" className="text-zinc-300">Phone</Label>
              <Input
                id="phone"
                value={formData.phone || ""}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white mt-1"
                placeholder="Enter phone number"
              />
              {errors.phone && <p className="text-red-400 text-sm mt-1">{errors.phone}</p>}
            </div>

            <div>
              <Label htmlFor="company" className="text-zinc-300">Company</Label>
              <Input
                id="company"
                value={formData.company || ""}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white mt-1"
                placeholder="Enter company name"
              />
            </div>

            <div>
              <Label htmlFor="address" className="text-zinc-300">Address</Label>
              <Input
                id="address"
                value={formData.address || ""}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white mt-1"
                placeholder="Enter address"
              />
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
                onClick={handleSaveCustomer}
                className="bg-primary hover:bg-primary/80 text-primary-foreground"
              >
                {editingCustomer ? "Update Customer" : "Create Customer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Are you sure you want to delete {customerToDelete?.name}? This action cannot be undone.
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