const puppeteer = require('puppeteer');

/**
 * Renders a static HTML offer-letter template to a PDF buffer using headless Chromium.
 * @param {string} html
 * @returns {Promise<Buffer>}
 */
async function generateOfferLetterPdf(html) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

module.exports = { generateOfferLetterPdf };
