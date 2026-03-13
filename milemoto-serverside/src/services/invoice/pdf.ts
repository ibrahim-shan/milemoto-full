import { getAdminInvoiceById } from './read.js';
import { getBrandingSettings, getStoreCurrencySettings } from '../siteSettings/read.js';

function escapePdfText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function textAt(text: string, x: number, y: number, size = 10, font: 'F1' | 'F2' = 'F1'): string {
  return `BT /${font} ${size} Tf ${x} ${y} Td (${escapePdfText(text)}) Tj ET`;
}

function rectFillGray(x: number, y: number, w: number, h: number, gray = 0.95): string {
  return `${gray.toFixed(3)} g ${x} ${y} ${w} ${h} re f 0 g`;
}

function rectFillColor(x: number, y: number, w: number, h: number, r: number, g: number, b: number): string {
  return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg ${x} ${y} ${w} ${h} re f 0 g`;
}

function line(x1: number, y1: number, x2: number, y2: number, gray = 0): string {
  return `${gray.toFixed(3)} G 1 w ${x1} ${y1} m ${x2} ${y2} l S 0 G`;
}

function extractCompanyName(copyrightText: string | null | undefined): string {
  const raw = (copyrightText || '').trim();
  if (!raw) return 'MileMoto';

  // Normalize common symbol noise from copied copyright strings.
  const normalized = raw
    .replace(/[©]/g, '')
    .replace(/[´`']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Remove leading/trailing year tokens and legal suffixes.
  const withoutYearPrefix = normalized.replace(/^\d{4}\s+/, '');
  const withoutYearSuffix = withoutYearPrefix.replace(/\s+\d{4}$/, '');
  const withoutAllRights = withoutYearSuffix.replace(/\.\s*all rights reserved\.?$/i, '');

  // Keep readable company characters only.
  const cleaned = withoutAllRights.replace(/[^a-zA-Z0-9&().,\- ]+/g, '').trim();
  return cleaned || 'MileMoto';
}

