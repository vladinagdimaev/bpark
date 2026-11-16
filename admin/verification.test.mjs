import {mock,test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const html=await readFile(new URL('./index.html',import.meta.url),'utf8');
const dom=new JSDOM(html,{url:'https://editor.example.invalid/'});
globalThis.document=dom.window.document;globalThis.window=dom.window;globalThis.confirm=()=>true;
let sent=[],verified=[],fail=false;
const auth={token:async()=>({error:{message:'signed out'}}),emailOtp:{sendVerificationOtp:async input=>{sent.push(input);return fail?{error:{message:'rate limited'}}:{}},verifyEmail:async input=>{verified.push(input);return {}}},signIn:{email:async()=>({})},signUp:{email:async()=>({})},signOut:async()=>{}};
mock.module('@neon/auth',{exports:{createAuthClient:()=>auth}});
globalThis.fetch=async url=>{if(String(url)==='/config')return Response.json({authUrl:'https://auth.example.invalid'});throw new Error('Unexpected request')};
await import('./client.js');
async function until(fn){for(let i=0;i<100;i++){if(fn())return;await new Promise(resolve=>setImmediate(resolve))}throw new Error('UI did not reach expected state')}
test('existing account can request and verify a fresh code without a password',async()=>{
 await until(()=>document.querySelector('#message').textContent.includes('להתחבר'));
 document.querySelector('[name=email]').value='test@example.invalid';
 document.querySelector('#resend-verification').click();
 await until(()=>sent.length===1 && !document.querySelector('#verify-form').hidden);
 assert.deepEqual(sent[0],{email:'test@example.invalid',type:'email-verification'});
 document.querySelector('[name=otp]').value='123456';
 document.querySelector('#verify-form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
 await until(()=>verified.length===1 && document.querySelector('#verify-form').hidden);
 assert.deepEqual(verified[0],{email:'test@example.invalid',otp:'123456'});
 fail=true;document.querySelector('#resend-verification').click();await until(()=>sent.length===2 && document.querySelector('#message').textContent.includes('לא ניתן לשלוח'));
 assert.equal(document.querySelector('#resend-verification').disabled,false);
});
