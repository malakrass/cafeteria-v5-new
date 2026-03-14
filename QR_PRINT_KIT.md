# Table QR Print Kit Report

## Overview
A professional, printable QR pack generator has been implemented to facilitate the physical setup of the cafeteria.

## Features
- **Printable Layout**: Generates an A4-optimized HTML layout with 6 table cards per page.
- **Table Cards**: Each card includes the Table Number, a high-quality QR code, and clear "Scan to Order" instructions.
- **Dynamic Generation**: Automatically pulls all tables for the cafeteria and generates their unique QR tokens.
- **Browser-Based Printing**: Uses the browser's native print functionality to ensure high-quality output and PDF export.

## Implementation Details
- **Utility**: `qrPrintKit.ts` in `server/utils/`
- **Endpoint**: `tablesRouter.generatePrintableQRPack`
- **UI Component**: Integrated into the `LaunchToolkitManager` in the Owner Dashboard.

## How to Use
1. Navigate to the **Owner Dashboard**.
2. Select the **Launch Toolkit** tab.
3. Click **Generate Printable Pack**.
4. A new window will open with the printable layout; use `Ctrl+P` (or `Cmd+P`) to print or save as PDF.
