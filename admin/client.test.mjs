import {mock,test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const html=await readFile(new URL('./index.html',import.meta.url),'utf8');
const dom=new JSDOM(html,{url:'https://editor.example.invalid/'});
globalThis.document=dom.window.document;globalThis.window=dom.window;
globalThis.confirm=()=>true;
const reportId='00000000-0000-4000-8000-000000000001';
let saved;
const auth={token:async()=>({data:{token:'fake'}}),signIn:{email:async()=>({})},signUp:{email:async()=>({})},signOut:async()=>{}};
mock.module('@neon/auth',{exports:{createAuthClient:()=>auth}});
globalThis.fetch=async(url,opts={})=>{
 const path=String(url),method=opts.method||'GET';
 if(path==='/config')return Response.json({authUrl:'https://auth.example.invalid'});
 if(path==='/api/me')return Response.json({display_name:'בדיקה'});
 if(path==='/api/reports'&&method==='GET')return Response.json([]);
 if(path==='/api/reports'&&method==='POST')return Response.json({id:reportId}, {status:201});
 if(path===`/api/reports/${reportId}`&&method==='GET')return Response.json({report:{title:'דו״ח בדיקה',visit_at:'2026-11-15T09:00:00Z',participants:'',summary:'',next_visit_focus:'',status:'draft',version:0},areas:[],notes:[],photos:[]});
 if(path===`/api/reports/${reportId}`&&method==='PUT'){saved=JSON.parse(opts.body);return Response.json({ok:true,version:1})}
 throw new Error('Unexpected request: '+method+' '+path);
};
await import('./client.js');
async function until(fn){for(let i=0;i<100;i++){if(fn())return;await new Promise(resolve=>setImmediate(resolve))}throw new Error('UI did not reach expected state')}
test('new draft loads all 11 areas and the form submits them',async()=>{
 await until(()=>!document.querySelector('#list-area').hidden);
 document.querySelector('#create').click();
 await until(()=>document.querySelectorAll('#areas fieldset').length===11);
 assert.equal(document.querySelector('#editor').hidden,false);
 assert.equal(document.querySelector('#list-area').hidden,true);
 document.querySelector('[name="area_1_observation"]').value='תיעוד לדוגמה';
 document.querySelector('#report-form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
 await until(()=>Boolean(saved));
 assert.equal(saved.areas.length,11);
 assert.equal(saved.areas[0].observation,'תיעוד לדוגמה');
 assert.equal(saved.version,0);
 assert.match(document.querySelector('#message').textContent,/נשמרה/);
});
