const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Go to the production deployed app
  await page.goto('https://stock-observability-ui.vercel.app/');
  
  // Wait for the Checkout Service node to appear and click it
  await page.waitForSelector('.react-flow__node');
  const checkoutNode = await page.locator('.react-flow__node', { hasText: 'Checkout Service' }).first();
  await checkoutNode.click();
  
  // Wait for the Node Detail Panel to open
  await page.waitForSelector('.panel-container');
  
  // Extract text content of the panel
  const panelText = await page.locator('.panel-container').innerText();
  console.log("PANEL TEXT:", panelText);

  await browser.close();
})();
