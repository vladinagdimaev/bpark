import assert from 'node:assert/strict';
process.env.DATABASE_URL='postgresql://test:test@127.0.0.1:1/test';
process.env.NEON_AUTH_JWKS_URL='https://example.invalid/.well-known/jwks.json';
process.env.NEON_AUTH_BASE_URL='https://example.invalid/auth';
process.env.AWS_REGION='eu-central-1';process.env.AWS_ENDPOINT_URL_S3='https://example.invalid';
const {default:app}=await import('./build/index.mjs');
for(const [method,path] of [['GET','/api/reports'],['POST','/api/reports'],['GET','/api/me'],['PUT','/api/reports/00000000-0000-0000-0000-000000000000'],['POST','/api/reports/00000000-0000-0000-0000-000000000000/photos?area=1']]){
 const response=await app.fetch(new Request('https://admin.invalid'+path,{method}));assert.equal(response.status,401,`${method} ${path}`);
}
const res=await app.fetch(new Request('https://admin.invalid/'));assert.equal(res.status,200);assert.match(await res.text(),/ניהול דו״חות סיור/);
console.log('Unauthenticated report routes reject access; sign-in page renders.');
