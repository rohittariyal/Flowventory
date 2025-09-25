import { nanoid } from "nanoid";
import type { 
  FinanceSettings, 
  TaxRegion, 
  TaxRule, 
  TaxProduct, 
  TaxOrder, 
  TaxInvoice, 
  OrderItem, 
  OrderTotals 
} from "@shared/schema";

// Currency formatting utility
export function currencyFormat(amount: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Tax calculation utility
export function calcTotals(
  lineItems: OrderItem[], 
  regionDefaultRate: number, 
  taxOverrides: Record<string, number> = {}
): OrderTotals {
  let subtotal = 0;
  let totalTax = 0;

  lineItems.forEach(item => {
    const lineSubtotal = item.qty * item.unitPrice;
    subtotal += lineSubtotal;

    // Use override rate if available, otherwise use region default rate
    const effectiveRate = taxOverrides[item.productId] ?? regionDefaultRate;
    const lineTax = lineSubtotal * effectiveRate;
    totalTax += lineTax;
  });

  return {
    sub: subtotal,
    tax: totalTax,
    grand: subtotal + totalTax,
    currency: "USD" // This will be set by the calling function based on region
  };
}

// Finance settings initialization and management
export function initializeFinanceSettings(): void {
  const key = "flowventory:settings:finance";
  const existing = localStorage.getItem(key);
  
  if (!existing) {
    const defaultSettings: FinanceSettings = {
      baseCurrency: "USD",
      displayLocale: "en-US",
      regions: [
        {
          id: "US",
          name: "United States",
          currency: "USD",
          locale: "en-US",
          taxRules: [
            { id: "us_std", name: "Sales Tax 8%", rate: 0.08, scope: "all" }
          ]
        },
        {
          id: "UK",
          name: "United Kingdom",
          currency: "GBP",
          locale: "en-GB",
          taxRules: [
            { id: "uk_vat", name: "VAT 20%", rate: 0.20, scope: "all" }
          ]
        },
        {
          id: "UAE",
          name: "United Arab Emirates",
          currency: "AED",
          locale: "en-AE",
          taxRules: [
            { id: "ae_vat", name: "VAT 5%", rate: 0.05, scope: "all" }
          ]
        },
        {
          id: "SG",
          name: "Singapore",
          currency: "SGD",
          locale: "en-SG",
          taxRules: [
            { id: "sg_gst", name: "GST 9%", rate: 0.09, scope: "all" }
          ]
        }
      ]
    };
    localStorage.setItem(key, JSON.stringify(defaultSettings));
  }
}

// Product initialization with tax overrides
export function initializeProductsForTax(): void {
  const key = "flowventory:products";
  const existing = localStorage.getItem(key);
  
  if (!existing) {
    const defaultProducts: TaxProduct[] = [
      {
        id: "prod_1",
        sku: "US-WIDGET-001",
        name: "Premium Widget (US)",
        regionId: "US",
        price: 25.99
      },
      {
        id: "prod_2",
        sku: "UK-GADGET-001",
        name: "Smart Gadget (UK)",
        regionId: "UK",
        price: 19.99
      },
      {
        id: "prod_3",
        sku: "UAE-DEVICE-001",
        name: "Tech Device (UAE)",
        regionId: "UAE",
        price: 89.99,
        taxOverride: { id: "zero", name: "Zero-rated", rate: 0 } // Demo zero-rated product
      },
      {
        id: "prod_4",
        sku: "SG-TOOL-001",
        name: "Professional Tool (SG)",
        regionId: "SG",
        price: 45.50
      }
    ];
    localStorage.setItem(key, JSON.stringify(defaultProducts));
  }
}

// Orders initialization with tax calculations
export function initializeOrdersForTax(): void {
  const key = "flowventory:orders";
  const existing = localStorage.getItem(key);
  
  if (!existing) {
    const defaultOrders: TaxOrder[] = [
      {
        id: "order_1",
        number: "ORD-2024-001",
        regionId: "UK",
        customerId: "cust_1",
        customerName: "John Smith",
        createdAt: new Date("2024-01-15").toISOString(),
        items: [
          {
            productId: "prod_2",
            name: "Smart Gadget (UK)",
            qty: 2,
            unitPrice: 19.99,
            effectiveTaxRate: 0.20
          }
        ],
        taxRuleId: "uk_vat",
        totals: {
          sub: 39.98,
          tax: 7.996,
          grand: 47.976,
          currency: "GBP"
        }
      },
      {
        id: "order_2",
        number: "ORD-2024-002",
        regionId: "US",
        customerId: "cust_2",
        customerName: "Jane Doe",
        createdAt: new Date("2024-01-20").toISOString(),
        items: [
          {
            productId: "prod_1",
            name: "Premium Widget (US)",
            qty: 1,
            unitPrice: 25.99,
            effectiveTaxRate: 0.08
          }
        ],
        taxRuleId: "us_std",
        totals: {
          sub: 25.99,
          tax: 2.08,
          grand: 28.07,
          currency: "USD"
        }
      }
    ];
    localStorage.setItem(key, JSON.stringify(defaultOrders));
  }
}

// Utility to get finance settings
export function getFinanceSettings(): FinanceSettings | null {
  const key = "flowventory:settings:finance";
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
}

// Utility to save finance settings
export function saveFinanceSettings(settings: FinanceSettings): void {
  const key = "flowventory:settings:finance";
  localStorage.setItem(key, JSON.stringify(settings));
}

// Utility to get products
export function getTaxProducts(): TaxProduct[] {
  const key = "flowventory:products";
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

// Utility to save products
export function saveTaxProducts(products: TaxProduct[]): void {
  const key = "flowventory:products";
  localStorage.setItem(key, JSON.stringify(products));
}

// Utility to get orders
export function getTaxOrders(): TaxOrder[] {
  const key = "flowventory:orders";
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

// Utility to save orders
export function saveTaxOrders(orders: TaxOrder[]): void {
  const key = "flowventory:orders";
  localStorage.setItem(key, JSON.stringify(orders));
}

// Utility to get invoices
export function getTaxInvoices(): TaxInvoice[] {
  const key = "flowventory:invoices";
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

// Utility to save invoices
export function saveTaxInvoices(invoices: TaxInvoice[]): void {
  const key = "flowventory:invoices";
  localStorage.setItem(key, JSON.stringify(invoices));
}

// Add a new tax rule to a region
export function addTaxRuleToRegion(regionId: string, taxRule: TaxRule): void {
  const settings = getFinanceSettings();
  if (!settings) return;

  const region = settings.regions.find(r => r.id === regionId);
  if (region) {
    region.taxRules.push(taxRule);
    saveFinanceSettings(settings);
  }
}

// Calculate effective tax rate for a product in a region
export function getEffectiveTaxRate(productId: string, regionId: string, selectedTaxRuleId?: string): number {
  const products = getTaxProducts();
  const settings = getFinanceSettings();
  
  if (!settings) return 0;

  const product = products.find(p => p.id === productId);
  const region = settings.regions.find(r => r.id === regionId);
  
  if (!region) return 0;

  // If product has tax override, use that
  if (product?.taxOverride) {
    return product.taxOverride.rate;
  }

  // If a specific tax rule is selected, use that
  if (selectedTaxRuleId) {
    const taxRule = region.taxRules.find(rule => rule.id === selectedTaxRuleId);
    if (taxRule) return taxRule.rate;
  }

  // Default to first tax rule in region
  return region.taxRules[0]?.rate || 0;
}

// Generate compliance report data
export interface ComplianceReportRow {
  docNo: string;
  date: string;
  customerSupplier: string;
  region: string;
  subtotal: number;
  tax: number;
  grand: number;
  taxRule: string;
  currency: string;
}

export function generateComplianceReport(
  regionFilter?: string,
  dateStart?: string,
  dateEnd?: string,
  docType: "Orders" | "Invoices" = "Orders"
): ComplianceReportRow[] {
  const data = docType === "Orders" ? getTaxOrders() : getTaxInvoices();
  const settings = getFinanceSettings();
  
  if (!settings) return [];

  return data
    .filter(item => {
      // Region filter
      if (regionFilter && item.regionId !== regionFilter) return false;
      
      // Date range filter
      if (dateStart && new Date(item.createdAt) < new Date(dateStart)) return false;
      if (dateEnd && new Date(item.createdAt) > new Date(dateEnd)) return false;
      
      return true;
    })
    .map(item => {
      const region = settings.regions.find(r => r.id === item.regionId);
      const taxRule = region?.taxRules.find(rule => rule.id === item.taxRuleId);
      
      return {
        docNo: item.number,
        date: new Date(item.createdAt).toLocaleDateString(),
        customerSupplier: item.customerName || "Unknown",
        region: region?.name || item.regionId,
        subtotal: item.totals.sub,
        tax: item.totals.tax,
        grand: item.totals.grand,
        taxRule: taxRule?.name || "Unknown",
        currency: item.totals.currency
      };
    });
}

// Export compliance report as CSV
export function exportComplianceReportCSV(data: ComplianceReportRow[]): void {
  const headers = ["Doc No", "Date", "Customer/Supplier", "Region", "Subtotal", "Tax", "Grand Total", "Tax Rule", "Currency"];
  const csvContent = [
    headers.join(","),
    ...data.map(row => [
      row.docNo,
      row.date,
      `"${row.customerSupplier}"`,
      row.region,
      row.subtotal.toFixed(2),
      row.tax.toFixed(2),
      row.grand.toFixed(2),
      `"${row.taxRule}"`,
      row.currency
    ].join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `compliance-report-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Initialize all taxation data
export function initializeTaxationData(): void {
  initializeFinanceSettings();
  initializeProductsForTax();
  initializeOrdersForTax();
}