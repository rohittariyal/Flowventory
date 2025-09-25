import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Package } from "lucide-react";
import { NotesTab } from "@/components/product/NotesTab";
import { BatchesTab } from "@/components/product/BatchesTab";
import { getProductBySku, type Product } from "@/data/seedProductData";

// Product interface imported from seedProductData

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load product using the product data helper
    const foundProduct = getProductBySku(id || "");
    setProduct(foundProduct || null);
    setLoading(false);
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-zinc-800 rounded w-1/4"></div>
            <div className="h-64 bg-zinc-800 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Product Not Found</h1>
            <p className="text-zinc-400 mb-6">The product you're looking for doesn't exist.</p>
            <Button asChild variant="outline">
              <Link href="/inventory">Back to Inventory</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const getStockStatusColor = (stock: number, reorderPoint: number) => {
    if (stock <= 0) return "text-red-400";
    if (stock <= reorderPoint) return "text-yellow-400";
    return "text-green-400";
  };

  const getStatusBadgeColor = (status: string) => {
    switch ((status || "").toLowerCase()) {
      case "active":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "low stock":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "out of stock":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
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
              <Link href="/inventory">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Inventory
              </Link>
            </Button>
            
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <Package className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{product.name}</h1>
                <p className="text-zinc-400">SKU: {product.sku}</p>
              </div>
            </div>
          </div>
          
          <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getStatusBadgeColor(product.status)}`}>
            {product.status}
          </div>
        </div>

        {/* Product Details */}
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-zinc-900">
            <TabsTrigger value="details" className="data-[state=active]:bg-green-600">
              Details
            </TabsTrigger>
            <TabsTrigger value="batches" className="data-[state=active]:bg-green-600">
              Batches
            </TabsTrigger>
            <TabsTrigger value="notes" className="data-[state=active]:bg-green-600">
              Notes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Information */}
              <Card className="bg-zinc-950 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-zinc-400 text-sm">Category</p>
                      <p className="text-white font-medium">{product.category}</p>
                    </div>
                    <div>
                      <p className="text-zinc-400 text-sm">Supplier</p>
                      <p className="text-white font-medium">{product.supplier}</p>
                    </div>
                    <div>
                      <p className="text-zinc-400 text-sm">Location</p>
                      <p className="text-white font-medium">{product.location}</p>
                    </div>
                    <div>
                      <p className="text-zinc-400 text-sm">Status</p>
                      <p className={`font-medium ${getStockStatusColor(product.stock, product.reorderPoint)}`}>
                        {product.status}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pricing */}
              <Card className="bg-zinc-950 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white">Pricing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-zinc-400 text-sm">Cost Price</p>
                      <p className="text-white font-medium">${product.cost.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-zinc-400 text-sm">Selling Price</p>
                      <p className="text-white font-medium">${product.price.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-zinc-400 text-sm">Margin</p>
                      <p className="text-green-400 font-medium">
                        ${(product.price - product.cost).toFixed(2)} ({(((product.price - product.cost) / product.price) * 100).toFixed(1)}%)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stock Information */}
              <Card className="bg-zinc-950 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white">Stock Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-zinc-400 text-sm">Total Stock</p>
                      <p className={`font-medium text-lg ${getStockStatusColor(product.stock, product.reorderPoint)}`}>
                        {product.stock} units
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-400 text-sm">Reserved</p>
                      <p className="text-orange-400 font-medium">{product.reserved} units</p>
                    </div>
                    <div>
                      <p className="text-zinc-400 text-sm">Available</p>
                      <p className="text-green-400 font-medium">{product.available} units</p>
                    </div>
                    <div>
                      <p className="text-zinc-400 text-sm">Reorder Point</p>
                      <p className="text-white font-medium">{product.reorderPoint} units</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Analytics */}
              <Card className="bg-zinc-950 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white">Analytics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-zinc-400 text-sm">Velocity (per day)</p>
                      <p className="text-white font-medium">{product.velocity} units/day</p>
                    </div>
                    <div>
                      <p className="text-zinc-400 text-sm">Days Left</p>
                      <p className={`font-medium ${product.daysLeft <= 7 ? 'text-red-400' : product.daysLeft <= 14 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {product.daysLeft} days
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-400 text-sm">Max Stock</p>
                      <p className="text-white font-medium">{product.maxStock} units</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="batches" className="mt-6">
            <BatchesTab 
              product={product} 
              onProductUpdate={(updatedProduct) => setProduct(updatedProduct)} 
            />
          </TabsContent>

          <TabsContent value="notes" className="mt-6">
            <NotesTab productId={product.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}