export type EntryType = 'INVOICE' | 'PAYMENT' | 'CN';

export interface InvoiceItem {
  id: string;
  size: string;
  pattern: string;
  quantity: number;
  unitPrice: number;
}

export interface LedgerEntry {
  id: string;
  type: EntryType;
  date: string;
  invoiceNo: string;
  // Legacy/Aggregated fields for display
  size?: string;
  pattern?: string;
  quantity?: number;
  unitPrice?: number;
  invoiceAmount?: number;
  
  // New: Detailed items
  items?: InvoiceItem[];

  dueDate?: string; // Auto-calculated for Invoices
  paymentAmount?: number;
  cnAmount?: number;
  status?: 'PENDING' | 'PAID' | 'ADJUSTED'; // For tracking Invoice status against CNs
  originalRefId?: string; // If this was created from a split
  notes?: string;
}

export interface Stats {
  totalInvoiced: number;
  totalPaid: number;
  totalCN: number;
  outstanding: number;
  // Tyre Category Quantities
  qtyPcr: number;
  qtyNylon: number;
  qty2Wheeler: number;
}