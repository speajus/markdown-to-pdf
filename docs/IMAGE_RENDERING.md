# Pluggable Image Rendering

The markdown-to-pdf library supports pluggable image rendering, allowing you to customize how images are loaded and processed. This enables the library to work in different environments (Node.js, browser) and supports custom image processing workflows.

## Overview

The `PdfOptions` interface includes an optional `renderImage` function:

```typescript
interface PdfOptions {
  theme?: ThemeConfig;
  pageLayout?: PageLayout;
  basePath?: string;
  renderImage?: (imageUrl: string) => Promise<Buffer>;
}
```

The `renderImage` function takes an image URL or path and returns a `Buffer` containing the processed image data (typically PNG or JPEG format).

## Built-in Image Renderers

### Node.js Image Renderer

The default renderer for Node.js environments. It supports:
- Local file system images
- Remote images (HTTP/HTTPS)
- Automatic SVG to PNG conversion using `@resvg/resvg-js`

**Usage:**

```typescript
import { generatePdf, createNodeImageRenderer } from '@speajus/markdown-to-pdf';

const markdown = '![Logo](./logo.svg)';

// Option 1: Automatic (default when no renderImage is provided)
const buffer1 = await generatePdf(markdown, {
  basePath: '/path/to/markdown/directory',
});

// Option 2: Explicit
const renderImage = createNodeImageRenderer('/path/to/markdown/directory');
const buffer2 = await generatePdf(markdown, {
  basePath: '/path/to/markdown/directory',
  renderImage,
});
```

### Browser Image Renderer

A renderer for browser environments using Canvas API and Fetch API.

**Features:**
- Loads remote images via `fetch()`
- Supports data URLs and blob URLs
- Automatically converts images to PNG via Canvas rendering
- Handles SVG images (rendered via Canvas)

**Usage:**

```typescript
import { generatePdf, createBrowserImageRenderer } from '@speajus/markdown-to-pdf';

const markdown = '![Logo](https://example.com/logo.png)';

const renderImage = createBrowserImageRenderer(true); // true = use Canvas API

const buffer = await generatePdf(markdown, {
  renderImage,
});

// Download the PDF in browser
const blob = new Blob([buffer], { type: 'application/pdf' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'document.pdf';
a.click();
```

## Custom Image Renderers

You can create custom image renderers for specialized use cases:

### Example 1: Image Caching

```typescript
import { generatePdf, createNodeImageRenderer } from '@speajus/markdown-to-pdf';

const cache = new Map<string, Buffer>();
const baseRenderer = createNodeImageRenderer(process.cwd());

const cachedRenderer = async (imageUrl: string): Promise<Buffer> => {
  if (cache.has(imageUrl)) {
    return cache.get(imageUrl)!;
  }
  const buffer = await baseRenderer(imageUrl);
  cache.set(imageUrl, buffer);
  return buffer;
};

const buffer = await generatePdf(markdown, {
  renderImage: cachedRenderer,
});
```

### Example 2: Image Transformations

```typescript
import { generatePdf, createNodeImageRenderer } from '@speajus/markdown-to-pdf';
import sharp from 'sharp';

const baseRenderer = createNodeImageRenderer(process.cwd());

const transformingRenderer = async (imageUrl: string): Promise<Buffer> => {
  const buffer = await baseRenderer(imageUrl);
  
  // Resize all images to max 800x600
  const transformed = await sharp(buffer)
    .resize(800, 600, { fit: 'inside' })
    .toBuffer();
  
  return transformed;
};

const buffer = await generatePdf(markdown, {
  renderImage: transformingRenderer,
});
```

### Example 3: Custom Image Sources

```typescript
import { generatePdf } from '@speajus/markdown-to-pdf';

// Load images from a database or API
const customRenderer = async (imageUrl: string): Promise<Buffer> => {
  if (imageUrl.startsWith('db://')) {
    const imageId = imageUrl.replace('db://', '');
    return await loadImageFromDatabase(imageId);
  }
  
  if (imageUrl.startsWith('api://')) {
    const imagePath = imageUrl.replace('api://', '');
    return await fetchImageFromAPI(imagePath);
  }
  
  throw new Error(`Unsupported image URL: ${imageUrl}`);
};

const markdown = '![User Avatar](db://user-123-avatar)';
const buffer = await generatePdf(markdown, {
  renderImage: customRenderer,
});
```

## Error Handling

If the `renderImage` function throws an error, the PDF renderer will display a placeholder text instead of the image:

```
[Image: alt text]
```

This ensures that PDF generation continues even if some images fail to load.

## Performance Considerations

- **Caching**: For documents with repeated images, implement caching to avoid redundant fetches/processing
- **Parallel Loading**: The renderer processes images sequentially. For better performance with many images, consider pre-loading and caching
- **Image Size**: Large images increase PDF file size. Consider resizing images before embedding

## See Also

- [examples/custom-image-renderer.ts](../examples/custom-image-renderer.ts) - Complete examples
- [src/node-image-renderer.ts](../src/node-image-renderer.ts) - Node.js implementation
- [src/browser-image-renderer.ts](../src/browser-image-renderer.ts) - Browser implementation

