import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { openRelayDatabase } from '../src/infrastructure/database.mjs';
import { createConnectionStore } from '../src/application/connection-store.mjs';

function setup(){
 const db=openRelayDatabase(':memory:');
 for(const id of ['juan','jose'])db.prepare('INSERT INTO users VALUES (?,?,?,?,?)').run(id,`${id}@example.com`,id,'test-only','2026-10-12');
 return {db,key:randomBytes(32)};
}

test('connections are encrypted and isolated by owner and provider',async()=>{
 const {db,key}=setup();
 try{
  const store=createConnectionStore({db,encryptionKey:key});
  await store.forUser('juan').save('meta',{accessToken:'juan-private-token'});
  assert.equal(await store.forUser('jose').get('meta'),null);
  assert.equal(await store.forUser('juan').get('tiktok'),null);
  assert.equal((await store.forUser('juan').get('meta')).accessToken,'juan-private-token');
  assert.equal(db.prepare('SELECT encrypted_payload FROM connections').get().encrypted_payload.includes('juan-private-token'),false);
  await store.forUser('jose').save('meta',{accessToken:'jose-private-token'});
  await store.forUser('juan').delete('meta');
  assert.equal((await store.forUser('jose').get('meta')).accessToken,'jose-private-token');
  assert.throws(()=>store.forUser('missing'),/user is required/);
 }finally{db.close();}
});

test('wrong encryption keys, tampering and moving encrypted data to another owner fail authentication',async()=>{
 const {db,key}=setup();
 try{
  const store=createConnectionStore({db,encryptionKey:key});
  await store.forUser('juan').save('meta',{accessToken:'private'});
  await assert.rejects(createConnectionStore({db,encryptionKey:randomBytes(32)}).forUser('juan').get('meta'));
  const payload=db.prepare('SELECT encrypted_payload FROM connections').get().encrypted_payload;
  db.prepare('INSERT INTO connections VALUES (?,?,?,?)').run('jose','meta',payload,'2026-10-12');
  await assert.rejects(store.forUser('jose').get('meta'));
  const envelope=JSON.parse(payload);envelope.tag=Buffer.alloc(16).toString('base64');
  db.prepare('UPDATE connections SET encrypted_payload=? WHERE user_id=?').run(JSON.stringify(envelope),'juan');
  await assert.rejects(store.forUser('juan').get('meta'));
 }finally{db.close();}
});

test('connections require a valid server encryption key and supported provider',async()=>{
 const {db}=setup();
 try{
  const store=createConnectionStore({db,encryptionKey:Buffer.alloc(10)});
  await assert.rejects(store.forUser('juan').save('meta',{accessToken:'private'}),/encryption key/);
  await assert.rejects(store.forUser('juan').get('unknown'),/Unsupported/);
 }finally{db.close();}
});
