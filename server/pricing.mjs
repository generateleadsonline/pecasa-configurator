import {STYLES,LABELS} from './validation.mjs';
export const PRICE_SOURCE='https://www.pecasa.co.uk/garden-rooms-london/';
export const PRICE_CHECKED='2026-10-11';
// Server-only published standard garden-room guide. No interpolation or invented upgrade rates.
const DEPTH_BASE=new Map([[2.8,22300],[3,24300],[3.5,26300],[4,28300],[5,32300]]);
const BESPOKE_STYLES=new Set(['pergola','veranda','lshape','angle']);
export function calculateQuote(design){
  const standard=DEPTH_BASE.has(design.depth)&&Number.isInteger(design.width)&&design.width>=3&&design.width<=8&&!BESPOKE_STYLES.has(design.style);
  const total=standard?DEPTH_BASE.get(design.depth)+(design.width-3)*4000:null;
  const open=design.style==='pergola';
  const lines=[{label:standard?`Published standard-room guide: ${design.width.toFixed(1)} m × ${design.depth.toFixed(1)} m`:'Your bespoke room and specification',amount:total}];
  lines.push({label:`${STYLES[design.style]} design and ${LABELS.cladding[design.cladding].toLowerCase()} finish: final specification to confirm`,amount:null});
  if(!open&&design.glazing==='bifold')lines.push({label:'Bifold glazing specification',amount:null});
  if(!open&&design.window==='both')lines.push({label:'Additional side glazing',amount:null});
  if(design.roof==='pitched')lines.push({label:'Pitched roof specification',amount:null});
  if(design.decking)lines.push({label:'Decking',amount:null});
  if(design.rooflight)lines.push({label:'Rooflight',amount:null});
  if(design.lighting)lines.push({label:'Additional lighting preferences',amount:null});
  if(design.bathroom!=='none')lines.push({label:LABELS.bathroom[design.bathroom]+' and service connections',amount:null});
  if(design.kitchen!=='none')lines.push({label:'Kitchenette and service connections',amount:null});
  if(design.climate!=='none')lines.push({label:LABELS.climate[design.climate],amount:null});
  lines.push({label:'Groundworks, access, delivery and mains connections: scope to confirm at survey',amount:null});
  return {total,totalLabel:total===null?'Bespoke quote':'£'+total.toLocaleString('en-GB'),lines,vatStatus:total===null?'VAT confirmed in your written quotation':'Published guide includes VAT',disclaimer:'An indicative standard-room budget guide, not a fixed price for your selected design. Pecasa confirms your complete specification, site requirements and final price in a written quotation.',source:PRICE_SOURCE,sourceChecked:PRICE_CHECKED,assumptions:[standard?'Exact footprint matched to the published London standard garden-room table; no interpolation.':'This footprint or structure has no verified matching published price; no estimate has been invented.','Selected styling, glazing, finishes and extras need a personalised quotation and have not been added to the guide.','The published 3.0 m × 2.8 m table figure is £22,300; the homepage advertises a £23,000 minimum. Pecasa must confirm current pricing.','Dimensions and furniture are indicative; your finished usable space and overall height need confirmation.'],hasPendingPrices:true,priceVersion:'pecasa-published-london-grid-2026-10-11'};
}
