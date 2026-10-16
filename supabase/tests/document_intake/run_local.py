"""Disposable local PostgreSQL only. Keeps evidence beneath the ZMR root."""
import concurrent.futures, json, os, pathlib, subprocess, tempfile, uuid
repo=pathlib.Path(__file__).resolve().parents[3]
root=next(p for p in repo.parents if p.name=='ZMR-Real-Estate')
work=pathlib.Path(tempfile.mkdtemp(prefix='document-intake-db-',dir=root/'administration'))
pg=pathlib.Path('/opt/homebrew/opt/postgresql@17/bin'); port='55488'
base=[str(pg/'psql'),'-X','-q','-t','-A','-h','127.0.0.1','-p',port,'-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose']
env={k:v for k,v in os.environ.items() if not k.startswith('PG')}
env.update({'LANG':'C','LC_ALL':'C'})
results=[]
def run(cmd,**kw): return subprocess.run(cmd,text=True,capture_output=True,env=env,**kw)
def sql(s,ok=True):
 r=run(base+['-c',s])
 if ok and r.returncode: raise RuntimeError(r.stderr)
 return r.stdout.strip() if ok else r

def check(name,actual,expected):
 results.append({'check':name,'passed':actual==expected})
 if actual!=expected: raise AssertionError(f'{name}: {actual!r} != {expected!r}')

