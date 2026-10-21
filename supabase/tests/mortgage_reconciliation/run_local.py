"""Full released migrations plus candidate, isolated local PostgreSQL. No hosted service."""
import json, pathlib, subprocess, tempfile, uuid, os, concurrent.futures
repo=pathlib.Path(__file__).resolve().parents[3]
root=next(p for p in repo.parents if p.name=='ZMR-Real-Estate')
work=pathlib.Path(tempfile.mkdtemp(prefix='review-integration-',dir=root/'administration'))
socket=root/'administration/ri-socket';socket.mkdir(exist_ok=True)
pg=pathlib.Path('/opt/homebrew/opt/postgresql@17/bin');port='55441'
env={k:v for k,v in os.environ.items() if not k.startswith('PG')};env.update(LANG='C',LC_ALL='C')
base=[str(pg/'psql'),'-X','-qAt','-h',str(socket),'-p',port,'-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose']
def run(c,**kw):return subprocess.run(c,text=True,capture_output=True,env=env,**kw)
def sql(s,ok=True):
 r=run(base,input=s)
 if ok and r.returncode:raise RuntimeError(r.stderr)
 return r.stdout.strip() if ok else r
results=[]
def check(name,value):
 results.append({'name':name,'pass':bool(value)})
 if not value:raise AssertionError(name)
