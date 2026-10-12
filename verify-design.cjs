// Dependency-free preservation and contact-form regression checks.
const fs = require('node:fs');
const cp = require('node:child_process');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const normalize = value => value.toString().replace(/\r\n/g, '\n');
for (const file of fs.readdirSync('.').filter(file => file.endsWith('.html'))) {
  const current = fs.readFileSync(file);
  let original = normalize(cp.execFileSync('git', ['show', `HEAD:${file}`])).replace(/        <button class="hero__motion-control"[\s\S]*?<\/button>\n/, '');
  if (file === 'index.html') {
    original = original.replace(/        <div class="hero__profile">[\s\S]*?        <\/div>\n        <\/div>/,
      '        <div class="hero__profile-badge">\n          <i class="fas fa-certificate"></i>&nbsp; QuickBooks Certified\n        </div>');
  }
  if (file === 'project-pricelabs-dashboard.html') {
    const matchingButtons = normalize(fs.readFileSync('project-qbo-cleanup.html')).match(/      <div style="margin-top: 48px;[\s\S]*?      <\/div>/)[0];
    original = original.replace('    </div>\n  </main>', matchingButtons + '\n    </div>\n  </main>');
  }
  assert.equal(normalize(current), original, `${file} content changed beyond the requested edits`);
  for (const [, url] of current.toString().replace(/<!--[\s\S]*?-->/g, '').matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (/^(https?:|mailto:)/.test(url)) continue;
    const [name, id] = url.split('#');
    const target = name || file;
    assert.ok(fs.existsSync(target), `Missing local destination ${url}`);
    if (id) assert.ok(fs.readFileSync(target, 'utf8').includes(`id="${id}"`), `Missing anchor ${url}`);
  }
  console.log(`PASS ${file}: original content and destinations preserved except explicitly requested edits`);
}
const source = fs.readFileSync('script.js', 'utf8');
const baseline = cp.execFileSync('git', ['show', 'HEAD:script.js']).toString();
const marker = '(function initContactForm()';
const formCode = source.slice(source.indexOf(marker));
assert.equal(normalize(formCode), normalize(baseline.slice(baseline.indexOf(marker))));
console.log('PASS contact integration, validation and payload are byte-identical');
async function testForm() {
  const elements = Object.fromEntries(['contactForm','formSubmitBtn','formBtnText','formCountdown','formError','honeypot','formName','formEmail','formBusiness','formMessage'].map(id => [id, {value:'',style:{},disabled:true,textContent:'',addEventListener(type, handler){this[type]=handler;},reset(){this.wasReset=true;}}]));
  let tick;
  let request;
  const context = {document:{getElementById:id=>elements[id]},Math,Date,FormData,setInterval:fn=>(tick=fn,1),clearInterval(){},setTimeout(){},fetch:async (url,options)=>{request={url,options};}};
  vm.runInNewContext(formCode, context);
  for(let i=0;i<16;i++) tick();
  assert.equal(elements.formSubmitBtn.disabled,false);
  const submit = () => elements.contactForm.submit({preventDefault(){}});
  await submit(); assert.equal(elements.formError.textContent,'Please enter your name.');
  elements.formName.value='Local QA'; elements.formEmail.value='invalid';
  await submit(); assert.match(elements.formError.textContent,/valid email/);
  elements.formEmail.value='qa@example.com';
  await submit(); assert.match(elements.formError.textContent,/bookkeeping needs/);
  elements.formMessage.value='Local intercepted test';
  await submit(); assert.equal(request.options.method,'POST');
  assert.equal(request.options.body.get('name'),'Local QA');
  assert.equal(elements.contactForm.wasReset,true);
  context.fetch=async()=>{throw new Error('Offline');};
  await submit(); assert.match(elements.formError.textContent,/Something went wrong/);
  assert.equal(elements.formSubmitBtn.disabled,false);
  console.log('PASS countdown, field validation, intercepted submission, reset and error recovery (no network requests sent)');
}
async function testTransitions() {
  const start = source.indexOf('(function initPageTransitions()');
  const code = source.slice(start, source.indexOf('})();', start) + 5);
  const events = {};
  const preference = { matches: false, addEventListener(){} };
  let navigated;
  let canceled = false;
  const context = {
    window: { matchMedia:()=>preference, addEventListener(type, fn){(events[type] ||= []).push(fn);} },
    document: { addEventListener(type, fn){events[type]=[fn];}, querySelector(){return null;},
      body:{animate(){return {finished:Promise.resolve(),cancel(){canceled=true;}};}} },
    Element:{prototype:{animate(){}}}, URL, Promise, Set, setTimeout,
    location:{href:'https://example.com/index.html',origin:'https://example.com',pathname:'/index.html',search:'',assign(url){navigated=url;}}
  };
  vm.runInNewContext(code, context);
  const click = async (href, options={}) => {
    let prevented=false;
    const link={href,target:options.target || '',hasAttribute:()=>Boolean(options.download)};
    events.click[0]({button:0,defaultPrevented:false,...options,target:{closest:()=>link},preventDefault(){prevented=true;}});
    await new Promise(resolve=>setImmediate(resolve));
    return prevented;
  };
  for(const [href,options] of [['https://outside.example/',{}],['https://example.com/index.html#contact',{}],['https://example.com/project-qbo-cleanup.html',{ctrlKey:true}],['https://example.com/project-qbo-cleanup.html',{target:'_blank'}],['https://example.com/project-qbo-cleanup.html',{download:true}]]) {
    assert.equal(await click(href,options),false);
  }
  assert.equal(await click('https://example.com/project-qbo-cleanup.html'),true);
  assert.equal(navigated,'https://example.com/project-qbo-cleanup.html');
  events.pageshow.forEach(fn=>fn({persisted:true}));
  preference.matches=true;
  assert.equal(await click('https://example.com/project-airbnb-email-automation.html'),false);
  console.log('PASS page transitions preserve destinations, same-page anchors, external links, downloads, modified clicks, and reduced motion');
}
Promise.all([testForm(),testTransitions()]).catch(error=>{console.error(error);process.exitCode=1;});
