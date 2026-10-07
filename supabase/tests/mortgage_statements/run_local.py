"""Disposable local PostgreSQL only. Keeps evidence beneath the ZMR root."""
import concurrent.futures, json, os, pathlib, subprocess, tempfile, uuid
repo=pathlib.Path(__file__).resolve().parents[3]
root=next(p for p in repo.parents if p.name=='ZMR-Real-Estate')
work=pathlib.Path(tempfile.mkdtemp(prefix='statement-db-',dir=root/'administration/mortgage-reconciliation-contract'))
pg=pathlib.Path('/opt/homebrew/opt/postgresql@17/bin'); port='55489'
base=[str(pg/'psql'),'-X','-q','-t','-A','-h','127.0.0.1','-p',port,'-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1']
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
 r=run([str(pg/'pg_ctl'),'-D',str(work/'data'),'-o',f'-p {port} -k \'\' -c listen_addresses=127.0.0.1','-l',str(work/'postgres.log'),'start']); assert r.returncode==0,r.stderr;started=True
 assert (repo/'supabase/migrations/20261007100000_mortgage_statement_organization.sql').read_bytes()==(repo/'supabase/tests/mortgage_statements/candidate.sql').read_bytes(), 'SQL fixture differs from candidate migration'
 for f in [repo/'supabase/tests/entity_responsibility/bootstrap.sql',*sorted((repo/'supabase/migrations').glob('*.sql'))]:
  r=run(base+['-f',str(f)]); assert r.returncode==0,f'{f.name}: {r.stderr}'
 a,b,u,v,p,q,l,m=[uid() for _ in range(8)]
 sql(f"insert into auth.users values('{u}','fictional-a@example.test'),('{v}','fictional-b@example.test');insert into accounts(id,name) values('{a}','Test A'),('{b}','Test B');insert into account_members(account_id,user_id,role) values('{a}','{u}','owner'),('{b}','{v}','owner');insert into properties(id,account_id,address) values('{p}','{a}','TEST A'),('{q}','{b}','TEST B');")
 for acc,prop,loan in [(a,p,l),(b,q,m)]:
  sql(f"insert into mortgage_details(id,account_id,property_id,lender_name,original_loan_amount,current_balance,escrow_balance,interest_rate,monthly_payment,loan_start_date,term_years) values('{loan}','{acc}','{prop}','Fictional',10000,9000,50,5,100,'2025-01-01',30)")
 before=sql('select md5(string_agg(to_jsonb(t)::text,\'\' order by id)) from mortgage_details t')
 activity_before=sql('select (select count(*) from mortgage_payments)+(select count(*) from mortgage_history_payments)+(select count(*) from mortgage_balance_effects)')
 auth=f"set role authenticated;set request.jwt.claim.sub='{u}';"
 def reserve(req,digest='a'*64,prop=p,loan=l,name='Statement',account=a):
  return f"select to_jsonb(reserve_mortgage_statement('{account}','{prop}','{loan}','{req}','{digest}','original.pdf','{name}','2026-09-04',100))"
 req=uid(); r=json.loads(sql(auth+reserve(req))); upload=r['id']; path=r['storage_path']
 check('same request returns same reservation',json.loads(sql(auth+reserve(req)))['id'],upload)
 check('new request/same PDF returns existing reservation',json.loads(sql(auth+reserve(uid())))['id'],upload)
 check('changed request payload refused',sql(auth+reserve(req,name='changed'),False).returncode!=0,True)
 check('cross-property loan refused',sql(auth+reserve(uid(),prop=q),False).returncode!=0,True)
 check('cross-account refused',sql(auth+reserve(uid(),account=b,prop=q,loan=m),False).returncode!=0,True)
 check('anonymous refused',sql('set role anon;'+reserve(uid()),False).returncode!=0,True)
 check('direct metadata mutation refused',sql(auth+f"update mortgage_statement_uploads set display_name='tampered' where id='{upload}'",False).returncode!=0,True)
 check('finalize without object refused',sql(auth+f"select finalize_mortgage_statement('{a}','{upload}')",False).returncode!=0,True)
 sql(f"insert into storage.objects(bucket_id,name) values('documents','{path}')")
 finished=json.loads(sql(auth+f"select to_jsonb(finalize_mortgage_statement('{a}','{upload}'))"));doc=finished['document_id']
 check('repeat finalize returns same document',json.loads(sql(auth+f"select to_jsonb(finalize_mortgage_statement('{a}','{upload}'))"))['document_id'],doc)
 check('one canonical document',sql(f"select count(*) from documents where id='{doc}'"),'1')
 check('document includes exact loan link',sql(f"select mortgage_id::text from documents where id='{doc}'"),l)
 check('other account sees no upload',sql(f"set role authenticated;set request.jwt.claim.sub='{v}';select count(*) from mortgage_statement_uploads"),'0')
 check('linked document cannot be deleted',sql(auth+f"delete from documents where id='{doc}'",False).returncode!=0,True)
 check('linked identity cannot be changed',sql(auth+f"update documents set mortgage_id='{m}' where id='{doc}'",False).returncode!=0,True)
 sql(auth+f"update documents set label='Renamed' where id='{doc}'")
 check('canonical label can be renamed',sql(auth+f"select label from documents where id='{doc}'"),'Renamed')
 sql('grant select,insert,update,delete on storage.objects to authenticated')
 sql(auth+f"delete from storage.objects where name='{path}'")
 check('original storage deletion blocked by RLS',sql(f"select count(*) from storage.objects where name='{path}'"),'1')
 sql(auth+f"update storage.objects set name='changed' where name='{path}'")
 check('original storage replacement blocked by RLS',sql(f"select count(*) from storage.objects where name='{path}'"),'1')
 # Real concurrent sessions: different request IDs, same digest.
 def race(_): return json.loads(sql(auth+reserve(uid(),'b'*64)))['id']
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool: ids=list(pool.map(race,range(2)))
 check('concurrent duplicate reservations converge',len(set(ids)),1)
 check('each state transition audited once',sql(f"select string_agg(event,',' order by recorded_at) from mortgage_statement_events where upload_id='{upload}'"),'reserved,finalized,renamed')
 other=uid();sql(f"insert into documents(id,account_id,property_id,category,label,storage_path,file_size) values('{other}','{a}','{p}','Other','Unrelated','unrelated-test',1)");sql(auth+f"delete from documents where id='{other}'");check('unrelated document deletion unchanged',sql(f"select count(*) from documents where id='{other}'"),'0')
 # Metadata, existing-file links, reference settings and races.
 def edit(rev=1,label='Reviewed',old_label='Renamed',start="'2026-09-01'",end="'2026-09-30'",target=l):
  return f"select to_jsonb(update_mortgage_statement('{a}','{p}','{l}','{doc}',{rev},'{old_label}','{label}','2026-09-04',{start},{end},'statement','{target}'))"
 changed=json.loads(sql(auth+edit()))
 check('metadata update version increments',changed['revision'],2)
 check('period stored exactly',changed['period_start'],'2026-09-01')
 check('null version cannot bypass conflict checks',sql(auth+edit('null',old_label='Reviewed'),False).returncode!=0,True)
 check('old metadata version refused',sql(auth+edit(),False).returncode!=0,True)
 check('canonical label updated',sql(f"select label from documents where id='{doc}'"),'Reviewed')
 check('invalid period refused',sql(auth+edit(2,old_label='Reviewed',start="'2026-10-01'"),False).returncode!=0,True)
 def prefs(rev=0,ref=doc,mode='full'):
  return f"select to_jsonb(save_mortgage_statement_preferences('{a}','{p}','{l}','{ref}','{mode}',{rev}))"
 check('reference saves without touching balances',json.loads(sql(auth+prefs()))['history_mode'],'full')
 check('stale preference refused',sql(auth+prefs(),False).returncode!=0,True)
 check('other-loan reference refused',sql(auth+prefs(1,uid()),False).returncode!=0,True)
 check('reference period correction requires explicit reference change',sql(auth+f"select update_mortgage_statement('{a}','{p}','{l}','{doc}',2,'Reviewed','Reviewed','2026-09-05','2026-09-01','2026-09-30','statement','{l}')",False).returncode!=0,True)
 check('other account cannot read preferences',sql(f"set role authenticated;set request.jwt.claim.sub='{v}';select count(*) from mortgage_statement_preferences"),'0')
 existing=uid();path2=f'{a}/{p}/old.pdf'
 sql(f"insert into storage.objects(bucket_id,name) values('documents','{path2}');insert into documents(id,account_id,property_id,category,label,storage_path,file_size) values('{existing}','{a}','{p}','Mortgage Documents','Older original','{path2}',100)")
 before_count=sql('select count(*) from documents')
 def link(d=existing,digest='c'*64):return f"select to_jsonb(link_mortgage_statement('{a}','{p}','{l}','{d}','{digest}'))"
 linked=json.loads(sql(auth+link()))
 check('link uses original document id',linked['document_id'],existing)
 check('link creates no second document',sql('select count(*) from documents'),before_count)
 check('existing file path unchanged',linked['storage_path'],path2)
 check('link retry returns original',json.loads(sql(auth+link()))['id'],linked['id'])
 check('cross-account link refused',sql(f"set role authenticated;set request.jwt.claim.sub='{v}';"+link(),False).returncode!=0,True)
 # A simultaneous save from the same original version succeeds exactly once.
 def race_edit(_):return sql(auth+f"select update_mortgage_statement('{a}','{p}','{l}','{existing}',1,'Older original','Updated','2026-01-31','2026-01-01','2026-01-31','statement','{l}')",False).returncode
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool: edits=list(pool.map(race_edit,range(2)))
 check('concurrent metadata saves succeed only once',edits.count(0),1)
 check('preference changes audited',sql('select count(*) from mortgage_statement_preference_events'),'1')
 check('all loan fields preserved',sql('select md5(string_agg(to_jsonb(t)::text,\'\' order by id)) from mortgage_details t'),before)
 check('no payment/effect writes',sql('select (select count(*) from mortgage_payments)+(select count(*) from mortgage_history_payments)+(select count(*) from mortgage_balance_effects)'), activity_before)
 print(f'{len(results)}/{len(results)} local database checks passed')
finally:
 (work/'results.json').write_text(json.dumps(results,indent=2))
 if started: run([str(pg/'pg_ctl'),'-D',str(work/'data'),'stop','-m','fast'])
 print('Evidence:',work)
