import 'dotenv/config';
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from './app.js';
import { db } from './db.js';

before(()=>{
 db.prepare('DELETE FROM assessments').run();
 db.prepare('DELETE FROM vitals').run();
 db.prepare('DELETE FROM patients').run();
});
test('health endpoint returns service status',async()=>{
 const r=await request(app).get('/api/health');
 assert.equal(r.status,200);assert.equal(r.body.status,'ok');
});
test('patient validation rejects invalid age',async()=>{
 const r=await request(app).post('/api/patients').send({fullName:'Test Patient',age:999,sex:'Other',village:'Demo'});
 assert.equal(r.status,400);
});
test('creates patient and stores screening with a risk flag',async()=>{
 const p=await request(app).post('/api/patients').send({fullName:'Test Patient',age:45,sex:'Other',village:'Demo Village'});
 assert.equal(p.status,201);assert.ok(p.body.id);
 const s=await request(app).post('/api/assessments').send({patientId:p.body.id,symptoms:'',spo2:90});
 assert.equal(s.status,201);assert.equal(s.body.riskLevel,'High');assert.ok(s.body.flags.length>0);
 const v=await request(app).get('/api/vitals');
 assert.ok(v.body.some((x:any)=>x.patientId===p.body.id&&x.spo2===90));
});
test('unknown patient screening returns 404',async()=>{
 const r=await request(app).post('/api/assessments').send({patientId:999999,spo2:98});
 assert.equal(r.status,404);
});
