/**
 * Example: Using custom image renderers
 * 
 * This example demonstrates how to use the pluggable image rendering API
 * to support different environments (Node.js vs Browser) or custom image processing.
 */

import { generatePdf, createNodeImageRenderer, createBrowserImageRenderer } from '../src/index.js';
import fs from 'fs';

// ============================================================================
// Example 1: Using the default Node.js image renderer (automatic)
// ============================================================================
async function example1_defaultNodeRenderer() {
  const markdown = `
# Example with Images

![Local Image](./samples/logo.png)
![Remote Image](https://example.com/image.jpg)
  `;

  // When no renderImage is provided, it automatically uses createNodeImageRenderer
  const buffer = await generatePdf(markdown, {
    basePath: process.cwd(),
  });

  fs.writeFileSync('output/example1.pdf', buffer);
  console.log('Example 1: Generated PDF with default Node.js renderer');
}

// ============================================================================
// Example 2: Explicitly using Node.js image renderer
// ============================================================================
async function example2_explicitNodeRenderer() {
  const markdown = `
# Example with Images

![SVG Image](./samples/logo.svg)
  `;

  // Explicitly create and pass the Node.js image renderer
  const renderImage = createNodeImageRenderer(process.cwd());

  const buffer = await generatePdf(markdown, {
    basePath: process.cwd(),
    renderImage,
  });

  fs.writeFileSync('output/example2.pdf', buffer);
  console.log('Example 2: Generated PDF with explicit Node.js renderer');
}

// ============================================================================
// Example 3: Custom image renderer with caching
// ============================================================================
async function example3_customRendererWithCache() {
  const markdown = `
# Example with Cached Images

![Image 1](https://example.com/image1.jpg)
![Image 2](https://example.com/image2.jpg)
![Image 1 Again](https://example.com/image1.jpg)
  `;

  // Create a custom renderer with caching
  const cache = new Map<string, Buffer>();
  const baseRenderer = createNodeImageRenderer(process.cwd());

  const cachedRenderer = async (imageUrl: string): Promise<Buffer> => {
    if (cache.has(imageUrl)) {
      console.log(`Cache hit: ${imageUrl}`);
      return cache.get(imageUrl)!;
    }

    console.log(`Cache miss: ${imageUrl}`);
    const buffer = await baseRenderer(imageUrl);
    cache.set(imageUrl, buffer);
    return buffer;
  };

  const buffer = await generatePdf(markdown, {
    basePath: process.cwd(),
    renderImage: cachedRenderer,
  });

  fs.writeFileSync('output/example3.pdf', buffer);
  console.log('Example 3: Generated PDF with cached image renderer');
}

// ============================================================================
// Example 4: Custom image renderer with transformations
// ============================================================================
async function example4_customRendererWithTransform() {
  const markdown = `
# Example with Image Transformations

![Original Image](./samples/logo.png)
  `;

  const baseRenderer = createNodeImageRenderer(process.cwd());

  // Custom renderer that could apply transformations (placeholder example)
  const transformingRenderer = async (imageUrl: string): Promise<Buffer> => {
    const buffer = await baseRenderer(imageUrl);
    
    // Here you could use libraries like 'sharp' to transform the image
    // For example: resize, crop, apply filters, etc.
    // const transformed = await sharp(buffer).resize(800, 600).toBuffer();
    
    return buffer; // Return original for now
  };

  const buffer = await generatePdf(markdown, {
    basePath: process.cwd(),
    renderImage: transformingRenderer,
  });

  fs.writeFileSync('output/example4.pdf', buffer);
  console.log('Example 4: Generated PDF with transforming image renderer');
}

// ============================================================================
// Example 5: Browser environment (conceptual - would run in browser)
// ============================================================================
/*
// This would run in a browser environment
async function example5_browserRenderer() {
  const markdown = `
# Example in Browser

![Data URL Image](data:image/png;base64,iVBORw0KG...)
![Remote Image](https://example.com/image.jpg)
  `;

  // Use the browser image renderer
  const renderImage = createBrowserImageRenderer(true); // true = use Canvas API

  const buffer = await generatePdf(markdown, {
    renderImage,
  });

  // In browser, you might download the PDF or display it
  const blob = new Blob([buffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  window.open(url);
}
*/

// Run examples
async function main() {
  await example1_defaultNodeRenderer();
  await example2_explicitNodeRenderer();
  await example3_customRendererWithCache();
  await example4_customRendererWithTransform();
}

main().catch(console.error);

