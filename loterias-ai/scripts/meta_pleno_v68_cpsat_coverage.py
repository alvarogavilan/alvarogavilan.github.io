import os,json,itertools,math
from ortools.sat.python import cp_model
GAME=os.getenv('GAME','primitiva');BUDGET=float(os.getenv('MAX_BUDGET_EUR','15'))
CFG={
 'bonoloto':dict(k=6,sk=0,cost=.5,main=[2,4,6,8,14,26,34,42],stars=[]),
 'primitiva':dict(k=6,sk=0,cost=1,main=[2,4,6,8,14,26,34,42],stars=[]),
 'euromillones':dict(k=5,sk=2,cost=2.5,main=[2,8,14,21,28,35,42,49],stars=[1,4,7,10])
}[GAME]
c=CFG; main=list(map(int,os.getenv('MAIN_POOL',','.join(map(str,c['main']))).split(','))); stars=[] if not c['sk'] else list(map(int,os.getenv('STAR_POOL',','.join(map(str,c['stars']))).split(',')))
main_t=list(itertools.combinations(main,c['k'])); star_t=list(itertools.combinations(stars,c['sk'])) if c['sk'] else [()]; tickets=[(m,s) for m in main_t for s in star_t]; cap=min(len(tickets),int(BUDGET//c['cost']))
# Bonoloto pool8 fits completely under 15 EUR; exact jackpot coverage dominates and full enumeration is mathematically unbeatable.
if GAME=='bonoloto' and len(tickets)<=cap:
 sel=list(range(len(tickets))); status='FULL_ENUMERATION_DOMINATES'
else:
 model=cp_model.CpModel(); x=[model.NewBoolVar(f'x{i}') for i in range(len(tickets))]; model.Add(sum(x)==cap)
 elems=[]
 def add_elements(prefix,subsets,weight,contains):
  for idx,e in enumerate(subsets):
   y=model.NewBoolVar(f'{prefix}{idx}'); ids=[i for i,t in enumerate(tickets) if contains(t,e)]; model.Add(y<=sum(x[i] for i in ids)); elems.append((y,weight,prefix,e,ids))
 add_elements('M5_',list(itertools.combinations(main,max(1,c['k']-1))),1000,lambda t,e:set(e).issubset(t[0]))
 add_elements('M4_',list(itertools.combinations(main,max(1,c['k']-2))),100,lambda t,e:set(e).issubset(t[0]))
 if c['sk']:
  add_elements('S1_',list(itertools.combinations(stars,1)),200,lambda t,e:set(e).issubset(t[1]))
  cross=[(m,s) for m in itertools.combinations(main,max(1,c['k']-2)) for s in itertools.combinations(stars,c['sk'])]
  add_elements('X_',cross,300,lambda t,e:set(e[0]).issubset(t[0]) and set(e[1]).issubset(t[1]))
 # all selected tickets contribute equal exact-jackpot states; coverage terms distinguish portfolios, then deterministic tie-break.
 tie=sum((len(tickets)-i)*x[i] for i in range(len(tickets)))
 model.Maximize(sum(w*y for y,w,_,_,_ in elems)+tie)
 solver=cp_model.CpSolver();solver.parameters.max_time_in_seconds=45;solver.parameters.num_search_workers=8;st=solver.Solve(model);status=solver.StatusName(st);sel=[i for i in range(len(tickets)) if solver.Value(x[i])]
def covered_count(r):
 pref,subk=r
 subs=list(itertools.combinations(main,subk)); return sum(any(set(e).issubset(tickets[i][0]) for i in sel) for e in subs),len(subs)
coverage={}
for n,k in [('main_k_minus_1',max(1,c['k']-1)),('main_k_minus_2',max(1,c['k']-2))]:
 a,b=covered_count((n,k));coverage[n]={'covered':a,'universe':b,'fraction':a/b if b else None}
if c['sk']:
 ss=list(itertools.combinations(stars,1));a=sum(any(set(e).issubset(tickets[i][1]) for i in sel) for e in ss);coverage['stars_1']={'covered':a,'universe':len(ss),'fraction':a/len(ss)}
 cross=[(m,s) for m in itertools.combinations(main,max(1,c['k']-2)) for s in itertools.combinations(stars,c['sk'])];a=sum(any(set(m).issubset(tickets[i][0]) and set(s).issubset(tickets[i][1]) for i in sel) for m,s in cross);coverage['cross_main_k_minus_2_full_stars']={'covered':a,'universe':len(cross),'fraction':a/len(cross) if cross else None}
out={'generatedAt':__import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat(),'engine':'MetaPleno-v68-cpsat-coverage','game':GAME,'solverStatus':status,'budgetEUR':BUDGET,'unitCostEUR':c['cost'],'candidatePools':{'main':main,'stars':stars},'candidateTickets':len(tickets),'selectedTickets':len(sel),'spentEUR':len(sel)*c['cost'],'conditionalExactJackpotCoverage':{'selectedExactStates':len(sel),'candidateExactStates':len(tickets),'fraction':len(sel)/len(tickets)},'coverage':coverage,'tickets':[{'main':list(tickets[i][0]),'stars':list(tickets[i][1])} for i in sel],'realMoneyPass':False,'warning':'This proves/optimizes portfolio coverage conditional on a candidate pool. It does not establish that the candidate pool is more likely than random.'}
os.makedirs('loterias-ai/data/research',exist_ok=True);open(f'loterias-ai/data/research/meta-pleno-v68-{GAME}-cpsat-coverage.json','w').write(json.dumps(out,indent=2)+'\n');print(json.dumps({k:out[k] for k in ['game','solverStatus','candidateTickets','selectedTickets','spentEUR','conditionalExactJackpotCoverage','coverage']},indent=2))
