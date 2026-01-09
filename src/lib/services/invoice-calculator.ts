/**
 * Invoice Calculation Engine
 * 
 * Provides comprehensive invoice calculation services including:
 * - Line item total calculations
 * - Invoice subtotal computation
 * - Tax calculations
 * - Final invoice total computation
 * - Real-time calculation updates
 * 
 * All calculations maintain precision for financial accuracy using proper rounding.
 */

export interface InvoiceLineItemCalculation {
  quantity: number;
  unit_price: number;
  total: number;
}

export interface InvoiceCalculationResult {
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  line_items: InvoiceLineItemCalculation[];
}

export interface InvoiceCalculationInput {
  line_items: Array<{
    quantity: number;
    unit_price: number;
  }>;
  tax_rate?: number; // Tax rate as decimal (0.1 = 10%)
}

/**
 * Invoice Calculator Service
 * 
 * Handles all invoice-related calculations with precision and accuracy.
 * Uses proper rounding to avoid floating-point precision issues.
 */
export class InvoiceCalculatorService {
  /**
   * Calculates the total for a single line item
   * @param quantity - Item quantity
   * @param unitPrice - Price per unit
   * @returns Calculated total with proper rounding
   */
  static calculateLineItemTotal(quantity: number, unitPrice: number): number {
    if (quantity < 0 || unitPrice < 0) {
      throw new Error('Quantity and unit price must be non-negative');
    }
    
    // Use proper rounding to avoid floating-point precision issues
    return Math.round((quantity * unitPrice) * 100) / 100;
  }

  /**
   * Calculates the subtotal from an array of line items
   * @param lineItems - Array of line items with quantity and unit_price
   * @returns Calculated subtotal with proper rounding
   */
  static calculateInvoiceSubtotal(lineItems: Array<{ quantity: number; unit_price: number }>): number {
    if (!lineItems || lineItems.length === 0) {
      return 0;
    }

    const subtotal = lineItems.reduce((sum, item) => {
      return sum + this.calculateLineItemTotal(item.quantity, item.unit_price);
    }, 0);

    return Math.round(subtotal * 100) / 100;
  }

  /**
   * Calculates tax amount based on subtotal and tax rate
   * @param subtotal - Invoice subtotal
   * @param taxRate - Tax rate as decimal (0.1 = 10%)
   * @returns Calculated tax amount with proper rounding
   */
  static calculateTaxAmount(subtotal: number, taxRate: number): number {
    if (subtotal < 0) {
      throw new Error('Subtotal must be non-negative');
    }
    
    if (taxRate < 0 || taxRate > 1) {
      throw new Error('Tax rate must be between 0 and 1');
    }

    return Math.round((subtotal * taxRate) * 100) / 100;
  }

  /**
   * Calculates the final invoice total
   * @param subtotal - Invoice subtotal
   * @param taxAmount - Tax amount
   * @returns Final invoice total with proper rounding
   */
  static calculateInvoiceTotal(subtotal: number, taxAmount: number): number {
    if (subtotal < 0 || taxAmount < 0) {
      throw new Error('Subtotal and tax amount must be non-negative');
    }

    return Math.round((subtotal + taxAmount) * 100) / 100;
  }

  /**
   * Performs complete invoice calculation including all line items and totals
   * @param input - Invoice calculation input with line items and optional tax rate
   * @returns Complete calculation result with all totals and line item details
   */
  static calculateInvoiceTotals(input: InvoiceCalculationInput): InvoiceCalculationResult {
    const { line_items, tax_rate = 0 } = input;

    if (!line_items || line_items.length === 0) {
      return {
        subtotal: 0,
        tax_amount: 0,
        total_amount: 0,
        line_items: [],
      };
    }

    // Calculate line item totals
    const calculatedLineItems: InvoiceLineItemCalculation[] = line_items.map(item => ({
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: this.calculateLineItemTotal(item.quantity, item.unit_price),
    }));

    // Calculate invoice totals
    const subtotal = this.calculateInvoiceSubtotal(line_items);
    const taxAmount = this.calculateTaxAmount(subtotal, tax_rate);
    const totalAmount = this.calculateInvoiceTotal(subtotal, taxAmount);

    return {
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      line_items: calculatedLineItems,
    };
  }

