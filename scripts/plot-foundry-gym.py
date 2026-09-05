"""Render measured gym progress; the simulation report is the only data source."""
from pathlib import Path
import json
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
root=Path(__file__).resolve().parents[1]
r=json.loads((root/'artifacts/foundry/gym-report.json').read_text())
rows=r['timeline']+[r['final']]
x=[p['tick']/3600 for p in rows]
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':11,'text.color':'#dae6ed','axes.labelcolor':'#aebfc9','xtick.color':'#aebfc9','ytick.color':'#aebfc9'})
fig,ax=plt.subplots(figsize=(11,4.8),facecolor='#0b141d');ax.set_facecolor('#0b141d')
ax.step(x,[p['machines'] for p in rows],where='post',color='#6fe5d2',linewidth=2.5,label='Installed machines')
ax.step(x,[p['robots'] for p in rows],where='post',color='#ffb973',linewidth=2.5,label='Working robot population')
federation=r['milestones']['federation']/3600
ax.axvline(federation,color='#7183a6',linestyle='--',alpha=.8)
ax.text(federation-.12,31,'Federation assembled',rotation=90,va='top',ha='right',color='#aebfc9',fontsize=10)
ax.scatter([r['simulatedSeconds']/3600],[r['final']['machines']],color='#6fe5d2',s=50,zorder=3)
ax.set(xlim=(0,r['simulatedSeconds']/3600+.15),ylim=(0,34),xlabel='Simulated hours · normal one-second rules',ylabel='Physical units')
ax.set_title('Two colonies reach second-generation replication',loc='left',pad=20,fontweight='bold',fontsize=17,color='#edf6f8')
ax.grid(axis='y',color='#263844',alpha=.6);ax.set_axisbelow(True)
for spine in ax.spines.values():spine.set_visible(False)
ax.legend(loc='upper left',frameon=False,labelcolor='#dae6ed')
fig.text(.075,.02,'Deterministic policies · flat terrain · ordinary landing supplies · no live-world writes',color='#aebfc9',fontsize=10)
fig.tight_layout(rect=(.02,.06,1,1))
fig.savefig(root/'public/images/foundry/gym-progress.png',dpi=160,facecolor=fig.get_facecolor())
