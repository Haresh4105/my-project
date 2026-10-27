import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const configured = process.env.DATABASE_PATH || './data/gramcare.sqlite';
const dbPath = path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured);
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS patients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK(age >= 0 AND age <= 120),
  sex TEXT NOT NULL,
  village TEXT NOT NULL,
  phone TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  symptoms TEXT NOT NULL DEFAULT '',
  risk_level TEXT NOT NULL,
  summary TEXT NOT NULL,
  flags_json TEXT NOT NULL DEFAULT '[]',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS vitals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  systolic REAL, diastolic REAL, heart_rate REAL, temperature REAL, spo2 REAL,
  notes TEXT NOT NULL DEFAULT '',
  recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS facilities (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  village TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  hours TEXT NOT NULL,
  services_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  summary TEXT NOT NULL,
  read_time TEXT NOT NULL
);
`);
const facilityCount = (db.prepare('SELECT COUNT(*) as n FROM facilities').get() as {n:number}).n;
if (!facilityCount) {
  const insert = db.prepare('INSERT INTO facilities (id,name,type,village,address,phone,hours,services_json) VALUES (@id,@name,@type,@village,@address,@phone,@hours,@services)');
  const seeds = [
    {id:1,name:'Primary Health Centre — Greenfield',type:'Primary Health Centre',village:'Greenfield',address:'Main Road',phone:'+91 00000 10001',hours:'Mon–Sat · 9 AM–4 PM',services:['Primary care','Maternal health','Vaccination']},
    {id:2,name:'Community Health Centre — Riverbend',type:'Community Health Centre',village:'Riverbend',address:'Market Street',phone:'+91 00000 10002',hours:'Daily · 24 hours (sample)',services:['Emergency care','Primary care','Laboratory']},
    {id:3,name:'Rural Wellness Clinic — Hillview',type:'Community Clinic',village:'Hillview',address:'Panchayat Road',phone:'+91 00000 10003',hours:'Mon–Fri · 10 AM–2 PM',services:['Primary care','Elder care','Health education']},
    {id:4,name:'Mother & Child Care Unit',type:'Specialty Clinic',village:'Greenfield',address:'Near Bus Stand',phone:'+91 00000 10004',hours:'Mon–Sat · 9 AM–3 PM',services:['Maternal health','Child health','Vaccination']},
    {id:5,name:'District Referral Hospital',type:'District Hospital',village:'Town Centre',address:'Hospital Road',phone:'+91 00000 10005',hours:'24 hours (sample)',services:['Emergency care','Laboratory','Primary care']}
  ];
  const tx=db.transaction(()=>seeds.forEach(f=>insert.run({...f,services:JSON.stringify(f.services)})));tx();
}
const articleCount = (db.prepare('SELECT COUNT(*) as n FROM articles').get() as {n:number}).n;
if (!articleCount) {
 const insert=db.prepare('INSERT INTO articles (id,title,category,summary,read_time) VALUES (@id,@title,@category,@summary,@read_time)');
 [
 {id:1,title:'Make clean water a daily habit',category:'Hygiene',summary:'Use safe drinking water, keep storage containers clean and covered, and wash hands with soap before preparing food and after using the toilet.',read_time:'3 min'},
 {id:2,title:'Know your blood pressure',category:'Heart health',summary:'High blood pressure may not cause obvious symptoms. Arrange regular checks and discuss readings with a qualified healthcare professional.',read_time:'4 min'},
 {id:3,title:'When fever needs attention',category:'Early care',summary:'Monitor symptoms and hydration. Seek prompt professional advice for persistent fever, worsening symptoms, or concerning signs in children and older adults.',read_time:'3 min'},
 {id:4,title:'Preventive care for every age',category:'Prevention',summary:'Keep recommended vaccinations up to date, attend appropriate health check-ups, and ask a health worker about screening suited to your age and history.',read_time:'5 min'},
 {id:5,title:'Support maternal wellbeing',category:'Maternal health',summary:'Antenatal check-ups help monitor parent and baby health. Consult trained maternity services early and seek urgent care for warning symptoms.',read_time:'4 min'},
 {id:6,title:'Care for older community members',category:'Elder care',summary:'Support regular check-ups, medication reviews by clinicians, safe movement, hydration, and a clear plan for reaching care when needed.',read_time:'4 min'}
 ].forEach(a=>insert.run({...a,read_time:a.read_time}));
}
