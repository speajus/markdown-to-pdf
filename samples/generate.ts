import { generatePdf } from '../src/index.js';
import path from 'path';

async function main() {
  const sampleMd = path.join(__dirname, 'sample.md');
  const outputPdf = path.join(__dirname, '..', 'output', 'sample.pdf');

  console.log('Generating PDF from sample.md...');
  await generatePdf(sampleMd, outputPdf);
  console.log(`PDF generated: ${outputPdf}`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});

