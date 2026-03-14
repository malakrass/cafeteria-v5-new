/**
 * QR Print Kit Utility
 * Generates a printable HTML layout for table QR codes.
 */

export interface TableQRData {
  tableNumber: number;
  qrToken: string;
  baseUrl: string;
}

export function generateQRPrintLayout(tables: TableQRData[]): string {
  const tablesPerPage = 6;
  const pages = [];

  for (let i = 0; i < tables.length; i += tablesPerPage) {
    const pageTables = tables.slice(i, i + tablesPerPage);
    pages.push(pageTables);
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Table QR Print Kit</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f0f0f0;
        }
        .page {
            width: 210mm;
            height: 297mm;
            padding: 10mm;
            margin: 10mm auto;
            background: white;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-template-rows: 1fr 1fr 1fr;
            gap: 10mm;
            box-sizing: border-box;
            page-break-after: always;
        }
        .qr-card {
            border: 2px dashed #ccc;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 10mm;
            text-align: center;
        }
        .table-number {
            font-size: 24pt;
            font-weight: bold;
            margin-bottom: 5mm;
            color: #333;
        }
        .qr-code {
            width: 120mm;
            height: 120mm;
            max-width: 150px;
            max-height: 150px;
            margin-bottom: 5mm;
        }
        .instructions {
            font-size: 14pt;
            color: #666;
            margin-top: 5mm;
        }
        .scan-text {
            font-weight: bold;
            color: #000;
            font-size: 18pt;
            margin-bottom: 2mm;
        }
        @media print {
            body { background: none; margin: 0; }
            .page { margin: 0; box-shadow: none; }
        }
    </style>
</head>
<body>
    ${pages.map(page => `
        <div class="page">
            ${page.map(table => `
                <div class="qr-card">
                    <div class="table-number">TABLE ${table.tableNumber}</div>
                    <img class="qr-code" src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${table.baseUrl}/menu/${table.qrToken}`)}" alt="QR Code">
                    <div class="scan-text">Scan to Order</div>
                    <div class="instructions">Point your camera to the QR code to view our menu and place your order.</div>
                </div>
            `).join('')}
        </div>
    `).join('')}
</body>
</html>
  `;

  return html;
}
