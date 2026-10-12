import test from 'node:test';
import assert from 'node:assert/strict';
import { openRelayDatabase } from '../src/infrastructure/database.mjs';
import { createAuthService, hashToken, SESSION_SECONDS } from '../src/application/auth-service.mjs';
import { assertSameOrigin, sessionCookie, readSessionToken, readAuthInput } from '../src/application/auth-http.mjs';

const account=(email='juan@example.com')=>({email,name:'Juan',password:'a-long-test-password'});

test('registration normalizes identity and stores password and session hashes, never their originals',async()=>{
 const db=openRelayDatabase(':memory:');
 try{
  const auth=createAuthService({db});
  const {user,token}=await auth.register(account(' JUAN@example.com '));
  assert.equal(user.email,'juan@example.com');
  assert.equal(user.password_hash,undefined);
  const row=db.prepare('SELECT * FROM users').get();
  assert.match(row.password_hash,/^scrypt:/);
  assert.equal(row.password_hash.includes('a-long-test-password'),false);
  assert.equal(db.prepare('SELECT token_hash FROM sessions').get().token_hash,hashToken(token));
  assert.equal(auth.authenticate(token).user.id,user.id);
  assert.equal(auth.authenticate('bad-token'),null);
  await assert.rejects(auth.register(account('juan@example.com')),error=>error.status===409);
 }finally{db.close();}
});

test('login issues fresh sessions, rejects invalid credentials, expires sessions and revokes logout',async()=>{
 const db=openRelayDatabase(':memory:');let time=100000;
 try{
  const auth=createAuthService({db,now:()=>time});
  const first=await auth.register(account());
  await assert.rejects(auth.login({...account(),password:'wrong-password'}),error=>error.status===401);
  await assert.rejects(auth.login(account('unknown@example.com')),error=>error.status===401);
  const second=await auth.login(account());
  assert.notEqual(first.token,second.token);
  auth.logout(first.token);
  assert.equal(auth.authenticate(first.token),null);
  assert.ok(auth.authenticate(second.token));
  time+=SESSION_SECONDS*1000+1;
  assert.equal(auth.authenticate(second.token),null);
 }finally{db.close();}
});

test('OAuth state is single-use and tied to the same user and browser session',async()=>{
 const db=openRelayDatabase(':memory:');
 try{
  const auth=createAuthService({db});
  const juan=await auth.register(account());
  const jose=await auth.register(account('jose@example.com'));
  const juanSession=auth.authenticate(juan.token);
  const joseSession=auth.authenticate(jose.token);
  const state=auth.issueOAuthState(juan.user.id,juanSession.sessionHash);
  assert.equal(auth.consumeOAuthState(state,jose.user.id,joseSession.sessionHash),false);
  assert.equal(auth.consumeOAuthState(state,juan.user.id,joseSession.sessionHash),false);
  assert.equal(auth.consumeOAuthState(state,juan.user.id,juanSession.sessionHash),true);
  assert.equal(auth.consumeOAuthState(state,juan.user.id,juanSession.sessionHash),false);
  const cancelled=auth.issueOAuthState(juan.user.id,juanSession.sessionHash);
  auth.logout(juan.token);
  assert.equal(auth.consumeOAuthState(cancelled,juan.user.id,juanSession.sessionHash),false);
 }finally{db.close();}
});

test('invalid registration and repeated login attempts are rejected',async()=>{
 const db=openRelayDatabase(':memory:');
 try{
  const auth=createAuthService({db,now:()=>100000});
  await assert.rejects(auth.register({...account(),password:'short'}),/12 and 128/);
  await assert.rejects(auth.register({...account(),email:'invalid'}),/valid email/);
  db.prepare('INSERT INTO auth_limits VALUES (?,10,?)').run(`login:${hashToken('juan@example.com')}`,200000);
  await assert.rejects(auth.login(account()),error=>error.status===429);
 }finally{db.close();}
});

test('mutations require the same origin and session cookies are HttpOnly, SameSite and secure on HTTPS',()=>{
 const origin='http://localhost:3000';
 assert.doesNotThrow(()=>assertSameOrigin(new Request(`${origin}/api/test`,{method:'POST',headers:{origin}})));
 assert.throws(()=>assertSameOrigin(new Request(`${origin}/api/test`,{method:'POST',headers:{origin:'https://attacker.example'}})),error=>error.status===403);
 assert.throws(()=>assertSameOrigin(new Request(`${origin}/api/test`,{method:'POST'})),error=>error.status===403);
 const request=new Request('https://relay.example/api/auth/login');
 const cookie=sessionCookie('test',request);
 assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Lax/);assert.match(cookie,/Secure/);
 assert.match(sessionCookie('',request,{clear:true}),/Max-Age=0/);
 assert.equal(readSessionToken(new Request(origin,{headers:{cookie:'other=1; relay_session=token; next=2'}})),'token');
});

test('account JSON rejects oversized, malformed and non-object input',async()=>{
 await assert.rejects(readAuthInput(new Request('http://localhost:3000',{method:'POST',body:'x'.repeat(5000)})),error=>error.status===413);
 await assert.rejects(readAuthInput(new Request('http://localhost:3000',{method:'POST',body:'[]'})),error=>error.status===400);
 await assert.rejects(readAuthInput(new Request('http://localhost:3000',{method:'POST',body:'invalid json'})),error=>error.status===400);
});
