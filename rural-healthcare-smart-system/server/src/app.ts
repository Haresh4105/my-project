import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { z } from 'zod';
import { db } from './db.js';
import { assessRisk } from './risk.js';

export const app=express();
const allowedOrigin=process.env.CLIENT_ORIGIN || 'http://localhost:5173';
app.use(cors({origin: allowedOrigin.split(',').map(s=>s.trim()), methods:['GET','POST','OPTIONS'], allowedHeaders:['Content-Type']}));
app.use(express.json({limit:'100kb'}));
app.use((req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');next();});

const patientSchema=z.object({
 fullName:z.string().trim().min(2).max(100),
 age:z.number().int().min(0).max(120),
 sex:z.enum(['Female','Male','Other','Prefer not to say']),
 village:z.string().trim().min(1).max(100),
 phone:z.string().trim().max(20).optional().nullable()
});
const screeningSchema=z.object({
 patientId:z.number().int().positive(),
 symptoms:z.string().max(1000).optional().default(''),
 systolic:z.number().min(50).max(260).optional(),
 diastolic:z.number().min(30).max(160).optional(),
 heartRate:z.number().min(20).max(250).optional(),
 temperature:z.number().min(30).max(45).optional(),
 spo2:z.number().min(50).max(100).optional(),
 notes:z.string().max(1000).optional().default('')
}).refine(d=>d.systolic===undefined||d.diastolic===undefined||d.systolic>d.diastolic,{message:'Systolic blood pressure must be higher than diastolic blood pressure',path:['systolic']});

function patientRow(row:any){return {id:row.id,fullName:row.full_name,age:row.age,sex:row.sex,village:row.village,phone:row.phone||undefined,createdAt:row.created_at};}
function assessmentRow(row:any){return {id:row.id,patientId:row.patient_id,patientName:row.patient_name,riskLevel:row.risk_level,summary:row.summary,flags:JSON.parse(row.flags_json||'[]'),createdAt:row.created_at};}
function vitalRow(row:any){return {id:row.id,patientId:row.patient_id,systolic:row.systolic??undefined,diastolic:row.diastolic??undefined,heartRate:row.heart_rate??undefined,temperature:row.temperature??undefined,spo2:row.spo2??undefined,notes:row.notes,recordedAt:row.recorded_at};}
function failValidation(res:Response,error:z.ZodError){return res.status(400).json({error:error.issues.map(i=>i.message).join('; '),details:error.issues.map(i=>({path:i.path,message:i.message}))});}

app.get('/api/health',(_req,res)=>res.json({status:'ok',service:'GramCare API',mode:'demo',timestamp:new Date().toISOString()}));
app.get('/api/dashboard',(_req,res)=>{
 const count=(table:string)=>((db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as {n:number}).n);
 const risk=(db.prepare("SELECT COUNT(*) AS n FROM assessments WHERE risk_level='High'").get() as {n:number}).n;
 res.json({patientCount:count('patients'),assessmentCount:count('assessments'),facilityCount:count('facilities'),vitalCount:count('vitals'),highRiskCount:risk});
});
app.get('/api/patients',(req,res)=>{
 const search=String(req.query.search||'').trim();
 const rows=db.prepare(`SELECT * FROM patients WHERE full_name LIKE @q OR village LIKE @q OR COALESCE(phone,'') LIKE @q ORDER BY id DESC LIMIT 500`).all({q:`%${search}%`});
 res.json(rows.map(patientRow));
});
app.post('/api/patients',(req,res)=>{
 const parsed=patientSchema.safeParse(req.body);if(!parsed.success)return failValidation(res,parsed.error);
 try{
  const result=db.prepare('INSERT INTO patients (full_name,age,sex,village,phone) VALUES (@fullName,@age,@sex,@village,@phone)').run({...parsed.data,phone:parsed.data.phone||null});
  const row=db.prepare('SELECT * FROM patients WHERE id=?').get(result.lastInsertRowid);
  res.status(201).json(patientRow(row));
 }catch{res.status(500).json({error:'Could not save patient. Please try again.'});}
});
app.get('/api/patients/:id',(req,res)=>{
 const id=Number(req.params.id);if(!Number.isSafeInteger(id)||id<1)return res.status(400).json({error:'Invalid patient ID'});
 const row:any=db.prepare('SELECT * FROM patients WHERE id=?').get(id);if(!row)return res.status(404).json({error:'Patient not found'});
 const observations=db.prepare('SELECT * FROM vitals WHERE patient_id=? ORDER BY id DESC LIMIT 100').all(id).map(vitalRow);
 const screenings=db.prepare('SELECT a.*,p.full_name AS patient_name FROM assessments a JOIN patients p ON p.id=a.patient_id WHERE a.patient_id=? ORDER BY a.id DESC LIMIT 100').all(id).map(assessmentRow);
 res.json({patient:patientRow(row),observations,assessments:screenings});
});
app.get('/api/assessments',(req,res)=>{
 const patientId=req.query.patientId?Number(req.query.patientId):undefined;
 if(patientId!==undefined&&(!Number.isSafeInteger(patientId)||patientId<1))return res.status(400).json({error:'Invalid patientId'});
 const rows=patientId?db.prepare('SELECT a.*,p.full_name AS patient_name FROM assessments a JOIN patients p ON p.id=a.patient_id WHERE a.patient_id=? ORDER BY a.id DESC LIMIT 500').all(patientId):db.prepare('SELECT a.*,p.full_name AS patient_name FROM assessments a JOIN patients p ON p.id=a.patient_id ORDER BY a.id DESC LIMIT 500').all();
 res.json(rows.map(assessmentRow));
});
app.post('/api/assessments',(req,res)=>{
 const parsed=screeningSchema.safeParse(req.body);if(!parsed.success)return failValidation(res,parsed.error);
 const input=parsed.data;const patient=db.prepare('SELECT id,age,full_name FROM patients WHERE id=?').get(input.patientId) as any;
 if(!patient)return res.status(404).json({error:'Patient not found. Register the patient before screening.'});
 const result=assessRisk({...input,age:patient.age});
 const tx=db.transaction(()=>{
  const assessment=db.prepare('INSERT INTO assessments (patient_id,symptoms,risk_level,summary,flags_json,notes) VALUES (?,?,?,?,?,?)').run(input.patientId,input.symptoms,result.riskLevel,result.summary,JSON.stringify(result.flags),input.notes);
  if([input.systolic,input.diastolic,input.heartRate,input.temperature,input.spo2].some(v=>v!==undefined)){
   db.prepare('INSERT INTO vitals (patient_id,systolic,diastolic,heart_rate,temperature,spo2,notes) VALUES (?,?,?,?,?,?,?)').run(input.patientId,input.systolic??null,input.diastolic??null,input.heartRate??null,input.temperature??null,input.spo2??null,input.notes);
  }
  return Number(assessment.lastInsertRowid);
 });
 try{
  const id=tx();res.status(201).json({id,patientId:input.patientId,patientName:patient.full_name,...result,createdAt:(db.prepare('SELECT created_at FROM assessments WHERE id=?').get(id) as any).created_at});
 }catch{res.status(500).json({error:'Could not save assessment. Please try again.'});}
});
app.get('/api/vitals',(req,res)=>{
 const patientId=req.query.patientId?Number(req.query.patientId):undefined;
 const rows=patientId?db.prepare('SELECT * FROM vitals WHERE patient_id=? ORDER BY id DESC LIMIT 500').all(patientId):db.prepare('SELECT * FROM vitals ORDER BY id DESC LIMIT 500').all();
 res.json(rows.map(vitalRow));
});
app.post('/api/vitals',(req,res)=>{
 const schema=z.object({patientId:z.number().int().positive(),systolic:z.number().min(50).max(260).optional(),diastolic:z.number().min(30).max(160).optional(),heartRate:z.number().min(20).max(250).optional(),temperature:z.number().min(30).max(45).optional(),spo2:z.number().min(50).max(100).optional(),notes:z.string().max(1000).optional().default('')}).refine(d=>[d.systolic,d.diastolic,d.heartRate,d.temperature,d.spo2].some(v=>v!==undefined),{message:'Enter at least one vital measurement'});
 const parsed=schema.safeParse(req.body);if(!parsed.success)return failValidation(res,parsed.error);
 if(!db.prepare('SELECT id FROM patients WHERE id=?').get(parsed.data.patientId))return res.status(404).json({error:'Patient not found'});
 const d=parsed.data;const r=db.prepare('INSERT INTO vitals (patient_id,systolic,diastolic,heart_rate,temperature,spo2,notes) VALUES (?,?,?,?,?,?,?)').run(d.patientId,d.systolic??null,d.diastolic??null,d.heartRate??null,d.temperature??null,d.spo2??null,d.notes);
 res.status(201).json(vitalRow(db.prepare('SELECT * FROM vitals WHERE id=?').get(r.lastInsertRowid)));
});
app.get('/api/facilities',(req,res)=>{
 const search=String(req.query.search||'').trim().toLowerCase(), service=String(req.query.service||'').trim();
 const rows=db.prepare('SELECT * FROM facilities ORDER BY name').all() as any[];
 res.json(rows.map(r=>({...r,services:JSON.parse(r.services_json)})).filter(r=>(!search||`${r.name} ${r.village} ${r.address} ${r.services.join(' ')}`.toLowerCase().includes(search))&&(!service||r.services.includes(service))).map(({services_json,...r})=>r));
});
app.get('/api/articles',(_req,res)=>{
 const rows=db.prepare('SELECT * FROM articles ORDER BY id').all() as any[];
 res.json(rows.map(r=>({id:r.id,title:r.title,category:r.category,summary:r.summary,readTime:r.read_time})));
});
app.use('/api/*',(req,res)=>res.status(404).json({error:`API route not found: ${req.method} ${req.path}`}));
app.use((err:Error,_req:Request,res:Response,_next:NextFunction)=>{console.error(err.message);res.status(500).json({error:'Unexpected server error. Please try again.'});});
