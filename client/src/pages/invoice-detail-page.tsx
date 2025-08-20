import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  FileText, 
  Download, 
  Plus, 
  ArrowLeft,
  Calendar,
  User,
  DollarSign
} from "lucide-react";
import { currencyFormat, fx } from "@/utils/currency";
import { useToast } from "@/hooks/use-toast";

interface Invoice {
  id: string;
  number: string;
  orderId: string;
  customerId: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  locale: string;
  lineItems: any[];
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  payments: any[];
  status: 'UNPAID' | 'PARTIAL' | 'PAID';
  notes?: string;
}

interface Payment {
  id: string;
  date: string;
  amount: number;
  method: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
}

const INVOICES_KEY = "flowventory:invoices";
const CUSTOMERS_KEY = "flowventory:customers";

export default function InvoiceDetailPage() {
  const [match, params] = useRoute("/invoices/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    method: 'Cash'
  });

  useEffect(() => {
    if (!params?.id) return;

    // Load invoice
    const invoices = JSON.parse(localStorage.getItem(INVOICES_KEY) || '[]');
    const foundInvoice = invoices.find((inv: Invoice) => inv.id === params.id);
    
    if (!foundInvoice) {
      toast({
        title: "Invoice not found",
        description: "The requested invoice could not be found.",
        variant: "destructive",
      });
      setLocation('/invoices');
      return;
    }

    setInvoice(foundInvoice);

    // Load customer
    const customers = JSON.parse(localStorage.getItem(CUSTOMERS_KEY) || '[]');
    const foundCustomer = customers.find((cust: Customer) => cust.id === foundInvoice.customerId);
    setCustomer(foundCustomer || null);
  }, [params?.id, setLocation, toast]);

  const getTotalPaid = (): number => {
    if (!invoice) return 0;
    return invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);
  };

  const getRemainingBalance = (): number => {
    if (!invoice) return 0;
    return invoice.grandTotal - getTotalPaid();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20';
      case 'PARTIAL':
        return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20';
      case 'UNPAID':
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
      default:
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20';
    }
  };

  const addPayment = () => {
    if (!invoice || !paymentForm.amount) return;

    const amount = parseFloat(paymentForm.amount);
    if (amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Payment amount must be greater than zero.",
        variant: "destructive",
      });
      return;
    }

    const remainingBalance = getRemainingBalance();
    if (amount > remainingBalance) {
      toast({
        title: "Payment exceeds balance",
        description: `Payment amount cannot exceed remaining balance of ${currencyFormat(remainingBalance, invoice.currency, invoice.locale)}.`,
        variant: "destructive",
      });
      return;
    }

    const newPayment: Payment = {
      id: Date.now().toString(),
      date: paymentForm.date,
      amount: amount,
      method: paymentForm.method
    };

    const updatedPayments = [...invoice.payments, newPayment];
    const totalPaid = updatedPayments.reduce((sum, payment) => sum + payment.amount, 0);
    
    // Update status based on total paid
    let newStatus: 'UNPAID' | 'PARTIAL' | 'PAID' = 'UNPAID';
    if (totalPaid >= invoice.grandTotal) {
      newStatus = 'PAID';
    } else if (totalPaid > 0) {
      newStatus = 'PARTIAL';
    }

    const updatedInvoice = {
      ...invoice,
      payments: updatedPayments,
      status: newStatus
    };

    // Update in localStorage
    const invoices = JSON.parse(localStorage.getItem(INVOICES_KEY) || '[]');
    const updatedInvoices = invoices.map((inv: Invoice) => 
      inv.id === invoice.id ? updatedInvoice : inv
    );
    localStorage.setItem(INVOICES_KEY, JSON.stringify(updatedInvoices));

    setInvoice(updatedInvoice);
    setIsAddingPayment(false);
    setPaymentForm({
      date: new Date().toISOString().split('T')[0],
      amount: '',
      method: 'Cash'
    });

    toast({
      title: "Payment added",
      description: `Payment of ${currencyFormat(amount, invoice.currency, invoice.locale)} has been recorded.`,
    });
  };

  const downloadPDF = () => {
    // Create a print-friendly view
    const printWindow = window.open('', '_blank');
    if (!printWindow || !invoice || !customer) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoice.number}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .invoice-title { font-size: 28px; font-weight: bold; color: #333; }
            .invoice-number { font-size: 18px; color: #666; }
            .details { margin: 20px 0; }
            .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .table th, .table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            .table th { background-color: #f5f5f5; }
            .totals { margin-top: 20px; text-align: right; }
            .total-row { font-weight: bold; font-size: 18px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="invoice-title">INVOICE</div>
            <div class="invoice-number">${invoice.number}</div>
          </div>
          
          <div class="details">
            <strong>Bill To:</strong><br>
            ${customer.name}<br>
            ${customer.email}
          </div>
          
          <div class="details">
            <strong>Issue Date:</strong> ${new Date(invoice.issueDate).toLocaleDateString()}<br>
            <strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}<br>
            <strong>Status:</strong> ${invoice.status}
          </div>
          
          <table class="table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Tax Rate</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.lineItems.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.qty}</td>
                  <td>${currencyFormat(item.unitPrice, invoice.currency, invoice.locale)}</td>
                  <td>${(item.taxRate * 100).toFixed(1)}%</td>
                  <td>${currencyFormat(item.qty * item.unitPrice, invoice.currency, invoice.locale)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="totals">
            <div>Subtotal: ${currencyFormat(invoice.subtotal, invoice.currency, invoice.locale)}</div>
            <div>Tax: ${currencyFormat(invoice.taxTotal, invoice.currency, invoice.locale)}</div>
            <div class="total-row">Total: ${currencyFormat(invoice.grandTotal, invoice.currency, invoice.locale)}</div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  // Get base currency conversion
  const getBaseCurrencyConversion = (): { amount: number; currency: string } => {
    const settings = JSON.parse(localStorage.getItem('flowventory:settings') || '{}');
    const baseCurrency = settings.finance?.baseCurrency || 'USD';
    
    if (!invoice || invoice.currency === baseCurrency) {
      return { amount: invoice?.grandTotal || 0, currency: baseCurrency };
    }
    
    const convertedAmount = fx(invoice.grandTotal, invoice.currency, baseCurrency);
    return { amount: convertedAmount, currency: baseCurrency };
  };

  if (!invoice || !customer) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Loading invoice...</p>
        </div>
      </div>
    );
  }

  const baseCurrencyConversion = getBaseCurrencyConversion();

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/invoices')}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Invoices
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {invoice.number}
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Invoice Details & Payment Tracking
            </p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Button onClick={downloadPDF} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          
          <Dialog open={isAddingPayment} onOpenChange={setIsAddingPayment}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Payment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Payment</DialogTitle>
                <DialogDescription>
                  Record a payment for this invoice. Remaining balance: {currencyFormat(getRemainingBalance(), invoice.currency, invoice.locale)}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="paymentDate">Payment Date</Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={paymentForm.date}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="paymentAmount">Amount</Label>
                  <Input
                    id="paymentAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    max={getRemainingBalance()}
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select value={paymentForm.method} onValueChange={(value) => setPaymentForm(prev => ({ ...prev, method: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Card">Card</SelectItem>
                      <SelectItem value="Bank">Bank Transfer</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsAddingPayment(false)}>
                    Cancel
                  </Button>
                  <Button onClick={addPayment}>
                    Add Payment
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Invoice Information
                </CardTitle>
                <Badge className={getStatusColor(invoice.status)}>
                  {invoice.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Customer</p>
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-sm text-gray-500">{customer.email}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Dates</p>
                      <p className="font-medium">Issue: {new Date(invoice.issueDate).toLocaleDateString()}</p>
                      <p className="font-medium">Due: {new Date(invoice.dueDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Tax Rate</TableHead>
                    <TableHead>Line Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.lineItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.qty}</TableCell>
                      <TableCell>{currencyFormat(item.unitPrice, invoice.currency, invoice.locale)}</TableCell>
                      <TableCell>{(item.taxRate * 100).toFixed(1)}%</TableCell>
                      <TableCell>{currencyFormat(item.qty * item.unitPrice, invoice.currency, invoice.locale)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {/* Totals */}
              <div className="mt-6 space-y-2 text-right">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{currencyFormat(invoice.subtotal, invoice.currency, invoice.locale)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>{currencyFormat(invoice.taxTotal, invoice.currency, invoice.locale)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>{currencyFormat(invoice.grandTotal, invoice.currency, invoice.locale)}</span>
                </div>
                
                {/* Base Currency Conversion */}
                {invoice.currency !== baseCurrencyConversion.currency && (
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 italic">
                    <span>Converted to Base Currency ({baseCurrencyConversion.currency}):</span>
                    <span>{currencyFormat(baseCurrencyConversion.amount, baseCurrencyConversion.currency)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Summary */}
        <div className="space-y-6">
          {/* Payment Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Amount:</span>
                  <span className="font-semibold">{currencyFormat(invoice.grandTotal, invoice.currency, invoice.locale)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Paid:</span>
                  <span className="font-semibold text-green-600">{currencyFormat(getTotalPaid(), invoice.currency, invoice.locale)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span>Remaining:</span>
                  <span className="font-bold text-red-600">{currencyFormat(getRemainingBalance(), invoice.currency, invoice.locale)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>
                {invoice.payments.length} payment{invoice.payments.length !== 1 ? 's' : ''} recorded
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invoice.payments.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No payments recorded</p>
              ) : (
                <div className="space-y-3">
                  {invoice.payments.map(payment => (
                    <div key={payment.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <p className="font-medium">{currencyFormat(payment.amount, invoice.currency, invoice.locale)}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{payment.method}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(payment.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}