def lit(o):return "'"+json.dumps(o).replace("'","''")+"'::jsonb"
def uid():return str(uuid.uuid4())
started=False
try:
 r=run([str(pg/'initdb'),'-D',str(work/'data'),'-U','postgres','--auth=trust']);assert r.returncode==0,r.stderr
 r=run([str(pg/'pg_ctl'),'-D',str(work/'data'),'-o',f"-p {port} -k '{socket}' -c listen_addresses=''",'-l',str(work/'postgres.log'),'start']);assert r.returncode==0,r.stderr;started=True
 for f in [repo/'supabase/tests/entity_responsibility/bootstrap.sql',*sorted((repo/'supabase/migrations').glob('*.sql'))]:
  r=run(base+['-f',str(f)]);assert r.returncode==0,f'{f.name}: {r.stderr}'
 a,b,u,v,p,q,l,m=[uid() for _ in range(8)]
 sql(f"insert into auth.users values('{u}','a@example.test'),('{v}','b@example.test');insert into accounts(id,name) values('{a}','A'),('{b}','B');insert into account_members(account_id,user_id,role) values('{a}','{u}','owner'),('{b}','{v}','owner');insert into properties(id,account_id,address) values('{p}','{a}','ZMR-TEST-REVIEW A'),('{q}','{b}','ZMR-TEST-REVIEW B');")
 for acc,prop,loan in [(a,p,l),(b,q,m)]:sql(f"insert into mortgage_details(id,account_id,property_id,lender_name,original_loan_amount,current_balance,escrow_balance,interest_rate,monthly_payment,loan_start_date,term_years) values('{loan}','{acc}','{prop}','Example',10000,9000,50,5,100,'2025-01-01',30)")
 auth=f"set role authenticated;set request.jwt.claim.sub='{u}';"
 docs=[]
 for idx,date in enumerate(['2026-08-01','2026-09-01']):
  digest=str(idx+1)*64
  r=json.loads(sql(auth+f"select to_jsonb(reserve_mortgage_statement('{a}','{p}','{l}','{uid()}','{digest}','test.pdf','Statement','{date}',100))"))
  sql(f"insert into storage.objects(bucket_id,name) values('documents','{r['storage_path']}')")
  d=json.loads(sql(auth+f"select to_jsonb(finalize_mortgage_statement('{a}','{r['id']}'))"));docs.append(d)
 def call(command,rev=1,request=None,who=auth,account=a,prop=p,loan=l):return who+f"select to_jsonb(save_mortgage_statement_review('{account}','{prop}','{loan}',{rev},'{request or uid()}',{lit(command)}))"
 def command(doc,kind,**kw):return {'kind':kind,'documentId':doc['document_id'],'digest':doc['digest'],'documentRevision':1,'confirmed':True,**kw}
 def rejected(name,s,code):
  r=sql(s,False)
  if not (r.returncode!=0 and code in r.stderr): raise AssertionError(name+' '+r.stderr)
  check(name,True)
 line={'line':1,'postedDate':'2026-08-15','kind':'payment','description':'Monthly payment','total':'105.00','principal':'50.00','interest':'30.00','escrow':'25.00','fees':'0.00'}
 prepare=command(docs[0],'prepare',statement={'principal':'9050.00','escrow':'25.00','activity':[]})
 before=sql("select md5(string_agg(to_jsonb(t)::text,'' order by id)) from mortgage_details t")
 rejected('anonymous denied',call(prepare,who='set role anon;'),'42501')
 rejected('other account denied',call(prepare,who=f"set role authenticated;set request.jwt.claim.sub='{v}';"),'42501')
 rejected('wrong property denied',call(prepare,prop=q),'42501')
 req=uid();w=json.loads(sql(call(prepare,request=req)));check('source captured',w['revision']==2)
 check('identical retry',json.loads(sql(call(prepare,request=req)))['revision']==2)
 rejected('changed retry',call({**prepare,'confirmed':False},request=req),'22023')
 rejected('direct write denied',auth+f"update mortgage_statement_reviews set revision=99 where mortgage_id='{l}'",'42501')
 check('RLS hides other account',sql(f"set role authenticated;set request.jwt.claim.sub='{v}';select count(*) from mortgage_statement_reviews")=='0')
 second=command(docs[1],'prepare',statement={'principal':'9000.00','escrow':'50.00','activity':[line]})
 rejected('stale version denied',call(second),'PT409')
 rejected('subcent amount denied',call({**second,'statement':{**second['statement'],'principal':'9000.001'}},2),'22023')
 w=json.loads(sql(call(second,2)));check('second source captured',w['revision']==3)
 rejected('source overwrite denied',call(second,3),'22023')
 review=command(docs[1],'review',sourceId=docs[1]['digest']+':1',allocation={k:line[k] for k in ['total','principal','interest','escrow','fees']},reason='Compared to PDF',reversalOf=None)
 rejected('mismatched allocation denied',call({**review,'allocation':{**review['allocation'],'escrow':'24.00'}},3),'22023')
 rejected('source spoof denied',call({**review,'digest':'f'*64},3),'PT409')
 w=json.loads(sql(call(review,3)));check('review saved with auth actor',w['reviews'][review['sourceId']]['reviewer']==u)
 done=command(docs[1],'complete',note='Principal and escrow agree',principalVersion=0,escrowVersion=0)
 rejected('undated reference blocks completion',call(done,4),'22023')
 check('loan balances untouched',sql("select md5(string_agg(to_jsonb(t)::text,'' order by id)) from mortgage_details t")==before)
 check('no payments created',sql(f"select count(*) from mortgage_payments where account_id='{a}'")=='0')
 check('audit cannot be edited',sql(auth+'delete from mortgage_statement_review_events',False).returncode!=0)
 check('helpers inaccessible',sql(auth+"select msr_amount('10.00')",False).returncode!=0)

 versions=json.loads(sql(f"select jsonb_build_object('p',principal_version,'e',escrow_version) from mortgage_details where id='{l}'"))
 sql(auth+f"select reset_mortgage_balance('{l}',9000,{versions['p']},50,{versions['e']},'2026-09-01')")
 versions=json.loads(sql(f"select jsonb_build_object('p',principal_version,'e',escrow_version) from mortgage_details where id='{l}'"))
 done.update(principalVersion=versions['p'],escrowVersion=versions['e'])
 rejected('stale loan reference',call({**done,'principalVersion':-1},4),'PT409')
 rejected('missing outcome',call({**done,'note':''},4),'22023')
 cause=uid()
 sql(f"insert into mortgage_balance_review_causes(id,account_id,property_id,review_mortgage_id,balance_kind,cause,source_kind,source_id) values('{cause}','{a}','{p}','{l}','principal','possibly_covered_by_statement','payment','{uid()}')")
 rejected('open loan review blocks completion',call(done,4),'22023')
 sql(f"update mortgage_balance_review_causes set resolved_at=now(),resolved_by='{u}',resolution='confirmed' where id='{cause}'")
 w=json.loads(sql(call(done,4)));check('balanced statement completed',docs[1]['document_id'] in w['completed'])
 rejected('completed review cannot change',call(review,5),'22023')
 rejected('completed source cannot overwrite',call(second,5),'22023')
 check('audit rows all belong to actor',sql(f"select bool_and(actor_id='{u}') from mortgage_statement_review_events where mortgage_id='{l}'")=='t')
 check('other account audit hidden',sql(f"set role authenticated;set request.jwt.claim.sub='{v}';select count(*) from mortgage_statement_review_events")=='0')
 check('empty account sees no review',sql(f"set role authenticated;set request.jwt.claim.sub='{v}';select count(*) from mortgage_statement_reviews where mortgage_id='{m}'")=='0')


 r=json.loads(sql(auth+f"select to_jsonb(reserve_mortgage_statement('{a}','{p}','{l}','{uid()}','{'3'*64}','third.pdf','October','2026-10-01',100))"))
 sql(f"insert into storage.objects(bucket_id,name) values('documents','{r['storage_path']}')")
 third=json.loads(sql(auth+f"select to_jsonb(finalize_mortgage_statement('{a}','{r['id']}'))"))
 lines=[{**line,'line':i,'postedDate':'2026-09-15'} for i in [1,2]]
 w=json.loads(sql(call(command(third,'prepare',statement={'principal':'8900.00','escrow':'100.00','activity':lines}),5)))
 r1=command(third,'review',sourceId=third['digest']+':1',allocation=review['allocation'],reason='Two separate entries on source',reversalOf=None)
 r2={**r1,'sourceId':third['digest']+':2'}
 w=json.loads(sql(call(r1,6)))
 rejected('same day total requires counted acknowledgement',call(r2,7),'PT409')
 rejected('incorrect acknowledgement count refused',call({**r2,'duplicateAck':2},7),'PT409')
 w=json.loads(sql(call({**r2,'duplicateAck':1},7)));check('separate source acknowledgement saved',w['reviews'][r2['sourceId']]['duplicateAck']==1)
 operations=[call(command(third,'remove',sourceId=r['sourceId']),8) for r in [r1,r2]]
 with concurrent.futures.ThreadPoolExecutor(2) as pool: outcomes=list(pool.map(lambda x:sql(x,False),operations))
 check('simultaneous saves exactly one succeeds',sum(r.returncode==0 for r in outcomes)==1)
 check('competing stale save reports conflict',any('PT409' in r.stderr for r in outcomes))
 rejected('reopen requires reason',call(command(docs[1],'reopen',note=''),9),'22023')
 w=json.loads(sql(call(command(docs[1],'reopen',note='Recheck updated reference'),9)))
 check('audited reopen retains source and reviews',docs[1]['document_id'] not in w['completed'] and review['sourceId'] in w['reviews'] and docs[1]['document_id'] in w['statements'])
 rejected('malformed null command denied',auth+f"select save_mortgage_statement_review('{a}','{p}','{l}',9,'{uid()}',null)",'22023')
 w=json.loads(sql(call(done,10)));check('reopened period can reconcile again',docs[1]['document_id'] in w['completed'])
 restart=command(docs[0],'restart',note='Correct a transcribed source balance')
 req=uid();w=json.loads(sql(call(restart,11,request=req)))
 check('restart clears dependent later outcomes',not w['completed'])
 check('restart retains audit and removes source only from current view',docs[0]['document_id'] not in w['statements'] and docs[1]['document_id'] in w['statements'])
 check('restart retry is idempotent',json.loads(sql(call(restart,11,request=req)))['revision']==12)
 # Legacy fixtures deliberately reproduce pre-link data in this disposable local DB.
 # Trigger bypass is only fixture construction; every review call uses authenticated role.
 def payment_fixture(table,loan,amount,principal,interest,voided=False):
  identity=uid();link="null" if loan is None else "'"+loan+"'"
  extra=',declared_as_of' if table=='mortgage_history_payments' else '';value=",'2026-09-01'" if extra else ''
  return identity,f"set session_replication_role=replica;insert into {table}(id,account_id,property_id,mortgage_id,payment_date,amount,principal_amount,interest_amount,voided{extra}) values('{identity}','{a}','{p}',{link},'2026-08-15',{amount},{principal},{interest},{str(voided).lower()}{value});set session_replication_role=origin;"
 for table in ['mortgage_payments','mortgage_history_payments']:
  if table=='mortgage_payments':
   identity,fixture=payment_fixture(table,None,105,75,30)
   rejected(table+' unlinked legacy match refused','BEGIN;'+fixture+call(review,12)+';ROLLBACK;','22023')
  identity,fixture=payment_fixture(table,l,105,75,30)
  rejected(table+' changed allocation match refused','BEGIN;'+fixture+call(review,12)+';ROLLBACK;','22023')
  identity,fixture=payment_fixture(table,l,105,75,30,True)
  result=json.loads(sql('BEGIN;'+fixture+call(review,12)+';ROLLBACK;'))
  check(table+' voided candidate ignored',result['reviews'][review['sourceId']]['existingId'] is None)
  # A payment appearing after review must prevent completion, even if it shares total/date.
  rejected(table+' new match after review blocks completion','BEGIN;'+fixture.replace(',true',',false')+call(done,12)+';ROLLBACK;','22023')
 # Restore the source inside an isolated transaction before exercising completion match changes.
 restored={**prepare}
 for table in ['mortgage_payments','mortgage_history_payments']:
  identity,fixture=payment_fixture(table,l,105,75,30)
  rejected(table+' completion recount rejects changed match','BEGIN;'+call(restored,12)+';reset role;'+fixture+call(done,13)+';ROLLBACK;','PT409')
 for table in ['mortgage_payments','mortgage_history_payments']:
  identity,fixture=payment_fixture(table,l,105,75,30)
  exact={**review,'allocation':{'total':'105.00','principal':'75.00','interest':'30.00','escrow':'0.00','fees':'0.00'},'reason':'Local exact-match fixture'}
  matched=json.loads(sql('BEGIN;'+fixture+call(exact,12)+';ROLLBACK;'))
  check(table+' exact match retained without duplicate',matched['reviews'][review['sourceId']]['existingId']==identity and matched['reviews'][review['sourceId']]['action']=='retain_existing')
  prefix='BEGIN;'+call(restored,12)+';reset role;'+fixture+call(exact,13)+';reset role;'
  mutation=f"set session_replication_role=replica;update {table} set principal_amount=74,interest_amount=31 where id='{identity}';set session_replication_role=origin;"
  rejected(table+' existing match edited after review blocks completion',prefix+mutation+call(done,14)+';ROLLBACK;','PT409')
 check('rolled-back matching fixtures leave no payments',sql('select count(*) from mortgage_payments')=='0' and sql('select count(*) from mortgage_history_payments')=='0')
 check('matching refusal tests preserve workspace revision',sql(f"select revision from mortgage_statement_reviews where mortgage_id='{l}'")=='12')
 (work/'RESULT.json').write_text(json.dumps({'checks':results,'migration_count':len(list((repo/'supabase/migrations').glob('*.sql')))},indent=2))
 print(f'{len(results)}/{len(results)} local integration checks passed. Evidence: {work}')
finally:
 if started:run([str(pg/'pg_ctl'),'-D',str(work/'data'),'stop','-m','fast'])
