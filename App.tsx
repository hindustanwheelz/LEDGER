import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Download, Trash2, FileText, CreditCard, X, PlusCircle, Pencil, Upload, Save, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { LedgerEntry, Stats, InvoiceItem } from './types';
import { formatCurrency, formatDate, addDays, generateId, cn } from './utils';
import { Button } from './components/Button';
import { Modal } from './components/Modal';
import { StatsCards } from './components/StatsCards';

const STORAGE_KEY = 'wheelz_ledger_data_v1';

export default function App() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Filter State
  const [filterDate, setFilterDate] = useState<string>(''); // Format: 'YYYY-MM'

  // Modal Visibility
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  
  // Delete Confirmation State
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  
  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State - Invoice
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNum, setInvoiceNum] = useState('');
  const [invoiceStatus, setInvoiceStatus] = useState<'PENDING' | 'PAID'>('PENDING');
  const [newInvoiceItems, setNewInvoiceItems] = useState<Omit<InvoiceItem, 'id'>[]>([
    { size: '', pattern: '', quantity: 1, unitPrice: 0 }
  ]);

  // Form State - Transaction (Payment/CN)
  const [transactionType, setTransactionType] = useState<'PAYMENT' | 'CN'>('PAYMENT');
  const [transDate, setTransDate] = useState(new Date().toISOString().split('T')[0]);
  const [transAmount, setTransAmount] = useState<string>('');
  const [transNotes, setTransNotes] = useState('');

  // Load data from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setEntries(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load data", e);
      }
    }
  }, []);

  // Save data to local storage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  // --- Derived Data for Filters ---
  
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    entries.forEach(e => {
      if (e.date) {
        // Extract YYYY-MM
        months.add(e.date.substring(0, 7));
      }
    });
    return Array.from(months).sort().reverse();
  }, [entries]);

  const filteredEntries = useMemo(() => {
    // 1. Filter
    let data = filterDate 
      ? entries.filter(e => e.date.startsWith(filterDate))
      : [...entries]; // Clone for sorting if not filtering to avoid mutation

    // 2. Sort: Date Ascending -> Invoice Number Ascending
    return data.sort((a, b) => {
      // Primary: Date
      if (a.date !== b.date) {
        return a.date < b.date ? -1 : 1;
      }
      
      // Secondary: Invoice Number (Smart Numeric Sort)
      // This ensures "INV-2" comes before "INV-10" and newer invoices are "kept back" (later in list)
      const invA = a.invoiceNo || '';
      const invB = b.invoiceNo || '';
      return invA.localeCompare(invB, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [entries, filterDate]);

  // --- Statistics ---

  const stats: Stats = useMemo(() => {
    // 1. Stats based on the CURRENT VIEW (Filtered Month)
    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalCN = 0;
    
    // Category counters (Filtered View)
    let qtyPcr = 0;
    let qtyNylon = 0;
    let qty2Wheeler = 0;

    filteredEntries.forEach(e => {
      if (e.type === 'INVOICE') {
        // Only count original sales towards "Total Invoiced" and "Category Quantities"
        if (!e.originalRefId) {
          totalInvoiced += (e.invoiceAmount || 0);

          // Category Logic - Only process for original invoices
          const itemsToProcess = e.items && e.items.length > 0 
            ? e.items 
            : [{ size: e.size || '', pattern: e.pattern || '', quantity: e.quantity || 0, unitPrice: e.unitPrice || 0 }];

          itemsToProcess.forEach(item => {
            const size = (item.size || '').toUpperCase().trim();
            const qty = item.quantity || 0;

            if (size) {
              if (size.includes('R')) {
                qtyPcr += qty;
              } else if (size.includes('D')) {
                qtyNylon += qty;
              } else if (!/[A-Z]/.test(size)) {
                qty2Wheeler += qty;
              }
            }
          });
        }
      } else if (e.type === 'PAYMENT') {
        totalPaid += (e.paymentAmount || 0);
      } else if (e.type === 'CN') {
        totalCN += (e.cnAmount || 0);
      }
    });

    // 2. Outstanding Calculation:
    // This must be GLOBAL (All time), not filtered.
    // Logic: (Sum of All Original Invoices) - (Sum of All Payments) - (Sum of All CNs)
    let globalInvoiced = 0;
    let globalPaid = 0;
    let globalCN = 0;

    entries.forEach(e => {
       if (e.type === 'INVOICE') {
          // Only count original sales to avoid double counting balance invoices
          if (!e.originalRefId) {
             globalInvoiced += (e.invoiceAmount || 0);
          }
       } else if (e.type === 'PAYMENT') {
          globalPaid += (e.paymentAmount || 0);
       } else if (e.type === 'CN') {
          globalCN += (e.cnAmount || 0);
       }
    });

    const outstanding = globalInvoiced - globalPaid - globalCN;

    return {
      totalInvoiced,
      totalPaid,
      totalCN,
      outstanding, 
      qtyPcr,
      qtyNylon,
      qty2Wheeler
    };
  }, [filteredEntries, entries]);

  // ---- Handlers ----

  const openNewInvoice = () => {
    setEditingId(null);
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setInvoiceNum('');
    setInvoiceStatus('PENDING');
    setNewInvoiceItems([{ size: '', pattern: '', quantity: 1, unitPrice: 0 }]);
    setIsInvoiceModalOpen(true);
  };

  const openNewTransaction = (type: 'PAYMENT' | 'CN') => {
    setEditingId(null);
    setTransactionType(type);
    setTransDate(new Date().toISOString().split('T')[0]);
    setTransAmount('');
    setTransNotes('');
    setIsTransactionModalOpen(true);
  };

  const handleEdit = (entry: LedgerEntry) => {
    setEditingId(entry.id);
    
    if (entry.type === 'INVOICE') {
      setInvoiceDate(entry.date);
      setInvoiceNum(entry.invoiceNo);
      // Determine status safely.
      const currentStatus = (entry.status === 'PAID') ? 'PAID' : 'PENDING';
      setInvoiceStatus(currentStatus);
      
      if (entry.items && entry.items.length > 0) {
        setNewInvoiceItems(entry.items);
      } else {
        setNewInvoiceItems([{
          size: entry.size || '',
          pattern: entry.pattern || '',
          quantity: entry.quantity || 1,
          unitPrice: entry.unitPrice || 0
        }]);
      }
      setIsInvoiceModalOpen(true);
    } else {
      setTransactionType(entry.type === 'PAYMENT' ? 'PAYMENT' : 'CN');
      setTransDate(entry.date);
      setTransAmount(entry.type === 'PAYMENT' ? (entry.paymentAmount?.toString() || '') : (entry.cnAmount?.toString() || ''));
      setTransNotes(entry.notes || '');
      setIsTransactionModalOpen(true);
    }
  };

  const handleInvoiceItemChange = (index: number, field: keyof Omit<InvoiceItem, 'id'>, value: string | number) => {
    const updated = [...newInvoiceItems];
    updated[index] = { ...updated[index], [field]: value };
    setNewInvoiceItems(updated);
  };

  const handleAddInvoiceItem = () => {
    setNewInvoiceItems([...newInvoiceItems, { size: '', pattern: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveInvoiceItem = (index: number) => {
    if (newInvoiceItems.length > 1) {
      setNewInvoiceItems(newInvoiceItems.filter((_, i) => i !== index));
    }
  };

  const handleSubmitInvoice = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const finalItems: InvoiceItem[] = newInvoiceItems.map(item => ({
      ...item,
      id: generateId()
    }));

    const totalQuantity = finalItems.reduce((sum, item) => sum + Number(item.quantity), 0);
    const rawTotalAmount = finalItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);
    
    // FEATURE 1: Round Off Invoice Amount
    const totalAmount = Math.round(rawTotalAmount);

    const sizeStr = finalItems.map(i => i.size).join(', ');
    const patternStr = finalItems.map(i => i.pattern).join(', ');

    if (editingId) {
      setEntries(prev => prev.map(entry => {
        if (entry.id === editingId) {
          return {
            ...entry,
            date: invoiceDate,
            invoiceNo: invoiceNum,
            size: sizeStr,
            pattern: patternStr,
            quantity: totalQuantity,
            invoiceAmount: totalAmount,
            items: finalItems,
            dueDate: addDays(invoiceDate, 30),
            status: invoiceStatus, // Save manual status
          };
        }
        return entry;
      }));
    } else {
      const newInvoice: LedgerEntry = {
        id: generateId(),
        type: 'INVOICE',
        date: invoiceDate,
        invoiceNo: invoiceNum,
        size: sizeStr,
        pattern: patternStr,
        quantity: totalQuantity,
        unitPrice: 0,
        invoiceAmount: totalAmount,
        items: finalItems,
        dueDate: addDays(invoiceDate, 30),
        status: invoiceStatus // Use manual status (default PENDING)
      };
      setEntries(prev => [...prev, newInvoice]);
    }

    setIsInvoiceModalOpen(false);
    setEditingId(null);
  };

  const handleSubmitTransaction = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const amountVal = Number(transAmount);
    
    if (editingId) {
      setEntries(prev => prev.map(entry => {
        if (entry.id === editingId) {
          return {
            ...entry,
            date: transDate,
            paymentAmount: transactionType === 'PAYMENT' ? amountVal : undefined,
            cnAmount: transactionType === 'CN' ? amountVal : undefined,
            notes: transNotes
          };
        }
        return entry;
      }));
    } else {
      if (transactionType === 'PAYMENT') {
        const newPayment: LedgerEntry = {
          id: generateId(),
          type: 'PAYMENT',
          date: transDate,
          invoiceNo: '-', // Will be displayed as 'PAYMENT' in grid
          paymentAmount: amountVal,
          notes: transNotes
        };
        setEntries(prev => [...prev, newPayment]);
      } else {
        const cnEntry: LedgerEntry = {
          id: generateId(),
          type: 'CN',
          date: transDate,
          invoiceNo: 'CN-ADJ', // Will be displayed as 'CN' in grid
          cnAmount: amountVal,
          notes: transNotes
        };

        let remainingCN = amountVal;
        
        // Use a functional update logic for better immutability, though local mutation of clone is simpler here
        const updatedEntries = entries.map(e => ({...e})); // Deep copy of entries array (items are not deeply copied but we don't mutate items here)
        
        const pendingInvoices = updatedEntries
          .filter(entry => entry.type === 'INVOICE' && entry.status === 'PENDING')
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        if (pendingInvoices.length > 0 && remainingCN > 0) {
          const targetInvoice = pendingInvoices[0];
          // Find index in main array
          const invIndex = updatedEntries.findIndex(e => e.id === targetInvoice.id);
          const invAmount = targetInvoice.invoiceAmount || 0;

          if (Math.abs(remainingCN - invAmount) < 0.01) {
            updatedEntries[invIndex].status = 'PAID';
            updatedEntries[invIndex].notes = (updatedEntries[invIndex].notes || '') + ` [Settled by CN]`;
            remainingCN = 0;
          } else if (remainingCN < invAmount) {
            updatedEntries[invIndex].status = 'ADJUSTED';
            updatedEntries[invIndex].notes = (updatedEntries[invIndex].notes || '') + ` [Adj by CN ${formatCurrency(amountVal)}]`;

            const balanceAmount = invAmount - remainingCN;
            const newInvoiceNo = `${targetInvoice.invoiceNo}-BAL`;

            const balanceInvoice: LedgerEntry = {
              ...targetInvoice,
              id: generateId(),
              invoiceNo: newInvoiceNo,
              invoiceAmount: balanceAmount,
              quantity: 1, 
              unitPrice: balanceAmount,
              size: 'Balance Forward',
              pattern: '-',
              items: [],
              originalRefId: targetInvoice.id,
              status: 'PENDING',
              notes: `Balance after CN adjustment on ${targetInvoice.invoiceNo}`
            };
            
            updatedEntries.push(balanceInvoice);
            remainingCN = 0;
          } else {
            updatedEntries[invIndex].status = 'PAID';
            updatedEntries[invIndex].notes = (updatedEntries[invIndex].notes || '') + ` [Settled by CN]`;
            // Remaining CN would carry over to next invoice if we had a loop, but requirement said "adjusted on first pending invoice"
          }
        }

        updatedEntries.push(cnEntry);
        setEntries(updatedEntries);
      }
    }
    
    setIsTransactionModalOpen(false);
    setEditingId(null);
  };

  // --- ROBUST DELETE FUNCTIONALITY ---
  
  // 1. Initiate Delete (Opens Confirmation Modal)
  const initiateDelete = (id: string | null) => {
    if (id) {
      setItemToDelete(id);
    }
  };

  // 2. Confirm Delete (Executes Removal)
  const confirmDelete = () => {
    if (!itemToDelete) return;
    
    // Ensure we are comparing strings
    const idToRemove = String(itemToDelete);
    
    setEntries(currentEntries => currentEntries.filter(item => String(item.id) !== idToRemove));
    
    // Check if we need to close the editing modal
    if (editingId && String(editingId) === idToRemove) {
      setEditingId(null);
      setIsInvoiceModalOpen(false);
      setIsTransactionModalOpen(false);
    }

    setItemToDelete(null); // Close confirmation modal
  };

  // --- Export / Import Handlers ---

  const handleExportCSV = () => {
    // Export ALL entries, not just filtered ones, to ensure complete data backup
    const headers = ['DATE', 'INVOICE NO', 'SIZE', 'PATTERN', 'QUANTITY', 'UNIT PRICE', 'INVOICE AMOUNT', 'DUE DATE', 'STATUS', 'PAYMENT', 'CN'];
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + entries.map(e => {
        const itemSizes = e.items ? e.items.map(i => i.size).join('; ') : (e.size || '');
        const itemPatterns = e.items ? e.items.map(i => i.pattern).join('; ') : (e.pattern || '');
        const itemPrices = e.items ? e.items.map(i => i.unitPrice).join('; ') : (e.unitPrice || '');

        return [
          e.date,
          e.invoiceNo,
          `"${itemSizes}"`, 
          `"${itemPatterns}"`,
          e.quantity || '',
          `"${itemPrices}"`,
          e.invoiceAmount || '',
          e.dueDate || '',
          e.status || '',
          e.paymentAmount || '',
          e.cnAmount || ''
        ].join(",");
      }).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "ledger_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBackupJSON = () => {
    const dataStr = JSON.stringify(entries);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `ledger_backup_${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleRestoreJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (event.target.files && event.target.files.length > 0) {
      fileReader.readAsText(event.target.files[0], "UTF-8");
      fileReader.onload = e => {
        if (e.target && typeof e.target.result === "string") {
          try {
            const parsedData = JSON.parse(e.target.result);
            if (Array.isArray(parsedData)) {
              if(window.confirm("This will OVERWRITE all current data with the backup file. Are you sure?")) {
                setEntries(parsedData);
                alert("Data restored successfully!");
              }
            } else {
              alert("Invalid backup file format.");
            }
          } catch (error) {
            console.error(error);
            alert("Error parsing JSON file.");
          }
        }
      };
    }
  };

  // ---- Styles ----
  const invoiceInputClass = "block w-full rounded-md border-blue-200 bg-blue-50 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 text-sm";
  const invoiceHeaderInputClass = "mt-1 block w-full rounded-md border-blue-200 bg-blue-50 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2";
  
  const transactionInputClass = transactionType === 'PAYMENT'
      ? "mt-1 block w-full rounded-md border-green-200 bg-green-50 shadow-sm focus:border-green-500 focus:ring-green-500 border p-2"
      : "mt-1 block w-full rounded-md border-purple-200 bg-purple-50 shadow-sm focus:border-purple-500 focus:ring-purple-500 border p-2";

  // Helpers for display
  const renderSizes = (entry: LedgerEntry) => {
    if (entry.items && entry.items.length > 0) {
      return entry.items.map(i => i.size).join(', ');
    }
    return entry.size || '-';
  };

  const renderPatterns = (entry: LedgerEntry) => {
    if (entry.items && entry.items.length > 0) {
      return entry.items.map(i => i.pattern).join(', ');
    }
    return entry.pattern || '-';
  };

  const renderUnitPrices = (entry: LedgerEntry) => {
    if (entry.items && entry.items.length > 0) {
      return entry.items.map(i => formatCurrency(i.unitPrice)).join(', ');
    }
    return entry.unitPrice ? formatCurrency(entry.unitPrice) : '-';
  };

  const currentInvoiceTotal = newInvoiceItems.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unitPrice)), 0);

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">LEDGER</h1>
            <p className="text-sm text-gray-500 mt-1">Order & Payment Manager (hindustanwheelz.com)</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleBackupJSON} title="Download JSON Backup">
              <Save size={16} className="mr-2" /> Backup Data
            </Button>
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()} title="Restore from JSON">
              <Upload size={16} className="mr-2" /> Restore Data
            </Button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleRestoreJSON} 
              accept=".json" 
              className="hidden" 
            />
            <Button variant="secondary" onClick={handleExportCSV} title="Export to CSV">
              <Download size={16} className="mr-2" /> Export CSV
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Month Filter */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-center bg-blue-50 border border-blue-200 p-4 rounded-lg shadow-sm">
          <div className="flex items-center">
            <label className="text-base font-bold text-blue-800 mr-3">Filter by Month:</label>
          </div>
          <select 
            value={filterDate} 
            onChange={(e) => setFilterDate(e.target.value)}
            className="block w-full sm:w-64 pl-3 pr-10 py-2 text-base border-blue-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border bg-white shadow-sm font-medium text-gray-900"
          >
            <option value="">All Time</option>
            {availableMonths.map(month => (
              <option key={month} value={month}>
                {new Date(month + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
              </option>
            ))}
          </select>
        </div>

        <StatsCards stats={stats} />

        {/* Action Bar */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <Button onClick={openNewInvoice} className="flex-1 sm:flex-none">
            <Plus size={18} className="mr-2" /> New Order (Invoice)
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => openNewTransaction('PAYMENT')}
            className="flex-1 sm:flex-none"
          >
            <DollarSignIcon className="mr-2" size={18} /> Record Payment
          </Button>
          <Button 
            variant="outline" 
            onClick={() => openNewTransaction('CN')}
            className="flex-1 sm:flex-none border-purple-500 text-purple-600 hover:bg-purple-50"
          >
            <FileText size={18} className="mr-2" /> Record Credit Note (CN)
          </Button>
        </div>

        {/* Data Grid */}
        <div className="flex flex-col">
          <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
              <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg bg-white">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice No</th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Size</th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pattern</th>
                      <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                      <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                      <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider text-blue-700">Inv Amount</th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider text-red-600">Due Date</th>
                      <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider text-gray-600">Status</th>
                      <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider text-green-700">Payment</th>
                      <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider text-purple-700">CN</th>
                      <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredEntries.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="px-6 py-12 text-center text-gray-400">
                          {entries.length === 0 ? "No entries found. Start by adding an invoice." : "No entries found for this month."}
                        </td>
                      </tr>
                    ) : (
                      filteredEntries.map((entry) => (
                        <tr key={entry.id} className={cn(
                          "hover:bg-gray-50 transition-colors",
                          entry.status === 'ADJUSTED' && "bg-gray-50 opacity-60 line-through decoration-gray-400",
                          entry.status === 'PAID' && entry.type === 'INVOICE' && "bg-green-50/30"
                        )}>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(entry.date)}</td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {entry.type === 'PAYMENT' ? (
                              <span className="text-green-600 font-semibold text-xs">PAYMENT</span>
                            ) : entry.type === 'CN' ? (
                              <span className="text-purple-600 font-semibold text-xs">CN ADJ</span>
                            ) : (
                              <div className="flex items-center">
                                {entry.invoiceNo}
                                {entry.status === 'ADJUSTED' && <span className="ml-1 text-xs text-orange-500">(Adj)</span>}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-500 max-w-xs break-words">{renderSizes(entry)}</td>
                          <td className="px-3 py-4 text-sm text-gray-500 max-w-xs break-words">{renderPatterns(entry)}</td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{entry.quantity || '-'}</td>
                          <td className="px-3 py-4 text-sm text-gray-500 text-right max-w-[100px] truncate" title={entry.items?.map(i => formatCurrency(i.unitPrice)).join(', ')}>
                            {renderUnitPrices(entry)}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm font-semibold text-blue-700 text-right">{entry.invoiceAmount ? formatCurrency(entry.invoiceAmount) : '-'}</td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                            {entry.dueDate ? formatDate(entry.dueDate) : '-'}
                          </td>
                          {/* STATUS COLUMN */}
                          <td className="px-3 py-4 whitespace-nowrap text-center">
                            {entry.type === 'INVOICE' && entry.status === 'PAID' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                                  PAID
                                </span>
                            )}
                            {entry.type === 'INVOICE' && entry.status === 'PENDING' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-800 border border-red-100">
                                  Pending
                                </span>
                            )}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-green-700 font-semibold text-right">{entry.paymentAmount ? formatCurrency(entry.paymentAmount) : '-'}</td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-purple-700 font-semibold text-right">{entry.cnAmount ? formatCurrency(entry.cnAmount) : '-'}</td>
                          <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-center items-center space-x-2">
                              <button onClick={() => handleEdit(entry)} className="text-blue-500 hover:text-blue-700 flex items-center" title="Edit">
                                <Pencil size={16} />
                              </button>
                              <button 
                                type="button"
                                onClick={() => initiateDelete(entry.id)} 
                                className="text-red-400 hover:text-red-600 flex items-center" 
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {filteredEntries.length > 0 && (
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={6} className="px-3 py-3 text-right font-bold text-gray-900">
                          {filterDate ? 'Monthly Total' : 'Total Invoiced'} (Active Sales)
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-blue-800">{formatCurrency(stats.totalInvoiced)}</td>
                        <td></td>
                        <td></td>
                        <td className="px-3 py-3 text-right font-bold text-green-800">{formatCurrency(stats.totalPaid)}</td>
                        <td className="px-3 py-3 text-right font-bold text-purple-800">{formatCurrency(stats.totalCN)}</td>
                        <td></td>
                      </tr>
                      <tr>
                        <td colSpan={11} className="px-3 py-4 text-right">
                          <span className="text-lg font-bold text-gray-500 mr-2">Net Outstanding (Global Debt):</span>
                          <span className={cn(
                            "text-xl font-bold",
                            stats.outstanding > 0 ? "text-red-600" : "text-green-600"
                          )}>
                            {formatCurrency(stats.outstanding)}
                          </span>
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* --- Delete Confirmation Modal --- */}
      <Modal 
        isOpen={!!itemToDelete} 
        onClose={() => setItemToDelete(null)} 
        title="Confirm Deletion"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded p-4 flex items-start">
            <AlertTriangle className="text-red-600 mr-3 mt-0.5" size={24} />
            <div>
              <h4 className="text-red-800 font-bold">Warning</h4>
              <p className="text-red-700 text-sm mt-1">
                Are you sure you want to PERMANENTLY delete this record? This action cannot be undone.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
             <Button type="button" variant="secondary" onClick={() => setItemToDelete(null)}>
               Cancel
             </Button>
             <Button type="button" variant="danger" onClick={confirmDelete}>
               Yes, Delete It
             </Button>
          </div>
        </div>
      </Modal>

      {/* Invoice Modal */}
      <Modal isOpen={isInvoiceModalOpen} onClose={() => setIsInvoiceModalOpen(false)} title={editingId ? "Edit Order" : "New Order (Invoice)"}>
        <div className="space-y-4">
          <form id="invoice-form" onSubmit={handleSubmitInvoice} className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-3 rounded border border-blue-100 bg-white">
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input 
                  type="date" 
                  required 
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className={invoiceHeaderInputClass} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Invoice No</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. INV-2023-001" 
                  value={invoiceNum}
                  onChange={(e) => setInvoiceNum(e.target.value)}
                  className={invoiceHeaderInputClass} 
                />
              </div>
            </div>

            {/* STATUS FIELD for Manual Payment Tracking */}
            <div className="bg-blue-50 p-3 rounded border border-blue-200">
               <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Status</label>
               <select 
                 value={invoiceStatus}
                 onChange={(e) => setInvoiceStatus(e.target.value as 'PENDING' | 'PAID')}
                 className={invoiceHeaderInputClass}
               >
                 <option value="PENDING">Pending (Not Paid)</option>
                 <option value="PAID">PAID (Settled)</option>
               </select>
               <p className="text-xs text-gray-500 mt-1">Mark as "PAID" if you have received full payment for this specific invoice.</p>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-gray-700">Items</label>
                <span className="text-xs text-gray-500">Multiple sizes allowed</span>
              </div>
              
              {newInvoiceItems.map((item, index) => (
                <div key={index} className="flex gap-2 items-start p-2 bg-blue-50/50 rounded border border-blue-100 relative group">
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <div className="flex-[2]">
                          <input 
                            type="text" 
                            placeholder="Size (e.g. 195/55-R16)" 
                            className={invoiceInputClass}
                            value={item.size}
                            required
                            onChange={(e) => handleInvoiceItemChange(index, 'size', e.target.value)}
                          />
                      </div>
                      <div className="flex-[2]">
                          <input 
                            type="text" 
                            placeholder="Pattern" 
                            className={invoiceInputClass}
                            value={item.pattern}
                            onChange={(e) => handleInvoiceItemChange(index, 'pattern', e.target.value)}
                          />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                          <input 
                            type="number" 
                            placeholder="Qty" 
                            min="1"
                            required
                            className={invoiceInputClass}
                            value={item.quantity}
                            onChange={(e) => handleInvoiceItemChange(index, 'quantity', Number(e.target.value))}
                          />
                      </div>
                      <div className="flex-1">
                          <input 
                            type="number" 
                            placeholder="Price" 
                            step="0.01"
                            required
                            className={invoiceInputClass}
                            value={item.unitPrice}
                            onChange={(e) => handleInvoiceItemChange(index, 'unitPrice', Number(e.target.value))}
                          />
                      </div>
                      <div className="flex-1 flex items-center px-2 text-sm font-bold text-blue-700">
                          {formatCurrency(Number(item.quantity) * Number(item.unitPrice))}
                      </div>
                    </div>
                  </div>
                  
                  {newInvoiceItems.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => handleRemoveInvoiceItem(index)}
                      className="text-red-400 hover:text-red-600 p-1 mt-1"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddInvoiceItem}
                className="flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                <PlusCircle size={16} className="mr-1" /> Add Another Size
              </button>
            </div>

            <div className="bg-gray-100 p-3 rounded flex justify-between items-center border border-gray-200">
              <span className="font-medium text-gray-700">Total Invoice Amount (Rounded):</span>
              <span className="text-xl font-bold text-blue-800">{formatCurrency(Math.round(currentInvoiceTotal))}</span>
            </div>

            <div className="bg-blue-50 p-2 rounded text-xs text-blue-800">
              Due date: +30 days from Invoice Date.
            </div>
          </form>

          {/* Action Footer - OUTSIDE FORM to prevent conflicts */}
          <div className="flex justify-between items-center pt-2 border-t border-gray-100 mt-4">
            {editingId ? (
              <button 
                type="button" 
                onClick={() => initiateDelete(editingId)}
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors border-none"
              >
                <Trash2 size={16} className="mr-2" /> Delete
              </button>
            ) : <div></div>}
            
            <div className="flex">
              <Button type="button" variant="secondary" onClick={() => setIsInvoiceModalOpen(false)} className="mr-2">Cancel</Button>
              <Button type="submit" form="invoice-form">{editingId ? 'Update Invoice' : 'Save Invoice'}</Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Transaction Modal (Payment or CN) */}
      <Modal 
        isOpen={isTransactionModalOpen} 
        onClose={() => setIsTransactionModalOpen(false)} 
        title={
          editingId 
            ? `Edit ${transactionType === 'PAYMENT' ? 'Payment' : 'Credit Note'}`
            : `Record ${transactionType === 'PAYMENT' ? 'Payment' : 'Credit Note (CN)'}`
        }
      >
        <div className="space-y-4">
          <form id="transaction-form" onSubmit={handleSubmitTransaction} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input 
                type="date" 
                required 
                value={transDate}
                onChange={(e) => setTransDate(e.target.value)}
                className={transactionInputClass} 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Amount</label>
              <input 
                type="number" 
                required 
                step="0.01" 
                min="0.01" 
                value={transAmount}
                onChange={(e) => setTransAmount(e.target.value)}
                className={transactionInputClass} 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Notes / Reference</label>
              <textarea 
                rows={2} 
                className={transactionInputClass} 
                placeholder="Cheque No, Bank Ref, etc."
                value={transNotes}
                onChange={(e) => setTransNotes(e.target.value)}
              ></textarea>
            </div>

            {transactionType === 'CN' && !editingId && (
              <div className="bg-purple-50 p-3 rounded text-sm text-purple-800 border border-purple-200">
                <strong className="block mb-1">Auto-Adjustment Logic:</strong>
                This CN will be applied to the <strong>first pending invoice</strong>. If the CN amount is less than the invoice, a new Invoice with the remaining balance (e.g. INV-001-BAL) will be automatically created.
              </div>
            )}
          </form>

          {/* Action Footer - OUTSIDE FORM */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-100 mt-4">
            {editingId ? (
              <button 
                type="button" 
                onClick={() => initiateDelete(editingId)}
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors border-none"
              >
                <Trash2 size={16} className="mr-2" /> Delete
              </button>
            ) : <div></div>}

            <div className="flex">
              <Button type="button" variant="secondary" onClick={() => setIsTransactionModalOpen(false)} className="mr-2">Cancel</Button>
              <Button type="submit" variant={transactionType === 'CN' ? 'outline' : 'primary'} form="transaction-form">
                {editingId ? 'Update Transaction' : (transactionType === 'PAYMENT' ? 'Save Payment' : 'Apply Credit Note')}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Helper icon component
function DollarSignIcon({ size, className }: { size?: number, className?: string }) {
    return <CreditCard size={size} className={className} />;
}