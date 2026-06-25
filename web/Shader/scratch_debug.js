const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
    
    await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded', timeout: 10000 });
    
    await new Promise(r => setTimeout(r, 4000));
    console.log('Finished capturing logs');
    await browser.close();
  } catch (e) {
    console.error('SCRIPT ERROR:', e);
  }
})();