  /**
   * Recalculates invoice totals when line items change (for real-time updates)
   * @param currentLineItems - Current line items
   * @param updatedLineItems - Updated line items
   * @param taxRate - Tax rate as decimal
   * @returns New calculation result if totals changed, null if no change
   */
  static recalculateIfChanged(
    currentLineItems: Array<{ quantity: number; unit_price: number }>,
    updatedLineItems: Array<{ quantity: number; unit_price: number }>,
    taxRate = 0
  ): InvoiceCalculationResult | null {
    // Calculate current totals
    const currentTotals = this.calculateInvoiceTotals({
      line_items: currentLineItems,
      tax_rate: taxRate,
    });

    // Calculate new totals
    const newTotals = this.calculateInvoiceTotals({
      line_items: updatedLineItems,
      tax_rate: taxRate,
    });

    // Check if totals changed
    if (
      currentTotals.subtotal === newTotals.subtotal &&
      currentTotals.tax_amount === newTotals.tax_amount &&
      currentTotals.total_amount === newTotals.total_amount
    ) {
      return null; // No change
    }

    return newTotals;
  }

  /**
   * Validates line item data for calculation
   * @param lineItems - Line items to validate
   * @returns Array of validation errors, empty if valid
   */
  static validateLineItems(lineItems: Array<{ quantity: number; unit_price: number }>): string[] {
    const errors: string[] = [];

    if (!lineItems || lineItems.length === 0) {
      errors.push('At least one line item is required');
      return errors;
    }

    lineItems.forEach((item, index) => {
      if (typeof item.quantity !== 'number' || item.quantity <= 0) {
        errors.push(`Line item ${index + 1}: Quantity must be a positive number`);
      }

      if (typeof item.unit_price !== 'number' || item.unit_price < 0) {
        errors.push(`Line item ${index + 1}: Unit price must be a non-negative number`);
      }

      // Check for reasonable limits to prevent overflow
      if (item.quantity > 999999) {
        errors.push(`Line item ${index + 1}: Quantity is too large`);
      }

      if (item.unit_price > 999999.99) {
        errors.push(`Line item ${index + 1}: Unit price is too large`);
      }
    });

    return errors;
  }

  /**
   * Calculates the remaining balance for an invoice after payments
   * @param totalAmount - Invoice total amount
   * @param paidAmount - Total amount paid
   * @returns Remaining balance
   */
  static calculateRemainingBalance(totalAmount: number, paidAmount: number): number {
    if (totalAmount < 0 || paidAmount < 0) {
      throw new Error('Total amount and paid amount must be non-negative');
    }

    const balance = totalAmount - paidAmount;
    return Math.round(balance * 100) / 100;
  }

  /**
   * Determines if an invoice is fully paid
   * @param totalAmount - Invoice total amount
   * @param paidAmount - Total amount paid
   * @returns True if invoice is fully paid
   */
  static isFullyPaid(totalAmount: number, paidAmount: number): boolean {
    const balance = this.calculateRemainingBalance(totalAmount, paidAmount);
    return balance <= 0;
  }

  /**
   * Calculates payment percentage
   * @param totalAmount - Invoice total amount
   * @param paidAmount - Total amount paid
   * @returns Payment percentage (0-100)
   */
  static calculatePaymentPercentage(totalAmount: number, paidAmount: number): number {
    if (totalAmount <= 0) {
      return 0;
    }

    const percentage = (paidAmount / totalAmount) * 100;
    return Math.min(100, Math.round(percentage * 100) / 100);
  }
}

// Export the service as default
export default InvoiceCalculatorService;