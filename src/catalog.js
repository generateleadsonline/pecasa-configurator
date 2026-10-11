// Display-only choices. Price calculation and acceptance live on the server.
export const DEFAULT = {style:'portal',width:4,depth:3,height:2.5,cladding:'cedar',glazing:'bifold',window:'right',decking:false,rooflight:false,lighting:false,purpose:'office',roof:'flat',floor:'oak',bathroom:'none',kitchen:'none',climate:'none'};
export const STYLES = [
{id:'portal',name:'Portal',description:'A bold frame. A beautiful outlook.',roof:'flat'},
{id:'levno',name:'Levno',description:'A clean roofline with a sheltered edge.',roof:'pitched'},
{id:'apexo',name:'Apexo',description:'A distinctive roof with character.',roof:'pitched'},
{id:'quba',name:'Quba',description:'Pure lines. Contemporary simplicity.',roof:'flat'},
{id:'cabano',name:'Cabano',description:'Classic cabin character.',roof:'pitched'},
{id:'inspiro',name:'Inspiro',description:'A generous pitched-roof silhouette.',roof:'pitched'},
{id:'roko',name:'Roko',description:'A broad, understated profile.',roof:'flat'},
{id:'ofiko',name:'Ofiko',description:'Light-filled and refreshingly simple.',roof:'flat'},
{id:'ecke',name:'Ecke',description:'An open corner to the garden.',roof:'flat'},
{id:'edge',name:'Edge',description:'A striking roof that makes a statement.',roof:'flat'},
{id:'lshape',name:'L-Shape',description:'An angled layout for a different outlook.',roof:'flat'},
{id:'veranda',name:'Veranda',description:'An enclosed room with a sheltered porch.',roof:'pitched'},
{id:'angle',name:'Angle',description:'Architectural lines with a fresh perspective.',roof:'flat'},
{id:'pergola',name:'Pergola',description:'An open structure for outdoor living.',roof:'flat'}
];
export const PURPOSES = [{id:'office',name:'Work',label:'Garden office',description:'A calmer commute.'},{id:'gym',name:'Move',label:'Gym & wellbeing',description:'Your daily reset.'},{id:'studio',name:'Create',label:'Creative studio',description:'Space for your ideas.'},{id:'retreat',name:'Unwind',label:'Garden retreat',description:'A little escape.'}];
export const CLADDINGS = [{id:'cedar',name:'Natural cedar',description:'Warm timber with a distinctive grain.',colour:'#b88b60'},{id:'larch',name:'Natural larch',description:'A lighter, natural timber finish.',colour:'#d1b88c'},{id:'composite',name:'Grey composite',description:'A contemporary, low-maintenance look.',colour:'#92978e'},{id:'anthracite',name:'Anthracite',description:'A deep, understated finish.',colour:'#373c3c'},{id:'white',name:'Soft white',description:'A bright, painted exterior.',colour:'#e6e6de'}];
export const GLAZING = [{id:'french',name:'Double doors',description:'A classic pair with an easy opening.'},{id:'sliding',name:'Sliding doors',description:'Wide views. More floor space.'},{id:'bifold',name:'Bi-fold doors',description:'Open your room to the garden.'}];
export const FLOORS = [{id:'oak',name:'Natural oak',colour:'#c1a274'},{id:'light',name:'Light oak',colour:'#e0d1b5'},{id:'dark',name:'Dark oak',colour:'#75665b'}];
export const bounds = style => ({minWidth:style==='portal'?2.7:style==='apexo'?3.7:2,maxWidth:['pergola','veranda'].includes(style)?16:10,minDepth:2,maxDepth:['pergola','veranda'].includes(style)?10:8});
export const number = n => Number(n).toLocaleString('en-GB',{maximumFractionDigits:1,minimumFractionDigits:1});
export const money = n => n==null ? 'Bespoke quote' : new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(n);
export const label = (list,id) => list.find(x=>x.id===id)?.name || id;
export const publishedSize = d => !['pergola','veranda','lshape','angle'].includes(d.style)&&Number.isInteger(d.width)&&d.width>=3&&d.width<=8&&[2.8,3,3.5,4,5].includes(d.depth);
const enums = {style:STYLES.map(x=>x.id),cladding:CLADDINGS.map(x=>x.id),glazing:GLAZING.map(x=>x.id),window:['none','left','right','both'],purpose:PURPOSES.map(x=>x.id),roof:['flat','pitched'],floor:FLOORS.map(x=>x.id),bathroom:['none','cloakroom','shower'],kitchen:['none','kitchenette'],climate:['none','heater','aircon']};
export function normalise(input={}) {
  const value=input&&typeof input==='object'&&!Array.isArray(input)?input:{};
  const d={...DEFAULT};
  for(const [key,values] of Object.entries(enums)) if(values.includes(value[key])) d[key]=value[key];
  for(const key of ['decking','rooflight','lighting']) if(typeof value[key]==='boolean')d[key]=value[key];
  const b=bounds(d.style);
  for(const key of ['width','depth']) {
    const raw=value[key],v=typeof raw==='number'||typeof raw==='string'&&raw.trim()?Number(raw):NaN;
    if(Number.isFinite(v))d[key]=Math.min(b[`max${key[0].toUpperCase()+key.slice(1)}`],Math.max(b[`min${key[0].toUpperCase()+key.slice(1)}`],Math.round(v*10)/10));
  }
  d.height=2.5;
  // These concept silhouettes have fixed pitched roofs in the 3D preview.
  if(['cabano','inspiro','veranda'].includes(d.style))d.roof='pitched';
  if(d.style==='pergola'){d.bathroom='none';d.kitchen='none';d.climate='none';d.rooflight=false;d.window='none';}
  return d;
}
export function shareURL(design) {const url=new URL('/configurator/',window.location.origin);url.searchParams.set('design',btoa(JSON.stringify(design)).replaceAll('+','-').replaceAll('/','_').replaceAll('=',''));return url.href;}
export function initialDesign() {
  try {
    const code=new URLSearchParams(window.location.search).get('design');
    if(code&&code.length<4000){
      const shared=JSON.parse(atob(code.replaceAll('-','+').replaceAll('_','/')));
      if(shared&&typeof shared==='object'&&!Array.isArray(shared))return {design:normalise(shared),shared:true};
    }
  }catch{}
  // A broken shared link must not prevent a visitor recovering their saved draft.
  try {
    const saved=JSON.parse(localStorage.getItem('pecasa-draft-v1'));
    if(saved?.design&&typeof saved.design==='object'&&!Array.isArray(saved.design))return {design:normalise(saved.design),resumed:true};
  }catch{}
  return {design:{...DEFAULT}};
}