function buildPdfBuffer(pages: string[]): Buffer {
  const catalogId = 1;
  const pagesId = 2;
  const pageCount = pages.length;
  const firstPageId = 3;
  const firstContentId = firstPageId + pageCount;
  const fontRegularId = firstContentId + pageCount;
  const fontBoldId = fontRegularId + 1;
  const maxObjectId = fontBoldId;
  const objects = new Map<number, string>([[catalogId, `<< /Type /Catalog /Pages ${pagesId} 0 R >>`]]);

  const kids = Array.from({ length: pageCount }, (_, index) => `${firstPageId + index} 0 R`).join(' ');
  objects.set(pagesId, `<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>`);

  pages.forEach((content, index) => {
    const pageId = firstPageId + index;
    const contentId = firstContentId + index;
    const contentLength = Buffer.byteLength(content, 'utf8');

    objects.set(
      pageId,
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    objects.set(contentId, `<< /Length ${contentLength} >>\nstream\n${content}\nendstream`);
  });
  objects.set(fontRegularId, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  objects.set(fontBoldId, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

  let output = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (let id = 1; id <= maxObjectId; id += 1) {
    offsets[id] = Buffer.byteLength(output, 'utf8');
    output += `${id} 0 obj\n${objects.get(id)}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(output, 'utf8');
  output += `xref\n0 ${maxObjectId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= maxObjectId; id += 1) {
    output += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  }
  output += `trailer\n<< /Size ${maxObjectId + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(output, 'utf8');
}

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function wrapText(input: string, maxCharsPerLine: number): string[] {
  const text = input.trim();
  if (!text) return [''];

  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (word.length > maxCharsPerLine) {
      if (current) {
        lines.push(current);
        current = '';
      }
      for (let i = 0; i < word.length; i += maxCharsPerLine) {
        lines.push(word.slice(i, i + maxCharsPerLine));
      }
      continue;
    }

    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines.length > 0 ? lines : [''];
}

type RenderItemRow = {
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  lines: string[];
  rowHeight: number;
};

function splitRowsIntoPages(input: {
  rows: RenderItemRow[];
  noteLineCount: number;
}): RenderItemRow[][] {
  const { rows, noteLineCount } = input;
  
  // These MUST stay synced with the `tableY - 18` logic in the render loop below
  const firstPageStartY = 512; // (530 - 18)
  const nextPageStartY = 662;  // (680 - 18) Fixed to prevent header overlap
  
  const defaultMinY = 80;
  const lastPageMinY = 170 + Math.max(0, noteLineCount - 1) * 12;

  const pages: RenderItemRow[][] = [[]];
  let pageIndex = 0;
  let remaining = pageIndex === 0 ? firstPageStartY - defaultMinY : nextPageStartY - defaultMinY;

  for (const row of rows) {
    const currentPage = pages[pageIndex];
    if (!currentPage) break;
    if (row.rowHeight > remaining && currentPage.length > 0) {
      pages.push([]);
      pageIndex += 1;
      remaining = nextPageStartY - defaultMinY;
    }
    const targetPage = pages[pageIndex];
    if (!targetPage) break;
    targetPage.push(row);
    remaining -= row.rowHeight;
  }

  while (pages.length > 0) {
    const lastIndex = pages.length - 1;
    const isFirstAndOnly = pages.length === 1;
    const lastStartY = isFirstAndOnly ? firstPageStartY : nextPageStartY;
    const lastPage = pages[lastIndex];
    if (!lastPage) break;
    const used = lastPage.reduce((sum, row) => sum + row.rowHeight, 0);
    const rowYAfter = lastStartY - used;
    if (rowYAfter >= lastPageMinY || lastPage.length === 0) break;

    const moved = lastPage.pop();
    if (!moved) break;
    if (!pages[lastIndex + 1]) pages.push([]);
    const nextPage = pages[lastIndex + 1];
    if (!nextPage) break;
    nextPage.unshift(moved);
  }

  return pages;
}

export async function getAdminInvoicePdf(invoiceId: number): Promise<{
  filename: string;
  buffer: Buffer;
}> {
  const [invoice, branding, storeCurrency] = await Promise.all([
    getAdminInvoiceById(invoiceId),
    getBrandingSettings(),
    getStoreCurrencySettings(),
  ]);

  const issuedAt = new Date(invoice.issuedAt).toLocaleDateString();
  const dueAt = invoice.dueAt ? new Date(invoice.dueAt).toLocaleDateString() : '-';
  const paidAt = invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString() : '-';
  const companyName = extractCompanyName(storeCurrency.copyrightText);
  const hasConfiguredLogo = Boolean(branding.logoUrl);

  const marginX = 40;
  const contentWidth = 515; // 595 (A4 width) - 80 (margins)
  
  const allRows: RenderItemRow[] = invoice.items.map(item => {
    const itemText = `${item.productName}${item.variantName ? ` (${item.variantName})` : ''}${
      item.sku ? ` - ${item.sku}` : ''
    }`;
    const lines = wrapText(itemText, 54);
    return {
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
      lines,
      rowHeight: lines.length * 12 + 6,
    };
  });
  
  const wrappedNoteLines = invoice.note ? wrapText(invoice.note, 110) : [];
  const itemPages = splitRowsIntoPages({ rows: allRows, noteLineCount: wrappedNoteLines.length });
  const pageContents: string[] = [];

  itemPages.forEach((rows, pageIdx) => {
    const isFirstPage = pageIdx === 0;
    const isLastPage = pageIdx === itemPages.length - 1;
    const parts: string[] = [];

    // 1. Top Accent Bar
    parts.push(rectFillColor(0, 822, 595, 20, 0.12, 0.28, 0.49));

    // Company / branding header
    if (hasConfiguredLogo) {
      parts.push(rectFillGray(marginX, 764, 52, 36, 0.90));
      parts.push(textAt('LOGO', marginX + 10, 778, 8, 'F2'));
    }
    const companyTextX = hasConfiguredLogo ? marginX + 62 : marginX;
    parts.push(textAt(companyName, companyTextX, 792, 12, 'F2'));

    // 2. Header Section
    parts.push(textAt('INVOICE', marginX, 748, 28, 'F2'));
    parts.push(textAt(`# ${invoice.invoiceNumber}`, marginX, 730, 12, 'F1'));
    if (!isFirstPage) {
      parts.push(textAt(`Page ${pageIdx + 1} of ${itemPages.length}`, marginX, 712, 10, 'F1'));
      parts.push(textAt('Items Continued', marginX + 120, 712, 10, 'F2'));
    }

    const headerInfoX = 380;
    const headerValX = 460;
    parts.push(textAt('Order Number:', headerInfoX, 760, 10, 'F2'));
    parts.push(textAt(invoice.orderNumber, headerValX, 760, 10, 'F1'));
    parts.push(textAt('Date Issued:', headerInfoX, 745, 10, 'F2'));
    parts.push(textAt(issuedAt, headerValX, 745, 10, 'F1'));
    parts.push(textAt('Date Due:', headerInfoX, 730, 10, 'F2'));
    parts.push(textAt(dueAt, headerValX, 730, 10, 'F1'));

    let tableY = 530; // Starting Y for first page
    
    // 3. Billing details only on first page
    if (isFirstPage) {
      const billY = 670;
      parts.push(textAt('BILL TO', marginX, billY, 10, 'F2'));
      parts.push(line(marginX, billY - 8, marginX + 220, billY - 8, 0.8));
      parts.push(textAt(invoice.billingAddress.fullName, marginX, billY - 24, 10, 'F2'));
      let addressY = billY - 38;
      parts.push(textAt(invoice.billingAddress.addressLine1, marginX, addressY, 10));
      if (invoice.billingAddress.addressLine2) {
        addressY -= 14;
        parts.push(textAt(invoice.billingAddress.addressLine2, marginX, addressY, 10));
      }
      addressY -= 14;
      parts.push(textAt(invoice.billingAddress.phone, marginX, addressY, 10));
      if (invoice.billingAddress.email) {
        addressY -= 14;
        parts.push(textAt(invoice.billingAddress.email, marginX, addressY, 10));
      }

      const detailsX = 320;
      parts.push(textAt('INVOICE DETAILS', detailsX, billY, 10, 'F2'));
      parts.push(line(detailsX, billY - 8, detailsX + 235, billY - 8, 0.8));
      parts.push(textAt(`Customer: ${invoice.customerName}`, detailsX, billY - 24, 10));
      parts.push(textAt(`Phone: ${invoice.customerPhone}`, detailsX, billY - 38, 10));
      parts.push(textAt(`Status: ${invoice.status.replace(/_/g, ' ')}`, detailsX, billY - 52, 10));
      parts.push(textAt(`Paid At: ${paidAt}`, detailsX, billY - 66, 10));
    } else {
      // Lower table on subsequent pages to avoid header collision
      tableY = 680; 
    }

    // 4. Table Header
    const headerH = 20;
    parts.push(rectFillGray(marginX, tableY, contentWidth, headerH, 0.92));
    parts.push(textAt('Description', marginX + 8, tableY + 6, 10, 'F2'));
    parts.push(textAt('Qty', 350, tableY + 6, 10, 'F2'));
    parts.push(textAt('Unit Price', 410, tableY + 6, 10, 'F2'));
    parts.push(textAt('Total', 500, tableY + 6, 10, 'F2'));

    // 5. Render rows
    let rowY = tableY - 18;
    rows.forEach((row, index) => {
      // Clean zebra striping that resets every page
      if (index % 2 === 0) {
        parts.push(rectFillGray(marginX, rowY - row.rowHeight + 8, contentWidth, row.rowHeight, 0.97));
      }
      row.lines.forEach((lineText, lineIndex) => {
        parts.push(textAt(lineText, marginX + 8, rowY - lineIndex * 12, 9));
      });
      parts.push(textAt(String(row.quantity), 350, rowY, 9));
      parts.push(textAt(money(row.unitPrice, invoice.currency), 410, rowY, 9));
      parts.push(textAt(money(row.lineTotal, invoice.currency), 500, rowY, 9));
      rowY -= row.rowHeight;
    });

    parts.push(line(marginX, rowY + 6, marginX + contentWidth, rowY + 6, 0.8));

    if (!isLastPage) {
      parts.push(textAt('Continued on next page...', marginX, 54, 10, 'F2'));
      pageContents.push(parts.join('\n'));
      return;
    }

    // 6. Totals Section (last page only)
    const totalsTop = rowY - 20;
    const totalsLabelX = 410;
    const totalsValX = 500;

    parts.push(textAt('Subtotal', totalsLabelX, totalsTop, 10));
    parts.push(textAt(money(invoice.subtotal, invoice.currency), totalsValX, totalsTop, 10));
    parts.push(textAt('Discount', totalsLabelX, totalsTop - 18, 10));
    parts.push(textAt(money(invoice.discountTotal, invoice.currency), totalsValX, totalsTop - 18, 10));
    parts.push(textAt('Shipping', totalsLabelX, totalsTop - 36, 10));
    parts.push(textAt(money(invoice.shippingTotal, invoice.currency), totalsValX, totalsTop - 36, 10));
    parts.push(textAt('Tax', totalsLabelX, totalsTop - 54, 10));
    parts.push(textAt(money(invoice.taxTotal, invoice.currency), totalsValX, totalsTop - 54, 10));
    parts.push(line(totalsLabelX, totalsTop - 64, marginX + contentWidth, totalsTop - 64, 0.5));
    parts.push(textAt('GRAND TOTAL', totalsLabelX, totalsTop - 80, 11, 'F2'));
    parts.push(textAt(money(invoice.grandTotal, invoice.currency), totalsValX, totalsTop - 80, 11, 'F2'));

    // 7. Render notes
    if (invoice.note) {
      const noteY = Math.max(totalsTop - 80, 60 + (wrappedNoteLines.length * 12));
      parts.push(textAt('Notes:', marginX, noteY, 10, 'F2'));
      wrappedNoteLines.forEach((lineText, index) => {
        parts.push(textAt(lineText, marginX, noteY - 14 - index * 12, 9));
      });
    }

    pageContents.push(parts.join('\n'));
  });

  const filename = `${invoice.invoiceNumber}.pdf`;
  return {
    filename,
    buffer: buildPdfBuffer(pageContents),
  };
}
