import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, stat, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec=promisify(execFile);
const script=new URL('../scripts/setup-local-auth.mjs',import.meta.url).pathname;
function env(){const value={...process.env};delete value.RELAY_ENCRYPTION_KEY;delete value.APP_URL;return value;}

test('local setup fills an empty key, preserves it on repeated runs and never prints it',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'relay-local-'));
 try{
  await writeFile(join(directory,'.env.local'),'RELAY_ENCRYPTION_KEY=\nAPP_URL=\n');
  const first=await exec(process.execPath,[script],{cwd:directory,env:env()});
  const content=await readFile(join(directory,'.env.local'),'utf8');
  const key=content.match(/^RELAY_ENCRYPTION_KEY=(.+)$/m)[1];
  assert.equal(Buffer.from(key,'base64').length,32);
  assert.match(content,/APP_URL=http:\/\/localhost:3000/);
  assert.equal(first.stdout.includes(key),false);
  await exec(process.execPath,[script],{cwd:directory,env:env()});
  assert.equal(await readFile(join(directory,'.env.local'),'utf8'),content);
  assert.equal((await stat(join(directory,'.env.local'))).mode & 0o777,0o600);
 }finally{await rm(directory,{recursive:true,force:true});}
});

test('local setup refuses to rotate an invalid nonempty existing key',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'relay-local-'));
 try{
  const content='RELAY_ENCRYPTION_KEY=do-not-replace-this\nAPP_URL=http://localhost:3000\n';
  await writeFile(join(directory,'.env.local'),content);
  await assert.rejects(exec(process.execPath,[script],{cwd:directory,env:env()}));
  assert.equal(await readFile(join(directory,'.env.local'),'utf8'),content);
 }finally{await rm(directory,{recursive:true,force:true});}
});
