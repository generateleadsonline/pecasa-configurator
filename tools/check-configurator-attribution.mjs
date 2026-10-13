// Pure attribution contract checks; no browser, network or CRM writes.
// Run: node tools/check-configurator-attribution.mjs
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';

const source = await readFile(new URL('../src/configurator-attribution.js', import.meta.url), 'utf8');
const {captureAttribution, attributionFields, ATTRIBUTION_STORAGE_KEY} = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const BASE = 'https://pecasa-garden-room-configurator.netlify.app';
const memory = (initial = null) => {
  const values = new Map(initial === null ? [] : [[ATTRIBUTION_STORAGE_KEY, initial]]);
  return {getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), values};
};

test('captures only permitted campaign fields before design URL rewriting', () => {
  const a = captureAttribution({url: `${BASE}/?utm_source=google&utm_medium=cpc&utm_campaign=Autumn%20rooms&utm_term=garden%20office&utm_content=creative-a&utm_id=oct26&gclid=secret&fbclid=secret&email=person%40example.com`});
  assert.deepEqual(a, {utm_source:'google',utm_medium:'cpc',utm_campaign:'Autumn rooms',utm_term:'garden office',utm_content:'creative-a',utm_id:'oct26',referrer_host:'',entry_path:'/'});
  assert.equal(JSON.stringify(a).includes('secret'), false);
  assert.equal(JSON.stringify(a).includes('person'), false);
});

test('keeps the campaign and original entry route across homepage handoff and reload', () => {
  const storage = memory();
  const first = captureAttribution({url: `${BASE}/?utm_source=google&utm_medium=cpc`, referrer:'https://www.google.com/search?q=private', storage});
  const next = captureAttribution({url: `${BASE}/configurator/?v=1&r=belle`, referrer:`${BASE}/?utm_source=google`, storage});
  const reload = captureAttribution({url: `${BASE}/configurator/?v=1&r=belle&s=4`, storage});
  assert.deepEqual(next, first);
  assert.deepEqual(reload, first);
  assert.equal(first.referrer_host, 'www.google.com');
  assert.equal(first.entry_path, '/');
  assert.equal(JSON.stringify([...storage.values]).includes('private'), false);
});

test('an explicit new campaign resets omitted old fields', () => {
  const storage = memory();
  captureAttribution({url:`${BASE}/?utm_source=google&utm_medium=cpc&utm_campaign=old&utm_content=old-ad`,storage});
  const next = captureAttribution({url:`${BASE}/configurator/?utm_source=newsletter`,referrer:'https://mail.example.com/inbox/private',storage});
  assert.equal(next.utm_source, 'newsletter');
  assert.equal(next.utm_medium, '');
  assert.equal(next.utm_campaign, '');
  assert.equal(next.utm_content, '');
  assert.equal(next.entry_path, '/configurator/');
  assert.equal(next.referrer_host, 'mail.example.com');
});

test('an explicit empty or rejected campaign cannot accidentally keep old tags', () => {
  const storage = memory();
  captureAttribution({url:`${BASE}/?utm_source=google&utm_medium=cpc`,storage});
  const next = captureAttribution({url:`${BASE}/configurator/?utm_source=&utm_campaign=person%40example.com`,storage});
  assert.equal(next.utm_source, '');
  assert.equal(next.utm_medium, '');
  assert.equal(next.utm_campaign, '');
});

