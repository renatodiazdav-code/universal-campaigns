import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { openRelayDatabase } from '../src/infrastructure/database.mjs';
import { createConnectionStore } from '../src/application/connection-store.mjs';
import { createShopifyConnectionService } from '../src/application/shopify-connection.mjs';
const time=1800000000000;
const fresh={access_token:'new-private-access',refresh_token:'new-private-refresh',scope:'read_products',expires_in:3600,refresh_token_expires_in:7776000};
const expired={shop:'luvixy.myshopify.com',accessToken:'old-private-access',refreshToken:'old-private-refresh',expiresAt:time+30000,refreshExpiresAt:time+7776000000,scope:'read_products',status:'CONNECTED'};
function setup(fetchImpl){
 const db=openRelayDatabase(':memory:');
 db.prepare('INSERT INTO users VALUES (?,?,?,?,?)').run('juan','juan@example.com','Juan','test-only','2026-10-12');
 const store=createConnectionStore({db,encryptionKey:randomBytes(32)});
 const service=createShopifyConnectionService({db,store,fetchImpl,now:()=>time,clientId:'app',clientSecret:'test-secret',developmentShop:'luvixy'});
 return {db,store,service};
}

test('expiring offline tokens refresh before use and concurrent calls share one rotation',async()=>{
 let calls=0;
 const {db,store,service}=setup(async(url,options)=>{
  calls++;assert.equal(options.body.get('grant_type'),'refresh_token');assert.equal(options.body.get('refresh_token'),'old-private-refresh');return Response.json(fresh);
 });
 try{
  await store.forUser('juan').save('shopify',expired);
  const results=await Promise.all([service.get('juan'),service.get('juan'),service.get('juan')]);
  assert.equal(calls,1);assert.ok(results.every(value=>value.accessToken==='new-private-access'));
  assert.equal((await store.forUser('juan').get('shopify')).refreshToken,'new-private-refresh');
  assert.equal((await service.get('juan')).accessToken,'new-private-access');assert.equal(calls,1);
 }finally{db.close();}
});

test('a temporary refresh failure preserves the old connection for a later retry',async()=>{
 const {db,store,service}=setup(async()=>new Response('upstream unavailable',{status:503}));
 try{
  await store.forUser('juan').save('shopify',expired);
  await assert.rejects(service.get('juan'),error=>error.code==='SHOPIFY_UNAVAILABLE');
  assert.equal((await store.forUser('juan').get('shopify')).refreshToken,'old-private-refresh');
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM connection_refresh_locks').get().count,0);
 }finally{db.close();}
});

test('revoked or expired refresh tokens require reauthorization and remove unusable credentials',async()=>{
 for(const expiredRefresh of [false,true]){
  const {db,store,service}=setup(async()=>new Response('revoked',{status:401}));
  try{
   await store.forUser('juan').save('shopify',{...expired,refreshExpiresAt:expiredRefresh?time-1:expired.refreshExpiresAt});
   await assert.rejects(service.get('juan'),error=>error.code==='REAUTHORIZE');
   const value=await store.forUser('juan').get('shopify');
   assert.equal(value.status,'REAUTHORIZE_REQUIRED');assert.equal(value.accessToken,null);assert.equal(value.refreshToken,null);
  }finally{db.close();}
 }
});

test('refresh completion cannot resurrect a connection disconnected while the request was running',async()=>{
 let resolve;
 const response=new Promise(r=>resolve=r);
 const {db,store,service}=setup(async()=>response);
 try{
  await store.forUser('juan').save('shopify',expired);
  const pending=service.get('juan');
  await new Promise(r=>setImmediate(r));
  await store.forUser('juan').delete('shopify');resolve(Response.json(fresh));
  await assert.rejects(pending,error=>error.code==='NOT_CONNECTED');
  assert.equal(await store.forUser('juan').get('shopify'),null);
 }finally{db.close();}
});

test('a new authorization wins over an older refresh or token failure',async()=>{
 let resolve;
 const response=new Promise(r=>resolve=r);
 const {db,store,service}=setup(async()=>response);
 try{
  await store.forUser('juan').save('shopify',expired);
  const pending=service.get('juan');await new Promise(r=>setImmediate(r));
  await store.forUser('juan').save('shopify',{...expired,accessToken:'new-authorization',expiresAt:time+3600000});
  resolve(Response.json(fresh));assert.equal((await pending).accessToken,'new-authorization');
  await service.invalidate('juan','old-private-access');
  assert.equal((await store.forUser('juan').get('shopify')).accessToken,'new-authorization');
 }finally{db.close();}
});

test('legacy non-expiring development connections still work without a refresh request',async()=>{
 let calls=0;const {db,store,service}=setup(async()=>{calls++;throw new Error('Should not fetch');});
 try{
  await store.forUser('juan').save('shopify',{shop:'luvixy',accessToken:'legacy',source:'DEVELOPMENT_IMPORT'});
  assert.equal((await service.get('juan')).accessToken,'legacy');assert.equal(calls,0);
 }finally{db.close();}
});

test('the configured development store obtains a new client-credentials token before expiry',async()=>{
 let calls=0;const {db,store,service}=setup(async(url,options)=>{
  calls++;assert.equal(url,'https://luvixy.myshopify.com/admin/oauth/access_token');assert.equal(options.body.get('grant_type'),'client_credentials');assert.equal(options.body.get('client_secret'),'test-secret');
  return Response.json({access_token:'new-development-token',expires_in:86400});
 });
 try{
  await store.forUser('juan').save('shopify',{shop:'luvixy.myshopify.com',accessToken:'old-development-token',expiresAt:time+30000,source:'DEVELOPMENT',status:'CONNECTED'});
  const connection=await service.get('juan');
  assert.equal(calls,1);assert.equal(connection.accessToken,'new-development-token');assert.equal(connection.source,'DEVELOPMENT');assert.equal(connection.expiresAt,time+86400000);
 }finally{db.close();}
});

test('another refresh lease prevents simultaneous use of the same refresh token',async()=>{
 let calls=0;const {db,store,service}=setup(async()=>{calls++;return Response.json(fresh);});
 try{
  await store.forUser('juan').save('shopify',expired);
  db.prepare('INSERT INTO connection_refresh_locks VALUES (?,?,?,?)').run('juan','shopify','other-worker',time+45000);
  await assert.rejects(service.get('juan'),error=>error.code==='REFRESH_IN_PROGRESS');assert.equal(calls,0);
 }finally{db.close();}
});
