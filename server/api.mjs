import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {InputError,keys,validateLead,validateDesign,validateImage,validateIdempotency,designLink} from './validation.mjs';
import {calculateQuote} from './pricing.mjs';
export const TTL_MS=90*24*60*60*1000;
const BODY_LIMIT=1_600_000;
const TOKEN=/^[A-Za-z0-9_-]{43}$/;
const PRIVATE={'Cache-Control':'private, no-store, max-age=0','Pragma':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow'};
const hash=value=>createHash('sha256').update(value).digest('hex');
const json=(data,status=200,headers={})=>Response.json(data,{status,headers:{...PRIVATE,...headers}});
function originCheck(request,required=false){const origin=request.headers.get('origin'),site=request.headers.get('sec-fetch-site');if((required&&!origin)||(origin&&origin!==new URL(request.url).origin)||(site&&!['same-origin','none'].includes(site)))throw new InputError('Please open your design on this website before continuing.',403);}
function fail(error){if(error instanceof InputError)return json({error:error.message,fields:error.fields},error.status,error.status===429?{'Retry-After':'60'}:{});console.warn('Pecasa private quote operation unavailable.');return json({error:'We could not save or retrieve your design just now. Your choices are safe. Please try again.'},503);}
export function createLimiter(limit=20,windowMs=60000){const counts=new Map();return(context,now)=>{const key=hash(context.ip||'local'),old=counts.get(key);if(!old||now-old.start>=windowMs)counts.set(key,{start:now,count:1});else if(++old.count>limit)throw new InputError('Please wait a minute before trying again.',429);if(counts.size>10000)for(const[k,v]of counts)if(now-v.start>=windowMs)counts.delete(k);};}
async function body(request){if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||''))throw new InputError('Please submit your details as JSON.',415);const declared=request.headers.get('content-length');if(declared&&(!/^\d+$/.test(declared)||Number(declared)>BODY_LIMIT))throw new InputError('The preview is too large. Please try a smaller image.',413);const reader=request.body?.getReader();if(!reader)throw new InputError('Please complete your details.');const chunks=[];let count=0;try{while(true){const r=await reader.read();if(r.done)break;count+=r.value.length;if(count>BODY_LIMIT){await reader.cancel();throw new InputError('The preview is too large. Please try a smaller image.',413);}chunks.push(r.value);}}finally{reader.releaseLock();}try{const input=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!input||typeof input!=='object'||Array.isArray(input))throw new Error();return input;}catch{throw new InputError('Please submit a valid design.');}}
async function setVerified(store,key,value,options={}){const result=await store.setJSON(key,value,options);if(result?.modified!==true)throw new Error('Storage write not confirmed');const read=await store.get(key,{type:'json',consistency:'strong'});if(JSON.stringify(read)!==JSON.stringify(value))throw new Error('Storage readback not confirmed');}
export async function acceptedRecord(store,token,now){if(!TOKEN.test(token||''))throw new InputError('Please submit your details to unlock your design first.',401);const record=await store.get(`quotes/${hash(token)}`,{type:'json',consistency:'strong'});if(!record||record.accepted!==true||!record.lead||!record.design||!record.quote||!Number.isFinite(record.expiresAt)||record.expiresAt<=now)throw new InputError('Your saved quote link has expired. Please submit your details again.',401);return record;}
function receipt(record,token){return{reference:record.reference,quote:record.quote,token,pdfUrl:`/api/design-pack?token=${encodeURIComponent(token)}&revision=${encodeURIComponent(record.revision)}`,design:record.design,shareUrl:record.shareUrl};}
export function createQuoteHandler({storeFactory,now=()=>Date.now(),makeToken=()=>randomBytes(32).toString('base64url'),makeId=randomUUID,limiter=createLimiter()}={}){
 return async(request,context={})=>{try{
  if(!['GET','POST'].includes(request.method))return json({error:'Use GET to restore or POST to submit your design.'},405,{Allow:'GET, POST'});
  originCheck(request,request.method==='POST');const time=now();limiter(context,time);const store=storeFactory(context);
  if(request.method==='GET'){const token=new URL(request.url).searchParams.get('token');return json(receipt(await acceptedRecord(store,token,time),token));}
  const input=await body(request);keys(input,['lead','design','image','shareUrl','idempotencyKey','token']);
  const design=validateDesign(input.design),image=validateImage(input.image),id=validateIdempotency(input.idempotencyKey);
  if(input.shareUrl!==undefined&&(typeof input.shareUrl!=='string'||input.shareUrl.length>4000))throw new InputError('Please check your design link.');
  const update=input.token!==undefined;let token,previous,lead;
  if(update){if(input.lead!==undefined)throw new InputError('Your contact details are already saved.');token=input.token;previous=await acceptedRecord(store,token,time);lead=previous.lead;}else lead=validateLead(input.lead);
  const fingerprint=hash(JSON.stringify({design,lead,imageHash:image?hash(image):null}));
  const indexKey=`idempotency/${hash((update?hash(token)+':':'new:')+id)}`;
  let index=await store.get(indexKey,{type:'json',consistency:'strong'});
  if(index){if(index.fingerprint!==fingerprint)throw new InputError('This submission key belongs to a different design. Please try again.',409);if(index.expiresAt<=time)throw new InputError('Please reload your design and submit it again.',409);token=index.token;
   if(index.response){await acceptedRecord(store,token,time);return json(index.response,200);}
  }else{token=token||makeToken();if(!TOKEN.test(token))throw new Error('Invalid token generator');index={fingerprint,token,createdAt:new Date(time).toISOString(),reference:previous?.reference||'PC-'+makeId().replaceAll('-','').slice(0,8).toUpperCase(),revision:makeId(),expiresAt:previous?.expiresAt||time+TTL_MS};
   const claim=await store.setJSON(indexKey,index,{onlyIfNew:true});if(claim?.modified!==true){const concurrent=await store.get(indexKey,{type:'json',consistency:'strong'});if(concurrent?.fingerprint===fingerprint&&concurrent.response){await acceptedRecord(store,concurrent.token,time);return json(concurrent.response,200);}throw new InputError('Your design is being saved. Please retry in a moment.',409);}
  }
  const createdAt=previous?.createdAt||index.createdAt||new Date(time).toISOString();
  const record={schemaVersion:1,accepted:true,reference:index.reference,revision:index.revision,createdAt,updatedAt:new Date(time).toISOString(),expiresAt:index.expiresAt,lead,design,quote:calculateQuote(design),image,shareUrl:designLink(design,new URL(request.url).origin),consentRecordedAt:previous?.consentRecordedAt||createdAt,leadDestination:'private-netlify-blobs; no email or CRM integration connected'};
  // Immutable revisions keep each issued PDF aligned with its accepted specification.
  await setVerified(store,`revisions/${hash(token)}/${record.revision}`,record);
  await setVerified(store,`quotes/${hash(token)}`,record);
  const response=receipt(record,token);await setVerified(store,indexKey,{...index,response});
  return json(response,update?200:201);
 }catch(error){return fail(error);}};
}
export function createPdfHandler({storeFactory,generatePdf,now=()=>Date.now(),limiter=createLimiter(30)}={}){
 return async(request,context={})=>{try{
  if(request.method!=='GET')return json({error:'Use GET to download your design pack.'},405,{Allow:'GET'});
  originCheck(request);const time=now();limiter(context,time);const url=new URL(request.url),token=url.searchParams.get('token'),store=storeFactory(context);let record=await acceptedRecord(store,token,time);
  const revision=url.searchParams.get('revision');if(revision){if(!/^[a-f0-9-]{36}$/i.test(revision))throw new InputError('Please use the saved design pack link.',422);const snapshot=await store.get(`revisions/${hash(token)}/${revision}`,{type:'json',consistency:'strong'});if(!snapshot||snapshot.reference!==record.reference||snapshot.accepted!==true||snapshot.expiresAt<=time)throw new InputError('This design pack was not found. Please save your current design again.',404);record=snapshot;}
  const bytes=await generatePdf(record);if(!(bytes instanceof Uint8Array)||bytes.length<100)throw new Error('Empty PDF');
  return new Response(bytes,{status:200,headers:{...PRIVATE,'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${record.reference}-Pecasa-design-pack.pdf"`,'Content-Length':String(bytes.length)}});
 }catch(error){return fail(error);}};
}
