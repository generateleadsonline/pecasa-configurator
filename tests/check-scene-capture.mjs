// Run after live QA supplies the real scene capture. No external request or lead is sent.
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {validateImage,designLink} from '../server/validation.mjs';
import {generateDesignPack} from '../server/pdf.mjs';
import {calculateQuote} from '../server/pricing.mjs';
const path=process.argv[2];if(!path)throw new Error('Supply the absolute path to the real JPEG preview capture.');
const bytes=await readFile(path),image='data:image/jpeg;base64,'+bytes.toString('base64');
assert.equal(validateImage(image),image);
const design={style:'portal',width:4,depth:3,height:2.5,cladding:'cedar',glazing:'bifold',window:'right',decking:false,rooflight:false,lighting:false,purpose:'office',roof:'flat',floor:'oak',bathroom:'none',kitchen:'none',climate:'none'};
const record={reference:'PC-QACAPTURE',lead:{name:'Pecasa QA'},updatedAt:'2026-10-11T12:00:00Z',design,quote:calculateQuote(design),shareUrl:designLink(design,'https://pecasa-test.netlify.app'),image};
const pdf=await generateDesignPack(record);
assert.equal(Buffer.from(pdf.subarray(0,5)).toString(),'%PDF-');
// jsPDF embeds JPEG bytes unchanged as a DCT stream. Exact byte search proves
// the real canvas capture is present, rather than silently using the fallback.
assert.ok(Buffer.from(pdf).includes(bytes),'The generated PDF must embed the exact accepted JPEG.');
console.log('Actual JPEG accepted and embedded unchanged in the four-page design pack:',bytes.length,'capture bytes,',pdf.length,'PDF bytes.');
