import {getStore} from '@netlify/blobs';
export function quoteStore(context={}){
 const deployment=context.deploy?.context||process.env.CONTEXT||'development';
 const suffix=deployment==='production'?'':`-${deployment.replace(/[^a-z0-9-]/gi,'').slice(0,30)}`;
 return getStore({name:'pecasa-private-quotes-v1'+suffix,consistency:'strong'});
}
