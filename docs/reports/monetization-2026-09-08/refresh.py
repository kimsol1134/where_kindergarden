import json, importlib.util
from pathlib import Path
import mixpanel_headless as mp
from mixpanel_headless import Filter,FunnelStep,RetentionEvent
spec=importlib.util.spec_from_file_location('previous','docs/reports/kindergarten-retention-monetization-2026-08-06/critical-review/mixpanel_queries.py'); old=importlib.util.module_from_spec(spec);spec.loader.exec_module(old)
w=mp.Workspace(project='4014822',workspace=4510961)
out={'as_of':'2026-09-08','project':'4014822','note':'Counts are distinct device IDs, not downloads. Query date boundaries follow project settings. No explicit TestFlight filter in these queries.'}
p=Path('docs/reports/monetization-2026-09-08/evidence.json')
def query(label,fn):
 try:
  r=fn();out[label]=json.loads(r.df.to_json(orient='records',force_ascii=False)) if hasattr(r,'df') else r
  print(label,json.dumps(out[label],ensure_ascii=False),flush=True)
 except Exception as e:out[label]={'error':str(e)[:300]};print(label,out[label],flush=True)
 p.write_text(json.dumps(out,ensure_ascii=False,indent=2))
events=['App Launched','Detail Opened','Comparison Added','Compare Viewed','Favorite Added','Review Link Tapped','Vacancy Viewed','Compare Share Result']
try:
 for label,start,end in [('current_week','2026-09-01','2026-09-07'),('previous_week','2026-08-25','2026-08-31'),('rolling_30','2026-08-09','2026-09-07')]:
  query(label,lambda start=start,end=end:w.query(events,from_date=start,to_date=end,math='unique',mode='total'))
 query('two_candidate_funnel',lambda:w.query_funnel(['App Launched',FunnelStep('Comparison Added',filters=[Filter.greater_than('compare_count',1)])],from_date='2026-09-01',to_date='2026-09-07',conversion_window=1,conversion_window_unit='day',order='loose',mode='steps'))
 query('new_retention',lambda:old.summarize_retention(w.query_retention(RetentionEvent('App Launched',filters=[Filter.less_than('days_since_install',1)]),'App Launched',from_date='2026-08-09',to_date='2026-09-07',retention_unit='day',alignment='birth',mode='curve',unbounded_mode='none',retention_cumulative=False),'2026-09-07',(1,7)))
 query('testflight_breakdown',lambda:w.query('App Launched',from_date='2026-09-01',to_date='2026-09-07',math='unique',group_by='is_testflight',mode='table'))
 query('vacancy_versions',lambda:w.query('Vacancy Viewed',from_date='2026-09-01',to_date='2026-09-07',math='unique',group_by='data_version',mode='table'))
finally:w.close()
