const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
let browser;
before(async()=>{browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),args:['--no-sandbox']});});
after(async()=>{await browser?.close();});
const alt='Synthetic " data-gallery-injected="yes';
const title='A "quoted" build & <garden>';
const valid={src:'/gallery/media/img/42.webp',mode:'Survival',title,alt,credit:'',added:'2026-11-22'};
const invalid=['/gallery/media/img/42.webp" data-gallery-injected="yes','/gallery/media/img/../42.webp','/gallery/media/img/42.png','/gallery/media/img/.staged-1-42.webp'];
async function fixture(t,route,width=1280){
 const page=await browser.newPage({viewport:{width,height:1400}});t.after(()=>page.close());
 const html=fs.readFileSync(path.join(__dirname,route==='/'?'../index.html':'../gallery/index.html'),'utf8');
 await page.route('https://vanos.test/**',r=>{
  const p=new URL(r.request().url()).pathname;
  if(p==='/gallery/media/gallery.json')return r.fulfill({contentType:'application/json',body:JSON.stringify({items:[valid,...invalid.map(src=>({...valid,src}))]})});
  if(p.startsWith('/gallery/media/img/'))return r.fulfill({contentType:'image/webp',body:Buffer.alloc(0)});
  return r.fulfill({contentType:'text/html',body:html});
 });
 await page.goto('https://vanos.test'+route);
 const selector=route==='/'?'#gpreview img':'.gcard img';await page.locator(selector).first().waitFor({state:'attached'});
 return {page,selector};
}
for(const route of ['/','/gallery/'])test('quoted metadata stays literal and media paths are strict: '+route,async t=>{
 const {page,selector}=await fixture(t,route);
 assert.equal(await page.locator(selector).count(),1);
 assert.equal(await page.locator(selector).getAttribute('alt'),alt);
 assert.equal(await page.locator('[data-gallery-injected]').count(),0);
 assert.equal(await page.locator('svg').count(),0);
 if(route==='/gallery/')assert.equal(await page.locator('.cap h3').innerText(),title);
});
test('quoted gallery card stays within narrow viewport',async t=>{
 const {page,selector}=await fixture(t,'/gallery/',390);
 assert.equal(await page.locator(selector).count(),1);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.equal(await page.locator('.cap h3').innerText(),title);
});