def uid(): return str(uuid.uuid4())
started=False
try:
 r=run([str(pg/'initdb'),'-D',str(work/'data'),'-U','postgres','--auth=trust']); assert r.returncode==0,r.stderr
 r=run([str(pg/'pg_ctl'),'-D',str(work/'data'),'-o',f"-p {port} -k '' -c listen_addresses=127.0.0.1",'-l',str(work/'postgres.log'),'start']); assert r.returncode==0,r.stderr;started=True
 r=run(base+['-f',str(repo/'supabase/tests/entity_responsibility/bootstrap.sql')]);assert r.returncode==0,r.stderr
 sql("alter table storage.objects add column metadata jsonb;create unique index storage_name_unique on storage.objects(bucket_id,name)")
 for f in sorted((repo/'supabase/migrations').glob('*.sql')):
  r=run(base+['-f',str(f)]);assert r.returncode==0,f'{f.name}: {r.stderr}'
 a,b,u,v,p,q,unit,vendor=[uid() for _ in range(8)]
 sql(f"insert into auth.users values('{u}','fictional-a@example.test'),('{v}','fictional-b@example.test');insert into accounts(id,name) values('{a}','Test A'),('{b}','Test B');insert into account_members(account_id,user_id,role) values('{a}','{u}','owner'),('{b}','{v}','owner');insert into properties(id,account_id,address) values('{p}','{a}','TEST A'),('{q}','{b}','TEST B');insert into units(id,account_id,property_id,unit_label,status) values('{unit}','{b}','{q}','Test unit','Vacant');insert into vendors(id,account_id,name) values('{vendor}','{b}','Test vendor');")
 sql(f"insert into pick_list_options(account_id,list_name,value) values('{a}','document_type','ZMR-TEST-DOCS')")
 auth=f"set role authenticated;set request.jwt.claim.sub='{u}';"
 other=f"set role authenticated;set request.jwt.claim.sub='{v}';"
 blank={'title':'','propertyId':None,'unitId':None,'category':None,'documentDate':None,'notes':''}
 def quoted(value):return "'"+json.dumps(value).replace("'","''")+"'::jsonb"
 def reserve(req,details=blank,account=None):
  return f"select to_jsonb(reserve_document_intake('{account or a}','{req}','{'a'*64}','bill.pdf','application/pdf',100,{quoted(details)}))"
 req=uid();r=json.loads(sql(auth+reserve(req)));ident=r['id'];path=r['storage_path']
 check('file only reservation accepted',r['status'],'uploading')
 check('no destination guessed',r['details']['propertyId'],None)
 check('retry reservation is stable',json.loads(sql(auth+reserve(req)))['id'],ident)
 check('changed retry refused',sql(auth+reserve(req,{**blank,'title':'changed'}),False).returncode!=0,True)
 check('account isolation RPC',sql(auth+reserve(uid(),account=b),False).returncode!=0,True)
 check('account isolation read',sql(other+'select count(*) from document_intakes'),'0')
 check('anonymous refused',sql('set role anon;'+reserve(uid()),False).returncode!=0,True)
 check('direct writes refused',sql(auth+f"update document_intakes set status='needs_review' where id='{ident}'",False).returncode!=0,True)
 check('private validator refused',sql(auth+f"select check_document_intake_details('{a}',{quoted(blank)},false)",False).returncode!=0,True)
 check('other property refused',sql(auth+reserve(uid(),{**blank,'propertyId':q}),False).returncode!=0,True)
 check('other vendor refused',sql(auth+reserve(uid(),{**blank,'vendorId':vendor}),False).returncode!=0,True)
 check('foreign unit refused',sql(auth+reserve(uid(),{**blank,'propertyId':p,'unitId':unit}),False).returncode!=0,True)
 check('unrecognized category refused',sql(auth+reserve(uid(),{**blank,'category':'unknown'}),False).returncode!=0,True)
 check('unknown accounting field refused',sql(auth+reserve(uid(),{**blank,'amount':100}),False).returncode!=0,True)
 check('invalid date refused',sql(auth+reserve(uid(),{**blank,'documentDate':'2026-02-30'}),False).returncode!=0,True)
 finish=f"select to_jsonb(finish_document_intake('{a}','{ident}'))"
 check('cannot finish missing bytes',sql(auth+finish,False).returncode!=0,True)
 sql(f"insert into storage.objects(bucket_id,name,metadata) values('documents','{path}',jsonb_build_object('size',99,'mimetype','application/pdf'))")
 check('cannot finish wrong size',sql(auth+finish,False).returncode!=0,True)
 sql(f"update storage.objects set metadata=jsonb_build_object('size',100,'mimetype','application/pdf') where name='{path}'")
 row=json.loads(sql(auth+finish));check('capture complete',row['status'],'needs_review')
 check('capture creates no document prematurely',sql('select count(*) from documents'),'0')
 check('finish retries harmless',json.loads(sql(auth+finish))['revision'],row['revision'])
 dest={**blank,'propertyId':p,'category':'ZMR-TEST-DOCS','notes':'Tenant responsible, informational copy only.'}
 def review(details=dest,rev=2,filing='true'):
  return f"select to_jsonb(review_document_intake('{a}','{ident}',{rev},{quoted(details)},{filing}))"
 check('filing needs destination',sql(auth+review(blank),False).returncode!=0,True)
 check('null revision refused',sql(auth+review(rev='null'),False).returncode!=0,True)
 check('stale revision refused',sql(auth+review(rev=1),False).returncode!=0,True)
 before=sql("select jsonb_build_array((select count(*) from financial_transactions),(select count(*) from mortgage_payments),(select count(*) from mortgage_balance_effects),(select count(*) from action_items))")
 def race(_):return json.loads(sql(auth+review()))['document_id']
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:ids=list(pool.map(race,range(2)))
 check('parallel filing creates one document',len(set(ids)),1);doc=ids[0]
 check('one canonical document',sql('select count(*) from documents'),'1')
 check('path unchanged',sql(f"select storage_path from documents where id='{doc}'"),path)
 check('no accounting or action writes',sql("select jsonb_build_array((select count(*) from financial_transactions),(select count(*) from mortgage_payments),(select count(*) from mortgage_balance_effects),(select count(*) from action_items))"),before)
 check('one event per state',sql(f"select string_agg(event,',' order by recorded_at) from document_intake_events where intake_id='{ident}'"),'reserved,captured,filed')
 check('different retry destination refused',sql(auth+review({**dest,'notes':'different'}),False).returncode!=0,True)
 check('canonical deletion refused',sql(auth+f"delete from documents where id='{doc}'",False).returncode!=0,True)
 check('canonical move refused',sql(auth+f"update documents set property_id='{q}' where id='{doc}'",False).returncode!=0,True)
 sql(auth+f"update documents set label='Renamed' where id='{doc}'")
 check('canonical rename preserved',sql(f"select label from documents where id='{doc}'"),'Renamed')
 sql('grant select,insert,update,delete on storage.objects to authenticated')
 sql(auth+f"delete from storage.objects where name='{path}'")
 check('original not deleted',sql(f"select count(*) from storage.objects where name='{path}'"),'1')
 sql(auth+f"update storage.objects set name='replaced' where name='{path}'")
 check('original not replaced',sql(f"select count(*) from storage.objects where name='{path}'"),'1')
 check('unreserved upload refused',sql(auth+f"insert into storage.objects(bucket_id,name) values('documents','{a}/capture-intake/unreserved')",False).returncode!=0,True)
 check('other account cannot read canonical file',sql(other+f"select count(*) from documents where id='{doc}'"),'0')
 # Save-for-later survives a later session, creates no canonical row, and uses
 # real optimistic concurrency rather than a client-only busy flag.
 draft=json.loads(sql(auth+reserve(uid())));draft_id=draft['id'];draft_path=draft['storage_path']
 sql(f"insert into storage.objects(bucket_id,name,metadata) values('documents','{draft_path}',jsonb_build_object('size',100,'mimetype','application/pdf'))")
 sql(auth+f"select finish_document_intake('{a}','{draft_id}')")
 def save_draft(note):
  d={**blank,'notes':note,'responsibility':'tenant','dueDate':'2026-11-15'}
  return f"select to_jsonb(review_document_intake('{a}','{draft_id}',2,{quoted(d)},false))"
 def race_draft(n):return sql(auth+save_draft(n),False).returncode
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:outcomes=list(pool.map(race_draft,['note one','note two']))
 check('two draft edits cannot overwrite each other',outcomes.count(0),1)
 check('saved draft remains pending',sql(auth+f"select status from document_intakes where id='{draft_id}'"),'needs_review')
 check('saved draft creates no document',sql('select count(*) from documents'),'1')
 check('responsibility retained',sql(auth+f"select details->>'responsibility' from document_intakes where id='{draft_id}'"),'tenant')
 check('due date retained',sql(auth+f"select details->>'dueDate' from document_intakes where id='{draft_id}'"),'2026-11-15')
 legacy=uid();sql(f"insert into documents(id,account_id,property_id,category,label,storage_path,file_size) values('{legacy}','{a}','{p}','Other','Legacy document','{a}/unrelated',1)")
 sql(auth+f"update documents set label='Legacy renamed' where id='{legacy}'")
 check('legacy rename unaffected',sql(f"select label from documents where id='{legacy}'"),'Legacy renamed')
 sql(auth+f"delete from documents where id='{legacy}'")
 check('legacy delete behavior unaffected',sql(f"select count(*) from documents where id='{legacy}'"),'0')
 check('forged audit writes refused',sql(auth+f"insert into document_intake_events(account_id,intake_id,actor_id,event) values('{a}','{ident}','{u}','filed')",False).returncode!=0,True)
 print(f'{len(results)}/{len(results)} local database checks passed')
finally:
 (work/'results.json').write_text(json.dumps(results,indent=2))
 if started:run([str(pg/'pg_ctl'),'-D',str(work/'data'),'stop','-m','fast'])
 print('Evidence:',work)
