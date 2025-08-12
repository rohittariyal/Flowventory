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
    payoutsBuffer: Buffer,
    ingestData: ReconIngestData,
    workspaceId: string,
    baseCurrency: 'INR' | 'GBP' | 'AED' | 'SGD' | 'USD' = 'INR'
  ) {
    try {
      // Parse CSV files
      const ordersData = await this.parseCsvBuffer(ordersBuffer);
      const payoutsData = await this.parseCsvBuffer(payoutsBuffer);
      
      // Normalize data
      const orders = this.normalizeOrdersData(ordersData);
      const payouts = this.normalizePayoutsData(payoutsData);
      
      // Get all unique currencies
      const currencies = Array.from(new Set([
        ...orders.map(o => o.currency),
        ...payouts.map(p => p.currency)
      ]));
      
      // Create batch
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
      
      // Process each order
      const rows = [];
      let totalExpectedBase = 0;
      let totalPaidBase = 0;
      let mismatchedCount = 0;
      
      for (const order of orders) {
        const payout = payouts.find(p => p.orderId === order.orderId);
        const paid = payout ? payout.paid : 0;
        
        // Calculate expected net
        const expectedNet = order.netExpected || (order.gross! - order.fees! - order.tax!);
        const diff = paid - expectedNet;
        
        // Convert to base currency (amounts in cents)
        const expectedNetBase = Math.round(CurrencyService.convertToBase(expectedNet, order.currency, baseCurrency) * 100);
        const paidBase = Math.round(CurrencyService.convertToBase(paid, order.currency, baseCurrency) * 100);
        const diffBase = paidBase - expectedNetBase;
        
        // Create row
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
          status: 'PENDING',
        });
        
        rows.push(row);
        totalExpectedBase += expectedNetBase;
        totalPaidBase += paidBase;
        
        // Create event and task for mismatches
        if (Math.abs(diffBase) > 1) { // More than 1 cent difference
          mismatchedCount++;
          await this.createPaymentMismatchEvent(row, ingestData);
        }
      }
      
      // Update batch totals
      await storage.updateReconBatchTotals(batch.id, {
        expectedBaseTotal: totalExpectedBase,
        paidBaseTotal: totalPaidBase,
        diffBaseTotal: totalPaidBase - totalExpectedBase,
        ordersTotal: orders.length,
        mismatchedCount,
      });
      
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
      console.error('Reconciliation ingestion error:', error);
      throw new Error('Failed to process reconciliation data');
    }
  }
  
  private static async parseCsvBuffer(buffer: Buffer): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      
      parse(buffer, { headers: true, trim: true })
        .on('data', (row: any) => {
          // Normalize headers to lowercase
          const normalizedRow: any = {};
          for (const [key, value] of Object.entries(row)) {
            normalizedRow[key.toLowerCase().replace(/\s+/g, '')] = value;
          }
          results.push(normalizedRow);
        })
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  }
  
  private static normalizeOrdersData(data: any[]): OrderRow[] {
    return data.map(row => {
      const orderId = row.orderid || row.order_id || row.id;
      const currency = row.currency || 'USD';
      const gross = this.parseNumber(row.gross);
      const fees = this.parseNumber(row.fees);
      const tax = this.parseNumber(row.tax);
      const netExpected = this.parseNumber(row.netexpected || row.net_expected);
      
      if (!orderId) throw new Error('Missing orderId in orders data');
      
      return {
        orderId: String(orderId),
        currency,
        gross,
        fees,
        tax,
        netExpected,
      };
    });
  }
  
  private static normalizePayoutsData(data: any[]): PayoutRow[] {
    return data.map(row => {
      const orderId = row.orderid || row.order_id || row.id;
      const currency = row.currency || 'USD';
      const paid = this.parseNumber(row.paid) || 0;
      
      if (!orderId) throw new Error('Missing orderId in payouts data');
      
      return {
        orderId: String(orderId),
        currency,
        paid,
      };
    });
  }
  
  private static parseNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Remove commas and parse
      const cleaned = value.replace(/,/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }
  
  private static async createPaymentMismatchEvent(row: any, ingestData: ReconIngestData) {
    try {
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
      
      const { event, taskCreated } = await storage.createEvent(eventData);
      
      // Link the event to the recon row (update notes with event/task reference)
      await storage.updateReconRow(row.id, { 
        notes: `Event: ${event.id}, Task: ${taskCreated?.id || 'none'}` 
      });
      
    } catch (error) {
      console.error('Error creating payment mismatch event:', error);
    }
  }
}