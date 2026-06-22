const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Log all console messages
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  
  try {
    await page.goto('http://localhost:5173');
    
    // Wait for react flow to render nodes
    await page.waitForSelector('.react-flow__node', { timeout: 10000 });
    console.log("Nodes rendered.");
    
    // Find the Checkout Service node by its text content
    const checkoutNode = await page.locator('.react-flow__node', { hasText: 'Checkout Service' }).first();
    await checkoutNode.click();
    console.log("Clicked Checkout Service node.");
    
    // Wait for NodeDetailPanel to appear
    await page.waitForSelector('.node-detail-panel', { timeout: 5000 });
    console.log("Panel opened.");
    
    // Click on Integration tab
    await page.locator('text=Integration').click();
    
    // Take a screenshot of the panel
    await page.locator('.node-detail-panel').screenshot({ path: 'panel.png' });
    console.log("Screenshot saved to panel.png");
    
  } catch (err) {
    console.error("Playwright Error:", err);
  } finally {
    await browser.close();
  }
})();
