import Canvas from 'canvas';
import { strict as assert } from 'assert';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Adapted from PDFKit's pdf2png utility
// Uses node-canvas (cairo) instead of @napi-rs/canvas to avoid image rendering bugs

class NodeCanvasFactory {
  create(width: number, height: number) {
    assert(width > 0 && height > 0, 'Invalid canvas size');
    const canvas = Canvas.createCanvas(width, height);
    const context = canvas.getContext('2d');
    return { canvas, context };
  }

  reset(canvasAndContext: { canvas: Canvas.Canvas }, width: number, height: number) {
    assert(canvasAndContext.canvas, 'Canvas is not specified');
    assert(width > 0 && height > 0, 'Invalid canvas size');
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }

  destroy(canvasAndContext: { canvas: Canvas.Canvas | null; context: Canvas.CanvasRenderingContext2D | null }) {
    assert(canvasAndContext.canvas, 'Canvas is not specified');
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

export async function pdf2png(
  data: Buffer | Uint8Array,
  { scale = 2.0 }: { scale?: number } = {},
): Promise<Buffer[]> {
  // pdfjs-dist requires Uint8Array, not Buffer
  const uint8 = data instanceof Buffer
    ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
    : data;

  // Resolve standard font data path for proper text rendering
  const standardFontDataUrl = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '../node_modules/pdfjs-dist/standard_fonts/',
  );

  const loadingTask = (pdfjsLib as any).getDocument({
    data: uint8,
    disableFontFace: true,
    standardFontDataUrl,
  });

  const pdfDocument = await loadingTask.promise;
  const pageCount = pdfDocument.numPages;
  const images: Buffer[] = [];

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdfDocument.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvasFactory = new NodeCanvasFactory();
    const canvasAndContext = canvasFactory.create(viewport.width, viewport.height);
    const renderContext = {
      canvasContext: canvasAndContext.context,
      viewport,
      canvasFactory,
    };
    await page.render(renderContext).promise;
    const image = canvasAndContext.canvas.toBuffer('image/png');
    images.push(image);
    canvasFactory.destroy(canvasAndContext);
  }

  return images;
}

