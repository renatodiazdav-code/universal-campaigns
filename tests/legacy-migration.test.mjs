import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { openRelayDatabase } from '../src/infrastructure/database.mjs';
import { createConnectionStore } from '../src/application/connection-store.mjs';
import { createCampaignStore } from '../src/application/campaign-store.mjs';
const exec=promisify(execFile);
const script=new URL('../scripts/migrate-legacy-data.mjs',import.meta.url).pathname;

test('legacy import is explicit, owner-scoped, idempotent and preserves source files',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'relay-import-'));
 const path=join(directory,'relay.sqlite');const key=randomBytes(32);const db=openRelayDatabase(path);
 try{
  db.prepare('INSERT INTO users VALUES (?,?,?,?,?)').run('owner','owner@example.com','Owner','test-only','2026-10-12');
  db.prepare('INSERT INTO users VALUES (?,?,?,?,?)').run('other','other@example.com','Other','test-only','2026-10-12');
  await mkdir(join(directory,'data'));
  const meta=JSON.stringify({accessToken:'private-local-test-token',setup:{adAccount:{id:'act_test'}}});
  await writeFile(join(directory,'data','meta-connection.json'),meta);
  await writeFile(join(directory,'data','campaigns.json'),JSON.stringify([{id:'legacy-campaign',name:'Legacy',status:'PAUSED'}]));
  const env={...process.env,RELAY_DATABASE_PATH:path,RELAY_ENCRYPTION_KEY:key.toString('base64')};
  for(const name of ['SHOPIFY_SHOP','SHOPIFY_CLIENT_ID','SHOPIFY_CLIENT_SECRET'])delete env[name];
  await assert.rejects(exec(process.execPath,[script,'--email','missing@example.com'],{cwd:directory,env}));
  const result=await exec(process.execPath,[script,'--email','owner@example.com'],{cwd:directory,env});
  assert.equal(result.stdout.includes('private-local-test-token'),false);
  await exec(process.execPath,[script,'--email','owner@example.com'],{cwd:directory,env});
  const connections=createConnectionStore({db,encryptionKey:key});
  assert.equal((await connections.forUser('owner').get('meta')).accessToken,'private-local-test-token');
  assert.equal(await connections.forUser('other').get('meta'),null);
  const campaigns=createCampaignStore({db});
  assert.equal((await campaigns.forUser('owner').list()).length,1);
  assert.equal((await campaigns.forUser('other').list()).length,0);
  assert.equal(await readFile(join(directory,'data','meta-connection.json'),'utf8'),meta);
 }finally{db.close();await rm(directory,{recursive:true,force:true});}
});
