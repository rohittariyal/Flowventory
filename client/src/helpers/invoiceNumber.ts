// Generate invoice numbers in format INV-YYYYMM-####
export function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const yearMonth = `${year}${month}`;
  
  // Get existing invoices to find the next number for this month
  const invoices = JSON.parse(localStorage.getItem('flowventory:invoices') || '[]');
  const monthPrefix = `INV-${yearMonth}-`;
  
  // Find invoices from current month
  const monthInvoices = invoices.filter((inv: any) => inv.number.startsWith(monthPrefix));
  
  // Extract numbers and find the highest
  let maxNumber = 0;
  monthInvoices.forEach((inv: any) => {
    const numberPart = inv.number.substring(monthPrefix.length);
    const num = parseInt(numberPart, 10);
    if (!isNaN(num) && num > maxNumber) {
      maxNumber = num;
    }
  });
  
  // Generate next number
  const nextNumber = String(maxNumber + 1).padStart(4, '0');
  return `${monthPrefix}${nextNumber}`;
}