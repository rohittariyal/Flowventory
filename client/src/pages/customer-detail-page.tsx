import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Building, 
  Calendar,
  Package,
  DollarSign,
  TrendingUp,
  ShoppingCart
} from "lucide-react";
import type { Customer, SalesOrder } from "@shared/schema";

export default function CustomerDetailPage() {
  const [, navigate] = useLocation();
  const customerId = window.location.pathname.split("/")[2];

  const { data: customer, isLoading: isLoadingCustomer } = useQuery<Customer>({
    queryKey: ["/api/customers", customerId],
    queryFn: async () => {
      const response = await fetch(`/api/customers/${customerId}`);
      if (!response.ok) {
        if (response.status === 404) {
          navigate("/customers");
          return null;
        }
        throw new Error("Failed to fetch customer");
      }
      return response.json();
    },
    enabled: !!customerId,
  });

  const { data: orders = [], isLoading: isLoadingOrders } = useQuery<SalesOrder[]>({
    queryKey: ["/api/customers", customerId, "orders"],
    queryFn: async () => {
      const response = await fetch(`/api/customers/${customerId}/orders`);
      if (!response.ok) throw new Error("Failed to fetch customer orders");
      return response.json();
    },
    enabled: !!customerId,
  });

  if (isLoadingCustomer) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="border border-zinc-800 rounded-lg bg-zinc-950 p-8">
            <div className="text-center text-zinc-400">Loading customer details...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0) / 100; // Convert from cents
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const recentOrders = orders.slice(0, 5);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "bg-yellow-500/20 text-yellow-400";
      case "PROCESSING": return "bg-blue-500/20 text-blue-400";
      case "SHIPPED": return "bg-purple-500/20 text-purple-400";
      case "DELIVERED": return "bg-green-500/20 text-green-400";
      case "CANCELLED": return "bg-red-500/20 text-red-400";
      default: return "bg-zinc-500/20 text-zinc-400";
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              asChild
              className="text-zinc-400 hover:text-white"
            >
              <Link href="/customers">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Customers
              </Link>
            </Button>
            
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <span className="text-green-400 font-bold text-lg">
                  {customer.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{customer.name}</h1>
                <p className="text-zinc-400">Customer Profile</p>
              </div>
            </div>
          </div>
          
          <Button asChild className="bg-green-600 hover:bg-green-700">
            <Link href={`/customers/${customer.id}/edit`}>
              Edit Customer
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Customer Information */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="bg-zinc-950 border-zinc-800 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Contact Information</h2>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-zinc-400" />
                  <span className="text-white">{customer.name}</span>
                </div>
                
                {customer.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-zinc-400" />
                    <a 
                      href={`mailto:${customer.email}`}
                      className="text-green-400 hover:text-green-300 transition-colors"
                    >
                      {customer.email}
                    </a>
                  </div>
                )}
                
                {customer.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-zinc-400" />
                    <a 
                      href={`tel:${customer.phone}`}
                      className="text-green-400 hover:text-green-300 transition-colors"
                    >
                      {customer.phone}
                    </a>
                  </div>
                )}
                
                {customer.company && (
                  <div className="flex items-center gap-3">
                    <Building className="w-4 h-4 text-zinc-400" />
                    <span className="text-white">{customer.company}</span>
                  </div>
                )}
                
                {customer.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-zinc-400 mt-0.5" />
                    <span className="text-white">{customer.address}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-3 pt-2 border-t border-zinc-800">
                  <Calendar className="w-4 h-4 text-zinc-400" />
                  <span className="text-zinc-300">
                    Customer since {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : "N/A"}
                  </span>
                </div>
              </div>
            </Card>

            {/* Customer Stats */}
            <Card className="bg-zinc-950 border-zinc-800 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Customer Metrics</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-zinc-400" />
                    <span className="text-zinc-300">Total Orders</span>
                  </div>
                  <span className="text-white font-medium">{totalOrders}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-zinc-400" />
                    <span className="text-zinc-300">Total Revenue</span>
                  </div>
                  <span className="text-white font-medium">${totalRevenue.toFixed(2)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-zinc-400" />
                    <span className="text-zinc-300">Avg Order Value</span>
                  </div>
                  <span className="text-white font-medium">${averageOrderValue.toFixed(2)}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Orders Section */}
          <div className="lg:col-span-2">
            <Card className="bg-zinc-950 border-zinc-800">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-white">
                    Order History ({totalOrders})
                  </h2>
                  
                  {totalOrders > 5 && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-green-400 hover:text-green-300"
                    >
                      View All Orders
                    </Button>
                  )}
                </div>

                {isLoadingOrders ? (
                  <div className="text-center py-8">
                    <div className="text-zinc-400">Loading orders...</div>
                  </div>
                ) : totalOrders === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-zinc-300 mb-2">No orders yet</h3>
                    <p className="text-zinc-400">This customer hasn't placed any orders yet.</p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-zinc-800">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-zinc-800 hover:bg-zinc-900/50">
                          <TableHead className="text-zinc-300">Order #</TableHead>
                          <TableHead className="text-zinc-300">Status</TableHead>
                          <TableHead className="text-zinc-300">Date</TableHead>
                          <TableHead className="text-zinc-300 text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentOrders.map((order) => (
                          <TableRow 
                            key={order.id} 
                            className="border-zinc-800 hover:bg-zinc-900/50"
                          >
                            <TableCell>
                              <Link 
                                href={`/sales-orders/${order.id}`}
                                className="text-green-400 hover:text-green-300 font-medium"
                              >
                                #{order.orderNumber}
                              </Link>
                            </TableCell>
                            
                            <TableCell>
                              <Badge className={getStatusColor(order.status)}>
                                {order.status}
                              </Badge>
                            </TableCell>
                            
                            <TableCell className="text-zinc-300">
                              {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "-"}
                            </TableCell>
                            
                            <TableCell className="text-right text-white font-medium">
                              ${((order.total || 0) / 100).toFixed(2)}
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
      </div>
    </div>
  );
}