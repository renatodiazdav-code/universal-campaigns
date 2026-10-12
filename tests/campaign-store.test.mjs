import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openRelayDatabase } from '../src/infrastructure/database.mjs';
import { createCampaignStore } from '../src/application/campaign-store.mjs';

function seed(db) {
  for (const id of ['juan', 'jose']) db.prepare('INSERT INTO users VALUES (?, ?, ?, ?, ?)').run(id, `${id}@example.com`, id, 'test-only', '2026-10-12');
}

test('saves and lists Relay campaigns for the authenticated owner', async () => {
  const db=openRelayDatabase(':memory:'); seed(db);
  try {
    const store=createCampaignStore({db}).forUser('juan');
    const saved=await store.save({name:'Shoes',status:'PAUSED',userId:'jose',resolvedConfiguration:{meta:{conversionEvent:'PURCHASE'}}});
    assert.ok(saved.id);
    assert.equal(saved.userId,'juan');
    assert.equal((await store.list())[0].resolvedConfiguration.meta.conversionEvent,'PURCHASE');
    assert.deepEqual(await createCampaignStore({db}).forUser('jose').list(),[]);
    assert.equal(await createCampaignStore({db}).forUser('jose').getById(saved.id),null);
  } finally { db.close(); }
});

test('campaigns survive closing and reopening the database', async () => {
  const directory=await mkdtemp(join(tmpdir(),'relay-store-'));
  const filePath=join(directory,'relay.sqlite');
  let db=openRelayDatabase(filePath); seed(db);
  const saved=await createCampaignStore({db}).forUser('juan').save({name:'Persistent',status:'PAUSED'});
  db.close(); db=openRelayDatabase(filePath);
  try {
    assert.equal((await createCampaignStore({db}).forUser('juan').getById(saved.id)).name,'Persistent');
    assert.equal(await createCampaignStore({db}).forUser('jose').getById(saved.id),null);
  } finally { db.close(); await rm(directory,{recursive:true,force:true}); }
});

test('a user cannot overwrite another user’s campaign by submitting its ID', async () => {
  const db=openRelayDatabase(':memory:');seed(db);
  try {
    const store=createCampaignStore({db});
    const saved=await store.forUser('juan').save({name:'Juan campaign'});
    await assert.rejects(store.forUser('jose').save({id:saved.id,name:'Hijacked'}),/does not belong/);
    assert.equal((await store.forUser('juan').getById(saved.id)).name,'Juan campaign');
  } finally {db.close();}
});

test('concurrent saves preserve every campaign and require an existing owner', async () => {
  const db=openRelayDatabase(':memory:');seed(db);
  try {
    const store=createCampaignStore({db});
    assert.throws(()=>store.forUser(),/user is required/);
    assert.throws(()=>store.forUser('unknown'),/user is required/);
    await Promise.all(Array.from({length:20},(_,index)=>store.forUser('juan').save({name:`Campaign ${index}`})));
    assert.equal((await store.forUser('juan').list()).length,20);
  } finally {db.close();}
});