test('returns in-memory attribution if storage read and write both fail', () => {
  const storage = {getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
  assert.equal(captureAttribution({url:`${BASE}/configurator/?utm_source=organic`,storage}).utm_source,'organic');
  assert.equal(captureAttribution({url:`${BASE}/configurator/?utm_source=organic`}).utm_source,'organic');
});

test('ignores malformed JSON, wrong versions and wrong cached object shapes', () => {
  for (const invalid of ['{', 'null', '[]', '42', '"string"', '{"version":2,"attribution":{"utm_source":"old"}}', '{"version":1,"attribution":[]}', '{"version":1,"attribution":null}', '{"version":1,"attribution":{}}']) {
    const a=captureAttribution({url:`${BASE}/configurator/`,storage:memory(invalid)});
    assert.equal(a.utm_source,'',invalid);
    assert.equal(a.entry_path,'/configurator/',invalid);
  }
});

test('re-sanitises cached values and never restores arbitrary cached properties', () => {
  const saved={version:1,attribution:{utm_source:{email:'person@example.com'},utm_medium:'cpc',utm_campaign:'person@example.com',gclid:'secret',email:'secret',referrer_host:'example.com/private?secret=yes',entry_path:'/customer/person@example.com'}};
  const a=captureAttribution({url:`${BASE}/configurator/`,storage:memory(JSON.stringify(saved))});
  assert.equal(a.utm_source,'');
  assert.equal(a.utm_medium,'cpc');
  assert.equal(a.utm_campaign,'');
  assert.equal(a.referrer_host,'');
  assert.equal(a.entry_path,'/[other]');
  assert.equal(JSON.stringify(a).includes('secret'),false);
  assert.equal(Object.hasOwn(a,'email'),false);
});

test('referrer keeps only an external hostname and rejects unsafe schemes', () => {
  const external=captureAttribution({url:`${BASE}/configurator/`,referrer:'https://WWW.Example.COM/private/customer?email=person%40example.com#secret'});
  assert.equal(external.referrer_host,'www.example.com');
  assert.equal(captureAttribution({url:`${BASE}/configurator/`,referrer:`${BASE}/?private=yes`}).referrer_host,'');
  assert.equal(captureAttribution({url:`${BASE}/configurator/`,referrer:'javascript:alert(1)'}).referrer_host,'');
  assert.equal(captureAttribution({url:`${BASE}/configurator/`,referrer:'https://192.0.2.1/private'}).referrer_host,'');
});

test('campaign cleaning bounds length, strips controls and rejects obvious personal values', () => {
  const values={utm_source:'  Goo\u0000gle\u202e  ',utm_medium:'paid   search',utm_campaign:'é'.repeat(140),utm_term:'person%40example.com',utm_content:'+44 1234 567890',utm_id:'https://example.com/?email=private'};
  const fields=attributionFields(values);
  assert.equal(fields['utm-source'],'Google');
  assert.equal(fields['utm-medium'],'paid search');
  assert.equal(fields['utm-campaign'],'é'.repeat(120));
  assert.equal(fields['utm-term'],'');
  assert.equal(fields['utm-content'],'');
  assert.equal(fields['utm-id'],'');
  assert.equal(attributionFields({utm_id:'123456789012'})['utm-id'],'123456789012');
});

test('only public route categories are retained, without queries or fragments', () => {
  assert.equal(captureAttribution({url:`${BASE}/configurator?email=person%40example.com#private`}).entry_path,'/configurator/');
  assert.equal(captureAttribution({url:`${BASE}/configurator/thank-you/?secret=yes`}).entry_path,'/configurator/thank-you/');
  assert.equal(captureAttribution({url:`${BASE}/customer/person@example.com`}).entry_path,'/[other]');
  assert.equal(captureAttribution({url:'not a URL'}).entry_path,'');
  assert.equal(captureAttribution({url:'data:text/html,private'}).entry_path,'');
});

test('maps sanitised values to the static form field contract', () => {
  const a=captureAttribution({url:`${BASE}/configurator/?utm_source=google&utm_id=autumn26`});
  assert.deepEqual(attributionFields(a),{'utm-source':'google','utm-medium':'','utm-campaign':'','utm-term':'','utm-content':'','utm-id':'autumn26','referrer-host':'','entry-path':'/configurator/'});
  assert.equal(Object.values(attributionFields(null)).every(v=>v===''),true);
});
