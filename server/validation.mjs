export class InputError extends Error {
  constructor(message, status = 422, fields = {}) { super(message); this.status = status; this.fields = fields; }
}
export const STYLES = {portal:'Portal',levno:'Levno',apexo:'Apexo',cabano:'Cabano',inspiro:'Inspiro',quba:'Quba',roko:'Roko',ofiko:'Ofiko',ecke:'Ecke',edge:'Edge',lshape:'L shape',veranda:'Veranda',angle:'Angle',pergola:'Pergola'};
export const LABELS = {
  cladding:{cedar:'Cedar',larch:'Larch',composite:'Composite',anthracite:'Anthracite',white:'White'},
  glazing:{french:'French doors',sliding:'Sliding doors',bifold:'Bifold doors'},
  window:{none:'No side window',left:'Left side window',right:'Right side window',both:'Windows on both sides'},
  purpose:{office:'Garden office',gym:'Gym & wellbeing',studio:'Creative studio',retreat:'A quiet retreat'},
  roof:{flat:'Flat roof',pitched:'Pitched roof'},
  floor:{oak:'Natural oak',light:'Light finish',dark:'Dark finish'},
  bathroom:{none:'None requested',cloakroom:'Cloakroom',shower:'Shower room'},
  kitchen:{none:'None requested',kitchenette:'Kitchenette'},
  climate:{none:'None requested',heater:'Electric heater',aircon:'Air conditioning'},
};
const DESIGN_KEYS=['style','width','depth','height','cladding','glazing','window','decking','rooflight','lighting','purpose','roof','floor','bathroom','kitchen','climate'];
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export function keys(value,allowed){for(const key of Object.keys(value))if(!allowed.includes(key))throw new InputError('Please check the information sent.');}
function fieldError(field,message){throw new InputError(message,422,{[field]:message});}
function text(value,field,{required=false,max=200,multiline=false}={}){
  if(value===undefined||value===null)value='';
  if(typeof value!=='string'||value.length>max||(multiline?/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u:/[\u0000-\u001f\u007f]/u).test(value))fieldError(field,`Please check your ${field}.`);
  const result=value.trim();if(required&&!result)fieldError(field,`Please enter your ${field}.`);return result;
}
export function validateLead(input){
  if(!object(input))throw new InputError('Please enter your contact details.');
  keys(input,['name','email','postcode','phone','timeline','notes','marketing','website']);
  if(input.website!==undefined&&(typeof input.website!=='string'||input.website.trim()))throw new InputError('We could not accept this enquiry.');
  const name=text(input.name,'name',{required:true,max:80});if(name.length<2)fieldError('name','Please enter your name.');
  const email=text(input.email,'email',{required:true,max:254}).toLowerCase();if(!/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email))fieldError('email','Please enter a complete email address.');
  const rawPostcode=text(input.postcode,'postcode',{required:true,max:12}).toUpperCase().replace(/\s+/g,'');
  if(!/^(?:GIR0AA|(?:[A-PR-UWYZ]\d(?:\d|[A-HJKPSTUW])?|[A-PR-UWYZ][A-HK-Y]\d(?:\d|[ABEHMNPRVWXY])?)\d[ABD-HJLNP-UW-Z]{2})$/i.test(rawPostcode))fieldError('postcode','Please enter a full UK postcode, such as IP31 1SL.');
  const phone=text(input.phone,'phone',{max:30});if(phone&&(!/^[+()\d\s.-]+$/.test(phone)||phone.replace(/\D/g,'').length<7||phone.replace(/\D/g,'').length>15))fieldError('phone','Please check your phone number.');
  if(input.marketing!==undefined&&typeof input.marketing!=='boolean')fieldError('marketing','Please check your contact preference.');
  return {name,email,postcode:`${rawPostcode.slice(0,-3)} ${rawPostcode.slice(-3)}`,phone,timeline:text(input.timeline,'timeline',{max:80}),notes:text(input.notes,'notes',{max:1000,multiline:true}),marketing:input.marketing===true};
}
export function validateDesign(input){
  if(!object(input))throw new InputError('Please check your garden room design.');keys(input,DESIGN_KEYS);
  if(!Object.hasOwn(STYLES,input.style))fieldError('style','Please choose a Pecasa style.');
  const outdoor=['veranda','pergola'].includes(input.style),minWidth=input.style==='portal'?2.7:input.style==='apexo'?3.7:2;
  for(const [key,min,max] of [['width',minWidth,outdoor?16:10],['depth',2,outdoor?10:8]]){
    const value=input[key];if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max||Math.abs(value*10-Math.round(value*10))>1e-7)fieldError(key,`Choose a ${key} from ${min} to ${max} metres, in 0.1 metre steps.`);
  }
  const height=input.height??2.5;if(height!==2.5)fieldError('height','The concept preview uses a 2.5 metre height; final height is confirmed by Pecasa.');
  for(const [key,values] of Object.entries(LABELS))if(!Object.hasOwn(values,input[key]))fieldError(key,`Please check your ${key} selection.`);
  for(const key of ['decking','rooflight','lighting'])if(typeof input[key]!=='boolean')fieldError(key,`Please check your ${key} selection.`);
  if(['cabano','inspiro','veranda'].includes(input.style)&&input.roof!=='pitched')fieldError('roof',`${STYLES[input.style]} uses a pitched roof in this preview.`);
  if(input.style==='pergola'){for(const key of ['bathroom','kitchen','climate'])if(input[key]!=='none')fieldError(key,'Interior room fittings do not apply to an open pergola.');if(input.window!=='none')fieldError('window','Side room windows do not apply to an open pergola.');if(input.rooflight)fieldError('rooflight','A room rooflight does not apply to an open pergola.');}
  return Object.fromEntries(DESIGN_KEYS.map(key=>[key,key==='height'?height:input[key]]));
}
export function validateImage(input){
  if(input===undefined||input===null||input==='')return null;
  if(typeof input!=='string'||input.length>1_450_000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(input))throw new InputError('Your preview image could not be saved. Please try again.',422,{image:'Use a JPEG preview smaller than 1 MB.'});
  const bytes=Buffer.from(input.split(',')[1],'base64');
  if(bytes.length<100||bytes.length>1_048_576||bytes[0]!==0xff||bytes[1]!==0xd8||bytes.at(-2)!==0xff||bytes.at(-1)!==0xd9)throw new InputError('Your preview image could not be saved. Please try again.',422,{image:'The preview must be a complete JPEG.'});
  let i=2,dimensions;
  while(i+4<bytes.length){if(bytes[i]!==0xff){i++;continue;}const marker=bytes[i+1];if(marker===0xda||marker===0xd9)break;if(marker===0x00||marker===0xff){i++;continue;}if(marker>=0xd0&&marker<=0xd7){i+=2;continue;}const length=bytes.readUInt16BE(i+2);if(length<2||i+2+length>bytes.length)break;if([0xc0,0xc1,0xc2].includes(marker)&&length>=8){dimensions={height:bytes.readUInt16BE(i+5),width:bytes.readUInt16BE(i+7)};break;}i+=length+2;}
  if(!dimensions||dimensions.width<100||dimensions.height<100||dimensions.width>4000||dimensions.height>4000||dimensions.width*dimensions.height>9_000_000)throw new InputError('Your preview image could not be saved. Please try again.',422,{image:'Use a JPEG preview between 100 and 4000 pixels.'});
  return input;
}
export function validateIdempotency(input){if(typeof input!=='string'||!/^[A-Za-z0-9_-]{8,100}$/.test(input))throw new InputError('Please reload your design and try again.');return input;}
export function designLink(design,origin){const url=new URL('/configurator/',origin);url.searchParams.set('design',Buffer.from(JSON.stringify(design)).toString('base64url'));return url.href;}
