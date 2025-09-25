import { nanoid } from "nanoid";
import type { 
  FinanceSettings, 
  TaxRegion, 
  TaxRule, 
  TaxProduct, 
  TaxCustomer,
  TaxOrder, 
  TaxInvoice, 
  OrderItem, 
  OrderTotals,
  PlaceOfSupply,
  TaxBreakup
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
      businessState: "KA", // Default business state for India GST demo
      regions: [
        // UK (VAT)
        {
          id: "UK",
          name: "United Kingdom",
          currency: "GBP",
          locale: "en-GB",
          taxRules: [
            { id: "uk_std", name: "VAT 20% (Standard)", rate: 0.20, category: "standard" },
            { id: "uk_red", name: "VAT 5% (Reduced)", rate: 0.05, category: "reduced" },
            { id: "uk_zero", name: "VAT 0% (Zero)", rate: 0, category: "zero" }
          ]
        },

        // UAE (VAT)
        {
          id: "UAE",
          name: "United Arab Emirates",
          currency: "AED",
          locale: "en-AE",
          taxRules: [
            { id: "ae_std", name: "VAT 5% (Standard)", rate: 0.05, category: "standard" },
            { id: "ae_zero", name: "VAT 0% (Zero)", rate: 0, category: "zero" }
          ]
        },

        // Singapore (GST)
        {
          id: "SG",
          name: "Singapore",
          currency: "SGD",
          locale: "en-SG",
          taxRules: [
            { id: "sg_std", name: "GST 9% (Standard)", rate: 0.09, category: "standard" },
            { id: "sg_zero", name: "GST 0% (Zero)", rate: 0, category: "zero" }
          ]
        },

        // India (GST, simplified)
        {
          id: "IN",
          name: "India",
          currency: "INR",
          locale: "en-IN",
          taxRules: [
            { id: "in_gst_18", name: "GST 18% (Std)", rate: 0.18, category: "standard" },
            { id: "in_gst_12", name: "GST 12% (Reduced)", rate: 0.12, category: "reduced" },
            { id: "in_gst_0", name: "GST 0% (Zero/Exempt)", rate: 0, category: "zero" }
          ],
          states: ["KA", "MH", "DL", "TN", "GJ", "UP", "WB", "RJ"]
        },

        // US (Sales Tax, simplified per-state)
        {
          id: "US",
          name: "United States",
          currency: "USD",
          locale: "en-US",
          taxRules: [
            { id: "us_std", name: "Default Sales Tax", rate: 0.08, category: "state" }
          ],
          states: ["CA", "NY", "TX", "FL"],
          stateRates: [
            { code: "CA", rate: 0.085 },
            { code: "NY", rate: 0.08875 },
            { code: "TX", rate: 0.0825 },
            { code: "FL", rate: 0.07 }
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

// Customer management functions
export function initializeCustomersForTax(): void {
  const key = "flowventory:customers";
  const existing = localStorage.getItem(key);
  
  if (!existing) {
    const defaultCustomers: TaxCustomer[] = [
      {
        id: "cust_uk_1",
        name: "British Electronics Ltd",
        email: "orders@britishelectronics.co.uk",
        regionId: "UK",
        country: "United Kingdom",
        gstinOrVatNo: "GB123456789"
      },
      {
        id: "cust_uae_1", 
        name: "Emirates Trading LLC",
        email: "procurement@emiratestrading.ae",
        regionId: "UAE",
        country: "United Arab Emirates",
        gstinOrVatNo: "100123456700003"
      },
      {
        id: "cust_sg_1",
        name: "Singapore Tech Pte Ltd",
        email: "orders@sgtech.com.sg", 
        regionId: "SG",
        country: "Singapore",
        gstinOrVatNo: "200012345M"
      },
      {
        id: "cust_in_ka_1",
        name: "Karnataka Software Solutions",
        email: "billing@karnatakasoft.in",
        regionId: "IN", 
        country: "India",
        state: "KA",
        gstinOrVatNo: "29ABCDE1234F1Z5"
      },
      {
        id: "cust_in_mh_1",
        name: "Mumbai Manufacturing Co",
        email: "accounts@mumbaimfg.in",
        regionId: "IN",
        country: "India", 
        state: "MH",
        gstinOrVatNo: "27ABCDE1234F1Z5"
      },
      {
        id: "cust_us_ca_1",
        name: "California Corp",
        email: "purchasing@californiacorp.com",
        regionId: "US",
        country: "United States",
        state: "CA"
      },
      {
        id: "cust_us_ny_1",
        name: "New York Enterprises",
        email: "orders@nyenterprises.com", 
        regionId: "US",
        country: "United States",
        state: "NY"
      }
    ];
    localStorage.setItem(key, JSON.stringify(defaultCustomers));
  }
}

// Utility to get customers
export function getTaxCustomers(): TaxCustomer[] {
  const key = "flowventory:customers";
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

// Utility to save customers
export function saveTaxCustomers(customers: TaxCustomer[]): void {
  const key = "flowventory:customers";
  localStorage.setItem(key, JSON.stringify(customers));
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

  // Use product tax category to find matching rule
  if (product?.taxCategory) {
    const taxRule = region.taxRules.find(rule => rule.category === product.taxCategory);
    if (taxRule) return taxRule.rate;
  }

  // Default to standard rate in region
  const standardRule = region.taxRules.find(rule => rule.category === "standard");
  return standardRule?.rate || 0;
}

// Advanced tax calculation for different regions with place of supply
export function calculateRegionTax(
  regionId: string,
  customerState: string | undefined,
  businessState: string | undefined,
  lineItems: OrderItem[],
  productTaxCategories: Record<string, string> = {}
): { 
  totals: OrderTotals; 
  taxBreakup?: TaxBreakup;
  lineItemTaxDetails: Array<{
    productId: string;
    taxRate: number;
    taxAmount: number;
    taxBreakup?: TaxBreakup;
  }>;
} {
  const settings = getFinanceSettings();
  if (!settings) {
    return { 
      totals: { sub: 0, tax: 0, grand: 0, currency: "USD" },
      lineItemTaxDetails: []
    };
  }

  const region = settings.regions.find(r => r.id === regionId);
  if (!region) {
    return { 
      totals: { sub: 0, tax: 0, grand: 0, currency: "USD" },
      lineItemTaxDetails: []
    };
  }

  let subtotal = 0;
  let totalTax = 0;
  let totalCGST = 0;
  let totalSGST = 0; 
  let totalIGST = 0;
  const lineItemTaxDetails: Array<{
    productId: string;
    taxRate: number;
    taxAmount: number;
    taxBreakup?: TaxBreakup;
  }> = [];

  lineItems.forEach(item => {
    const lineSubtotal = item.qty * item.unitPrice;
    subtotal += lineSubtotal;

    // Get tax rate for this line item
    let taxRate = 0;
    let lineTaxBreakup: TaxBreakup | undefined;

    if (regionId === "IN" && businessState && customerState) {
      // India GST logic
      const productCategory = productTaxCategories[item.productId] || "standard";
      const gstRule = region.taxRules.find(rule => rule.category === productCategory);
      
      if (gstRule) {
        taxRate = gstRule.rate;
        
        if (businessState === customerState) {
          // Same state: CGST + SGST
          const cgstRate = taxRate / 2;
          const sgstRate = taxRate / 2;
          const cgstAmount = lineSubtotal * cgstRate;
          const sgstAmount = lineSubtotal * sgstRate;
          
          totalCGST += cgstAmount;
          totalSGST += sgstAmount;
          lineTaxBreakup = { cgst: cgstAmount, sgst: sgstAmount };
        } else {
          // Different state: IGST
          const igstAmount = lineSubtotal * taxRate;
          totalIGST += igstAmount;
          lineTaxBreakup = { igst: igstAmount };
        }
      }
    } else if (regionId === "US" && customerState && region.stateRates) {
      // US state-specific tax
      const stateRate = region.stateRates.find(sr => sr.code === customerState);
      taxRate = stateRate ? stateRate.rate : (region.taxRules[0]?.rate || 0);
    } else {
      // Standard regional tax (UK, UAE, SG)
      const productCategory = productTaxCategories[item.productId] || "standard";
      const taxRule = region.taxRules.find(rule => rule.category === productCategory);
      taxRate = taxRule?.rate || 0;
    }

    const lineTax = lineSubtotal * taxRate;
    totalTax += lineTax;

    lineItemTaxDetails.push({
      productId: item.productId,
      taxRate,
      taxAmount: lineTax,
      taxBreakup: lineTaxBreakup
    });
  });

  const totals: OrderTotals = {
    sub: subtotal,
    tax: totalTax,
    grand: subtotal + totalTax,
    currency: region.currency
  };

  let taxBreakup: TaxBreakup | undefined;
  if (regionId === "IN" && (totalCGST > 0 || totalSGST > 0 || totalIGST > 0)) {
    taxBreakup = {
      cgst: totalCGST > 0 ? totalCGST : undefined,
      sgst: totalSGST > 0 ? totalSGST : undefined,
      igst: totalIGST > 0 ? totalIGST : undefined
    };
  }

  return { totals, taxBreakup, lineItemTaxDetails };
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
      
      // Handle cases where totals might be undefined
      const totals = item.totals || { sub: 0, tax: 0, grand: 0, currency: 'USD' };
      
      return {
        docNo: item.number,
        date: new Date(item.createdAt).toLocaleDateString(),
        customerSupplier: item.customerName || "Unknown",
        region: region?.name || item.regionId,
        subtotal: totals.sub,
        tax: totals.tax,
        grand: totals.grand,
        taxRule: taxRule?.name || "Unknown",
        currency: totals.currency
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
  initializeCustomersForTax();
  initializeOrdersForTax();
}