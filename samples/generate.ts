import { generatePdf } from '../src/index.js';
import path from 'path';
import fs from 'fs';

async function main() {
  const outputPdf = path.join(__dirname, '..', 'output');
  for (const file of fs.readdirSync(__dirname)) {
    const pdfFile = file.replace(/\.md$/i, '.pdf');
    if (pdfFile === file)  continue;
      const inputPath = path.join(__dirname, file);
      const outputPath = path.join(outputPdf, pdfFile);
      console.log(`Generating PDF from ${pdfFile} ...`);
      await generatePdf(inputPath, outputPath);
      console.log(`PDF generated: ${outputPdf}`);
    }
 }
  

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});

