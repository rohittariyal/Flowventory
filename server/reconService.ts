import { parse } from 'fast-csv';
import { storage } from './storage';
import { CurrencyService } from './currencyService';
import { randomUUID } from 'crypto';
import type { ReconIngestData } from '@shared/schema';

interface OrderRow {
  orderId: string;
  currency: string;
  gross?: number;
  fees?: number;
  tax?: number;
  netExpected?: number;
}

interface PayoutRow {
  orderId: string;
  currency: string;
  paid: number;
}

export class ReconciliationService {
  
  static async ingestReconciliation(
    ordersBuffer: Buffer,
    payoutsBuffer: Buffer | null,
    ingestData: ReconIngestData,
    workspaceId: string,
    baseCurrency: 'INR' | 'GBP' | 'AED' | 'SGD' | 'USD' = 'INR'
  ) {
    console.log('🔄 Starting reconciliation ingestion for', ingestData.source, ingestData.region);
    
    try {
      // Parse CSV files with robust error handling
      console.log('📊 Parsing CSV files...');
      const ordersData = this.parseCsvBufferSync(ordersBuffer, 'orders');
      const payoutsData = payoutsBuffer ? this.parseCsvBufferSync(payoutsBuffer, 'payouts') : [];
      
      console.log(`✅ Parsed ${ordersData.length} orders and ${payoutsData.length} payouts`);
      
      // Normalize data
      console.log('🔧 Normalizing data...');
      const orders = this.normalizeOrdersData(ordersData);
      const payouts = this.normalizePayoutsData(payoutsData);
      
      console.log(`🔧 Normalized ${orders.length} orders and ${payouts.length} payouts`);
      
      // Get all unique currencies
      const currencies = Array.from(new Set([
        ...orders.map(o => o.currency),
        ...payouts.map(p => p.currency)
      ]));
      
      // Create batch
      console.log('💾 Creating reconciliation batch...');
      const batch = await storage.createReconBatch({
        workspaceId,
        source: ingestData.source,
        region: ingestData.region,
        periodFrom: ingestData.periodFrom ? new Date(ingestData.periodFrom) : undefined,
        periodTo: ingestData.periodTo ? new Date(ingestData.periodTo) : undefined,
        inputCurrencies: currencies,
        baseCurrency,
        expectedBaseTotal: 0,
        paidBaseTotal: 0,
        diffBaseTotal: 0,
        ordersTotal: 0,
        mismatchedCount: 0,
      });
      
      console.log(`✅ Created batch ${batch.id}`);
      
      // Process each order
      console.log('🔍 Processing reconciliation rows...');
      const rows = [];
      let totalExpectedBase = 0;
      let totalPaidBase = 0;
      let mismatchedCount = 0;
      
      for (let i = 0; i < orders.length; i++) {
        const order = orders[i];
        const payout = payouts.find(p => p.orderId === order.orderId);
        const paid = payout ? payout.paid : 0;
        
        // Calculate expected net
        const expectedNet = order.netExpected || (order.gross! - order.fees! - order.tax!);
        const diff = paid - expectedNet;
        
        // Convert to base currency (amounts in cents)
        const expectedNetBase = Math.round(CurrencyService.convert(expectedNet, order.currency, baseCurrency) * 100);
        const paidBase = Math.round(CurrencyService.convert(paid, order.currency, baseCurrency) * 100);
        const diffBase = paidBase - expectedNetBase;
        
        try {
          // Create row with error handling
          const row = await storage.createReconRow({
            batchId: batch.id,
            orderId: order.orderId,
            currency: order.currency,
            gross: Math.round((order.gross || 0) * 100),
            fees: Math.round((order.fees || 0) * 100),
            tax: Math.round((order.tax || 0) * 100),
            expectedNet: Math.round(expectedNet * 100),
            paid: Math.round(paid * 100),
            diff: Math.round(diff * 100),
            expectedNetBase,
            paidBase,
            diffBase,
            status: Math.abs(diffBase) > 1 ? 'PENDING' : 'RESOLVED',
          });
          
          rows.push(row);
          totalExpectedBase += expectedNetBase;
          totalPaidBase += paidBase;
          
          // Create event and task for mismatches with error handling
          if (Math.abs(diffBase) > 1) { // More than 1 cent difference
            mismatchedCount++;
            try {
              await this.createPaymentMismatchEvent(row, ingestData);
            } catch (eventError) {
              console.warn(`⚠️ Failed to create event/task for order ${order.orderId}:`, eventError);
              // Continue processing other rows even if event creation fails
            }
          }
          
          if ((i + 1) % 100 === 0) {
            console.log(`📝 Processed ${i + 1}/${orders.length} rows`);
          }
          
        } catch (rowError) {
          console.error(`❌ Failed to create row for order ${order.orderId}:`, rowError);
          // Continue processing other rows even if one fails
        }
      }
      
      console.log(`✅ Successfully processed ${rows.length}/${orders.length} rows`);
      
      // Update batch totals
      console.log('📊 Updating batch totals...');
      await storage.updateReconBatchTotals(batch.id, {
        expectedBaseTotal: totalExpectedBase,
        paidBaseTotal: totalPaidBase,
        diffBaseTotal: totalPaidBase - totalExpectedBase,
        ordersTotal: orders.length,
        mismatchedCount,
      });
      
      console.log(`🎉 Reconciliation completed: ${mismatchedCount}/${orders.length} mismatches found`);
      
      return {
        batchId: batch.id,
        counts: {
          ordersTotal: orders.length,
          mismatched: mismatchedCount,
        },
        totals: {
          expectedBase: totalExpectedBase / 100,
          paidBase: totalPaidBase / 100,
          diffBase: (totalPaidBase - totalExpectedBase) / 100,
        }
      };
      
    } catch (error) {
      console.error('❌ Reconciliation ingestion error:', error);
      throw new Error(`Failed to process reconciliation data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  private static parseCsvBufferSync(buffer: Buffer, fileType: string): any[] {
    console.log(`📄 Parsing ${fileType} CSV buffer (${buffer.length} bytes)`);
    
    try {
      // Simple manual CSV parsing to avoid fast-csv hanging issues
      const csvText = buffer.toString('utf8');
      const lines = csvText.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        console.log(`⚠️ No data found in ${fileType} CSV`);
        return [];
      }
      
      // Parse headers
      const headerLine = lines[0];
      const headers = headerLine.split(',').map(h => h.trim().replace(/"/g, ''));
      console.log(`📋 Headers found in ${fileType}:`, headers);
      
      // Normalize headers to lowercase and remove spaces
      const normalizedHeaders = headers.map(h => h.toLowerCase().replace(/\s+/g, ''));
      
      const results: any[] = [];
      
      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Simple CSV parsing (handles basic cases)
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim().replace(/^"|"$/g, ''));
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current.trim().replace(/^"|"$/g, ''));
        
        // Create row object
        const row: any = {};
        for (let j = 0; j < normalizedHeaders.length && j < values.length; j++) {
          row[normalizedHeaders[j]] = values[j];
        }
        
        // Skip empty rows
        const hasData = Object.values(row).some(value => value && String(value).trim());
        if (hasData) {
          results.push(row);
        }
      }
      
      console.log(`✅ Finished parsing ${fileType}: ${results.length} valid rows`);
      return results;
      
    } catch (error) {
      console.error(`❌ CSV parsing error for ${fileType}:`, error);
      throw new Error(`Failed to parse ${fileType} CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  private static normalizeOrdersData(data: any[]): OrderRow[] {
    console.log('🔧 Normalizing orders data with sample:', data[0]);
    
    return data.map((row, index) => {
      try {
        const orderId = row.orderid || row.order_id || row.id;
        const currency = row.currency || 'USD';
        const gross = this.parseNumber(row.gross);
        const fees = this.parseNumber(row.fees);
        const tax = this.parseNumber(row.tax);
        const netExpected = this.parseNumber(row.netexpected || row.net_expected);
        
        if (!orderId) {
          console.error(`❌ Missing orderId in orders row ${index + 1}:`, row);
          throw new Error(`Missing orderId in orders row ${index + 1}`);
        }
        
        console.log(`📝 Normalized order ${orderId}: gross=${gross}, fees=${fees}, tax=${tax}, net=${netExpected}`);
        
        return {
          orderId: String(orderId),
          currency,
          gross,
          fees,
          tax,
          netExpected,
        };
      } catch (error) {
        console.error(`❌ Error normalizing orders row ${index + 1}:`, error, row);
        throw error;
      }
    });
  }
  
  private static normalizePayoutsData(data: any[]): PayoutRow[] {
    console.log('💰 Normalizing payouts data with sample:', data[0]);
    
    return data.map((row, index) => {
      try {
        const orderId = row.orderid || row.order_id || row.id;
        const currency = row.currency || 'USD';
        const paid = this.parseNumber(row.paid);
        
        if (!orderId) {
          console.error(`❌ Missing orderId in payouts row ${index + 1}:`, row);
          throw new Error(`Missing orderId in payouts row ${index + 1}`);
        }
        
        console.log(`💰 Normalized payout ${orderId}: paid=${paid} ${currency}`);
        
        return {
          orderId: String(orderId),
          currency,
          paid,
        };
      } catch (error) {
        console.error(`❌ Error normalizing payouts row ${index + 1}:`, error, row);
        throw error;
      }
    });
  }
  
  private static parseNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (!value || value === '') return 0;
    
    try {
      // Remove commas, currency symbols, and extra spaces
      const cleaned = String(value)
        .replace(/[$£€₹]/g, '') // Remove currency symbols
        .replace(/,/g, '') // Remove commas
        .replace(/\s+/g, '') // Remove spaces
        .trim();
      
      if (cleaned === '' || cleaned === '-') return 0;
      
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    } catch (error) {
      console.warn(`⚠️ Error parsing number "${value}":`, error);
      return 0;
    }
  }
  
  private static async createPaymentMismatchEvent(row: any, ingestData: ReconIngestData) {
    try {
      console.log(`🚨 Creating mismatch event for order ${row.orderId} with difference ${row.diffBase/100}`);
      
      const eventData = {
        type: 'PAYMENT_MISMATCH' as const,
        sku: undefined,
        channel: ingestData.source,
        payload: {
          orderId: row.orderId,
          currency: row.currency,
          expectedNet: row.expectedNet / 100,
          paid: row.paid / 100,
          diff: row.diff / 100,
          expectedNetBase: row.expectedNetBase / 100,
          paidBase: row.paidBase / 100,
          diffBase: row.diffBase / 100,
          source: ingestData.source,
          region: ingestData.region,
          reconRowId: row.id,
        },
        severity: Math.abs(row.diffBase) > 1000 ? 'HIGH' as const : 'MEDIUM' as const, // > $10 = HIGH
      };
      
      try {
        const { event, taskCreated } = await storage.createEvent(eventData);
        console.log(`✅ Created event ${event.id} and task ${taskCreated?.id || 'none'}`);
        
        // Link the event to the recon row (update notes with event/task reference)
        await storage.updateReconRow(row.id, { 
          notes: `Event: ${event.id}, Task: ${taskCreated?.id || 'none'}` 
        });
        
      } catch (duplicateError: any) {
        // Handle duplicate key errors (E11000) gracefully
        if (duplicateError.message?.includes('E11000') || duplicateError.code === 11000) {
          console.log(`⚠️ Duplicate event/task detected for order ${row.orderId}, skipping creation`);
        } else {
          throw duplicateError;
        }
      }
      
    } catch (error) {
      console.error(`❌ Error creating payment mismatch event for order ${row.orderId}:`, error);
      // Don't throw - let the reconciliation continue even if event creation fails
    }
  }
}