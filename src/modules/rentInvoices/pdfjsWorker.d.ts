// pdf.js ships its worker bundle without type declarations. Importing it
// only registers globalThis.pdfjsWorker (see PdfCanvasPreview).
declare module 'pdfjs-dist/build/pdf.worker.min.mjs'
