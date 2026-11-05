const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const html = fs.readFileSync(path.join(__dirname, '../thank-you/index.html'), 'utf8');
// Synthetic PNG: no player skin or private contributor data in the test fixture.
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZl0AAAAASUVORK5CYII=', 'base64');
let browser;
before(async () => { browser = await chromium.launch({headless:true, ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {}), args:['--no-sandbox']}); });
after(async () => { await browser?.close(); });
async function fixture(t, {players=['TestPlayer'], imageFails=false, apiFails=false, width=1280}={}) {
  const page = await browser.newPage({viewport:{width,height:720}});
  t.after(()=>page.close());
  const imageRequests=[];
  await page.route('https://vanos.test/**', route => {
    const isApi = new URL(route.request().url()).pathname === '/api/contribute/thanks';
    return route.fulfill(isApi ? {status:apiFails?503:200,contentType:'application/json',body:JSON.stringify({players})} : {contentType:'text/html',body:html});
  });
  await page.route('https://minotar.net/**', route => {
    imageRequests.push(route.request().url());
    return imageFails ? route.abort() : route.fulfill({contentType:'image/png',body:png});
  });
  await page.goto('https://vanos.test/thank-you/');
  return {page,imageRequests};
}
test('lazy head is attached and actually requested before it has loaded', async t=>{
  const {page,imageRequests}=await fixture(t);
  await page.waitForFunction(()=>{const i=document.querySelector('#wall img');return i?.complete && i.naturalWidth>0;});
  assert.deepEqual(imageRequests,['https://minotar.net/helm/TestPlayer/28.png']);
  assert.equal(await page.locator('#wall img').getAttribute('loading'),'lazy');
  assert.equal(await page.locator('#wall img').getAttribute('referrerpolicy'),'no-referrer');
  assert.equal(await page.locator('#wall li').innerText(),'TestPlayer');
  assert.equal(await page.locator('#count').innerText(),'1 player');
  const box=await page.locator('#wall img').boundingBox();
  assert.equal(box.width,28); assert.equal(box.height,28);
});
test('failed skin keeps the name and a same-size fallback without retry loops', async t=>{
  const {page,imageRequests}=await fixture(t,{imageFails:true});
  await page.locator('#wall .ph').waitFor();
  assert.equal(await page.locator('#wall li').innerText(),'TestPlayer');
  assert.equal(await page.locator('#wall img').count(),0);
  assert.equal(imageRequests.length,1);
  const box=await page.locator('#wall .ph').boundingBox();
  assert.equal(box.width,28); assert.equal(box.height,28);
});
test('mobile layout fits and invalid names cannot create markup or image requests', async t=>{
  const {page,imageRequests}=await fixture(t,{width:375,players:['TestPlayer','<img src=x>','../other','A'.repeat(17)]});
  await page.waitForFunction(()=>document.querySelector('#wall img')?.naturalWidth>0);
  assert.equal(await page.locator('#wall li').count(),1);
  assert.equal(imageRequests.length,1);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
});
test('empty opt-in list does not create player images',async t=>{
  const {page,imageRequests}=await fixture(t,{players:[]});
  await page.getByText('No names yet. Be the first!').waitFor();
  assert.equal(await page.locator('#wall li').count(),0);assert.equal(imageRequests.length,0);
});
test('list failure remains separate from skin-image failure',async t=>{
  const {page,imageRequests}=await fixture(t,{apiFails:true});
  await page.getByText('Could not load the list right now. Try again in a minute.').waitFor();
  assert.equal(imageRequests.length,0);
});
