import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomBytes } from 'node:crypto';
import { openRelayDatabase } from '../src/infrastructure/database.mjs';
import { createConnectionStore } from '../src/application/connection-store.mjs';
import { createShopifyConnectionService } from '../src/application/shopify-connection.mjs';
import { normalizeShopDomain, verifyShopifyCallback, normalizeOfflineToken } from '../src/connectors/shopify/client.mjs';

const secret='test-only-app-secret';
const time=1800000000000;
function signed(params){
 const data=new URLSearchParams(params);
 const ordered=new URLSearchParams([...data].sort(([a],[b])=>a.localeCompare(b)));
 data.set('hmac',createHmac('sha256',secret).update(ordered.toString().replace(/\+/g,'%20')).digest('hex'));
 return data;
}
function setup(fetchImpl){
 const db=openRelayDatabase(':memory:');
 for(const id of ['juan','jose']){
  db.prepare('INSERT INTO users VALUES (?,?,?,?,?)').run(id,`${id}@example.com`,id,'test-only','2026-10-12');
  db.prepare('INSERT INTO sessions VALUES (?,?,?,?)').run(`session-${id}`,id,time+604800000,time);
 }
 const store=createConnectionStore({db,encryptionKey:randomBytes(32)});
 const service=createShopifyConnectionService({db,store,fetchImpl,now:()=>time,clientId:'test-app',clientSecret:secret});
 return {db,store,service};
}
function callback(start,extra={}){
 const url=new URL(start.authorizationUrl);
 return signed({code:'code-123',shop:'luvixy.myshopify.com',state:url.searchParams.get('state'),timestamp:String(time/1000),host:'host+with=padding',...extra});
}
const tokenResponse={access_token:'private-access',refresh_token:'private-refresh',scope:'read_products',expires_in:3600,refresh_token_expires_in:7776000};

test('Shopify domains accept store names or canonical HTTPS addresses and reject arbitrary hosts',()=>{
 assert.equal(normalizeShopDomain('luvixy'),'luvixy.myshopify.com');
 assert.equal(normalizeShopDomain('https://LUVIXY.myshopify.com/'),'luvixy.myshopify.com');
 for(const domain of ['http://luvixy.myshopify.com','http://localhost','127.0.0.1','luvixy.myshopify.com.attacker.test','https://user@luvixy.myshopify.com','https://luvixy.myshopify.com:4433','https://luvixy.myshopify.com/admin','-invalid.myshopify.com'])assert.throws(()=>normalizeShopDomain(domain));
});

test('signed callbacks verify canonical escaping, timestamp and uniqueness, then reject tampering',()=>{
 const params=signed({shop:'luvixy.myshopify.com',code:'code',state:'state',timestamp:String(time/1000),host:'host+with=padding'});
 assert.equal(verifyShopifyCallback(params,secret,time),true);
 assert.equal(verifyShopifyCallback(params,secret,time+100000),false);
 params.set('code','tampered');assert.equal(verifyShopifyCallback(params,secret,time),false);
 params.append('state','duplicate');assert.equal(verifyShopifyCallback(params,secret,time),false);
 assert.equal(verifyShopifyCallback(new URLSearchParams('hmac=not-a-signature'),secret,time),false);
});

test('OAuth requests bind shop and session, request product scope only and exchange expiring offline tokens',async()=>{
 const calls=[];
 const {db,store,service}=setup(async(url,options)=>{
  calls.push({url,options});
  if(url.endsWith('/oauth/access_token'))return Response.json(tokenResponse);
  return Response.json({data:{shop:{id:'gid://shopify/Shop/1',name:'Luvixy',myshopifyDomain:'luvixy.myshopify.com',currencyCode:'PEN',primaryDomain:{url:'https://luvixy.test'}}}});
 });
 try{
  const start=service.begin({userId:'juan',sessionHash:'session-juan',shop:'luvixy',redirectUri:'https://relay.test/api/shopify/auth/callback'});
  const url=new URL(start.authorizationUrl);assert.equal(url.hostname,'luvixy.myshopify.com');assert.equal(url.searchParams.get('scope'),'read_products');
  assert.equal(url.searchParams.has('grant_options[]'),false);
  const result=await service.complete({userId:'juan',sessionHash:'session-juan',params:callback(start)});
  assert.equal(result.store.name,'Luvixy');assert.equal(result.accessToken,undefined);
  const saved=await store.forUser('juan').get('shopify');
  assert.equal(saved.accessToken,'private-access');assert.equal(saved.refreshToken,'private-refresh');
  assert.equal(saved.expiresAt,time+3600000);
  assert.equal(await store.forUser('jose').get('shopify'),null);
  assert.equal(db.prepare('SELECT encrypted_payload FROM connections').get().encrypted_payload.includes('private-access'),false);
  assert.equal(calls[0].options.body.get('expiring'),'1');assert.equal(calls[0].options.body.get('code'),'code-123');
  await assert.rejects(service.complete({userId:'juan',sessionHash:'session-juan',params:callback(start)}),error=>error.code==='INVALID_STATE');
  assert.equal(calls.length,2);
 }finally{db.close();}
});

test('callbacks from a different user, session or shop never exchange a code',async()=>{
 let calls=0;const {db,service}=setup(async()=>{calls++;throw new Error('Should not fetch');});
 try{
  const start=service.begin({userId:'juan',sessionHash:'session-juan',shop:'luvixy',redirectUri:'https://relay.test/callback'});
  await assert.rejects(service.complete({userId:'jose',sessionHash:'session-jose',params:callback(start)}),error=>error.code==='INVALID_STATE');
  await assert.rejects(service.complete({userId:'juan',sessionHash:'session-jose',params:callback(start)}),error=>error.code==='INVALID_SESSION');
  await assert.rejects(service.complete({userId:'juan',sessionHash:'session-juan',params:callback(start,{shop:'other.myshopify.com'})}),error=>error.code==='INVALID_STATE');
  const params=callback(start);params.set('code','tampered');
  await assert.rejects(service.complete({userId:'juan',sessionHash:'session-juan',params}),error=>error.code==='INVALID_SIGNATURE');
  assert.equal(calls,0);
 }finally{db.close();}
});

test('missing permissions or malformed token responses cannot become connected accounts',()=>{
 assert.throws(()=>normalizeOfflineToken({...tokenResponse,scope:'read_orders'},time),error=>error.code==='MISSING_SCOPE');
 assert.throws(()=>normalizeOfflineToken({...tokenResponse,refresh_token:null},time),error=>error.code==='INVALID_TOKEN_RESPONSE');
 assert.equal(normalizeOfflineToken({...tokenResponse,scope:'write_products'},time).scope,'write_products');
});

test('token exchange errors never disclose provider response bodies or secrets',async()=>{
 const {db,service}=setup(async()=>new Response('private-secret-upstream-details',{status:400}));
 try{
  const start=service.begin({userId:'juan',sessionHash:'session-juan',shop:'luvixy',redirectUri:'https://relay.test/callback'});
  await assert.rejects(service.complete({userId:'juan',sessionHash:'session-juan',params:callback(start)}),error=>error.code==='TOKEN_EXCHANGE_FAILED'&&!error.message.includes('private-secret'));
 }finally{db.close();}
});
