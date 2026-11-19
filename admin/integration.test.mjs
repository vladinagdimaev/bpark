import {mock,test} from 'node:test';
import assert from 'node:assert/strict';
process.env.DATABASE_URL='postgres://unused';process.env.NEON_AUTH_JWKS_URL='https://auth.invalid/jwks';process.env.NEON_AUTH_BASE_URL='https://auth.invalid/auth';process.env.AWS_REGION='eu-central-1';process.env.AWS_ENDPOINT_URL_S3='https://storage.invalid';
const reportId='00000000-0000-4000-8000-000000000001';let report={id:reportId,title:'First',visit_at:new Date(),status:'draft',version:0}, approvals=new Set(), observations=[],uploaded=[];
const users={vol:{auth_user_id:'vol',display_name:'Volunteer',role:'volunteer'},coord:{auth_user_id:'coord',display_name:'Coordinator',role:'coordinator'}};
async function query(sql,args=[]){
 if(sql==='BEGIN'||sql==='COMMIT'||sql==='ROLLBACK')return {rows:[],rowCount:0};
 if(sql.startsWith('SELECT auth_user_id')){const u=users[args[0]];return {rows:u?[u]:[],rowCount:u?1:0}}
 if(sql.startsWith('SELECT * FROM reports WHERE'))return {rows:args[0]===reportId?[{...report}]:[],rowCount:args[0]===reportId?1:0};
 if(sql.startsWith('UPDATE reports SET title=')){if(report.status!=='draft'||report.version!==args[6])return {rows:[],rowCount:0};report.version++;report.title=args[0];return {rows:[{id:reportId,version:report.version}],rowCount:1}}
 if(sql.startsWith('INSERT INTO area_observations')){observations.push(args[1]);return {rows:[],rowCount:1}}
 if(sql.startsWith('INSERT INTO report_photos'))return {rows:[{id:'00000000-0000-4000-8000-000000000003',area_id:args[1],caption:args[3]}],rowCount:1};
 if(sql.startsWith('INSERT INTO report_notes'))return {rows:[],rowCount:1};
 if(sql.startsWith("UPDATE reports SET status='in_review'")){if(report.status!=='draft'||new Set(observations).size!==11)return {rows:[],rowCount:0};report.status='in_review';return {rows:[{id:reportId}],rowCount:1}}
 if(sql.startsWith('SELECT status FROM reports'))return {rows:[{status:report.status}],rowCount:1};
 if(sql.startsWith('INSERT INTO report_approvals')){approvals.add(args[1]);return {rows:[],rowCount:1}}
 if(sql.startsWith('SELECT count(*) FILTER'))return {rows:[{volunteers:+approvals.has('vol'),coordinators:+approvals.has('coord')}],rowCount:1};
 if(sql.startsWith("UPDATE reports SET status='approved'")){report.status='approved';return {rows:[],rowCount:1}}
 throw new Error('Unexpected query: '+sql);
}
class Pool{query(...a){return query(...a)}async connect(){return {query,release(){}}}}
mock.module('pg',{defaultExport:{Pool}});
mock.module('@neon/functions',{namedExports:{attachDatabasePool(){}}});
mock.module('jose',{namedExports:{createRemoteJWKSet:()=>({}),jwtVerify:async(token)=>({payload:{sub:token}})}});
class S3Client{async send(c){uploaded.push(c);return {}}}class PutObjectCommand{constructor(args){this.args=args}}class GetObjectCommand{}class DeleteObjectCommand{}
mock.module('@aws-sdk/client-s3',{namedExports:{S3Client,PutObjectCommand,GetObjectCommand,DeleteObjectCommand}});
const {default:app}=await import('./server.mjs');
async function call(user,method,path,data){return app.fetch(new Request('https://test.invalid'+path,{method,headers:{Authorization:'Bearer '+user,...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})}))}
const draft={version:0,title:'Updated',visit_at:'2026-11-15T10:00:00Z',areas:Array.from({length:11},(_,i)=>({area_id:i+1,work_status:'not_checked'})),notes:{}};
test('draft save rejects stale editors and approval requires two people including coordinator',async()=>{
 let r=await call('vol','PUT','/api/reports/'+reportId,draft);assert.equal(r.status,200);assert.equal((await r.json()).version,1);
 r=await call('coord','PUT','/api/reports/'+reportId,draft);assert.equal(r.status,409,'stale edit must not overwrite');
 const form=new FormData();form.set('photo',new Blob([new Uint8Array([255,216,255,1,2,3])],{type:'image/jpeg'}),'test.jpg');form.set('caption','test photo');
 r=await app.fetch(new Request('https://test.invalid/api/reports/'+reportId+'/photos?area=1',{method:'POST',headers:{Authorization:'Bearer vol'},body:form}));assert.equal(r.status,201,'valid image accepted');assert.equal(uploaded.length,1);
 const bad=new FormData();bad.set('photo',new Blob(['not an image'],{type:'image/jpeg'}),'fake.jpg');
 r=await app.fetch(new Request('https://test.invalid/api/reports/'+reportId+'/photos?area=1',{method:'POST',headers:{Authorization:'Bearer vol'},body:bad}));assert.equal(r.status,400,'invalid image rejected');assert.equal(uploaded.length,1);

 r=await call('vol','POST','/api/reports/'+reportId+'/submit');assert.equal(r.status,200);
 r=await call('coord','POST','/api/reports/'+reportId+'/approve');assert.equal((await r.json()).status,'in_review');
 r=await call('coord','POST','/api/reports/'+reportId+'/approve');assert.equal((await r.json()).status,'in_review','duplicate vote does not count');
 r=await call('vol','POST','/api/reports/'+reportId+'/approve');assert.equal((await r.json()).status,'approved');
 r=await call('vol','POST','/api/reports/'+reportId+'/publish');assert.equal(r.status,403,'only coordinator publishes');
});
