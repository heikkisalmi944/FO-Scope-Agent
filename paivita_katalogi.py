# Päivittää Scope Agentin prosessikatalogin Microsoftin Excel-tiedostoista.
# Käyttö (projektikansiossa):
#   python paivita_katalogi.py --bpc "Business Process Catalog OCT 2026.xlsx" --deliverables "Deliverables OCT 2026.xlsx" --versio "lokakuu 2026"
import argparse
_p=argparse.ArgumentParser()
_p.add_argument('--bpc',required=True); _p.add_argument('--deliverables',required=True)
_p.add_argument('--versio',required=True); _p.add_argument('--projekti',default='.')
A=_p.parse_args()
import pandas as pd, re, json, sys
b=pd.read_excel(A.bpc).iloc[1:]
T=[f'Title {i}' for i in range(1,8)]
b['title']=b[T].bfill(axis=1).iloc[:,0].astype(str).str.strip()
b['seq']=b['Process sequence ID MS BPC'].astype(str).str.strip()
b['fo']=b['Application family MS BPC'].fillna('').str.contains('Finance and Operations')
b=b[~b['Catalog status MS BPC'].astype(str).str.contains('Deprecated')]
b['isv']=b['Software development company MS BPC'].fillna('')
b['status']=b['Catalog status MS BPC'].astype(str).str[:2]
def clean(t):
    t=re.sub(r'\s+(in|with|using) (Microsoft )?Dynamics 365 (Finance|Supply Chain Management|Commerce|Human Resources|Project Operations)( and (Dynamics 365 )?(Finance|Supply Chain Management|Commerce))*\s*$','',t)
    return t.strip()
def desc(x):
    if not isinstance(x,str): return ''
    x=re.sub(r'\s+',' ',x).strip()
    return x[:420]+('…' if len(x)>420 else '')
def prod(p):
    p=str(p); out=[]
    for k,v in [('Finance','FIN'),('Supply Chain','SCM'),('Commerce','COM'),('Human Resources','HR'),('Project Operations','PO')]:
        if k in p: out.append(v)
    return '/'.join(out)

DUPLO={'90':'Taloushallinto','75':'Hankinta','65':'Myynti ja laskutus','60':'Varasto ja logistiikka','70':'Tuotanto','50':'Suunnittelu ja ennustaminen','40':'Tuotehallinta','80':'Projektit','10':'Käyttöomaisuus ja kunnossapito','55':'Henkilöstöhallinto','95':'Palvelutoimitus','20':'Asiakaspalvelu','85':'Tarjoukset ja myynnin ohjaus','30':'Tuotteistus ja markkinointi','99':'Järjestelmähallinta'}
ORDER=['90','75','65','60','70','50','40','80','10','55','95','20','85','30','99']
L2FI={
'10.05':'Käyttöomaisuusstrategia','10.20':'Omaisuuden hankinta','10.40':'Aktiivinen omaisuus','10.50':'Kunnossapito','10.60':'Omaisuuden luopuminen','10.70':'Omaisuusanalytiikka',
'99.20':'Järjestelmäominaisuudet','99.25':'Käyttöoikeudet ja tietoturva',
'20.10':'Tietopankki','20.20':'Palveluorganisaatio','20.30':'Tapausten vastaanotto','20.40':'Tapausten käsittely','20.60':'Palveluanalytiikka',
'30.05':'Markkinointistrategia','30.15':'Tarjoomakehitys','30.25':'Palvelutarjooma','30.35':'Kampanjoiden valmistelu','30.45':'Kampanjoiden hallinta','30.55':'Markkinointianalytiikka',
'40.10':'Tuotestrategia','40.20':'Tuotteiden käyttöönotto','40.50':'Tuotteiden ylläpito','40.60':'Tuotteiden poisto','40.90':'Tuoteanalytiikka',
'50.15':'Liiketoimintastrategia','50.20':'Taloussuunnittelu','50.25':'S&OP-suunnittelu','50.35':'S&OP-toteutus','50.65':'Liiketoiminta-analytiikka',
'55.05':'Henkilöstöstrategia','55.10':'Rekrytointi ja perehdytys','55.30':'Työpaikan vaatimustenmukaisuus','55.40':'Suoriutuminen ja kehittyminen','55.50':'Työaika ja poissaolot','55.70':'Palkitseminen ja edut','55.80':'Työsuhteen päättäminen','55.90':'HR-analytiikka',
'60.10':'Varasto-operaatiot','60.20':'Varastosaldot','60.30':'Vastaanotto','60.40':'Lähetys','60.50':'Varaston laatu','60.60':'Kuljetukset','60.80':'Varastoanalytiikka',
'65.05':'Myyntipolitiikat ja hinnoittelu','65.20':'Myyntitilaukset','65.30':'Myyntireskontra','65.50':'Luotonvalvonta ja perintä','65.60':'Myyntianalytiikka',
'70.10':'Tuotantostrategia','70.20':'Tuotannon suunnittelu','70.30':'Tuotannon toteutus','70.60':'Tuotannon laatu','70.70':'Tuotantoanalytiikka',
'80.10':'Projektistrategia','80.20':'Projektisopimukset','80.30':'Projektien suunnittelu','80.40':'Projektien toteutus','80.50':'Projektitalous','80.60':'Projektianalytiikka',
'85.15':'Asiakkuudet','85.25':'Liidit','85.35':'Myyntistrategia','85.45':'Myyntimahdollisuudet','85.55':'Tarjoukset','85.65':'Myyntianalyysi',
'90.10':'Kirjanpidon perusteet','90.25':'Pankki ja maksuliikenne','90.30':'Budjetointi','90.50':'Kirjanpito','90.60':'Kauden sulkeminen','90.70':'Talousanalytiikka',
'95.05':'Palvelustrategia','95.15':'Palvelutyön suunnittelu','95.25':'Palvelutyön hallinta','95.35':'Palveluiden toimitus','95.45':'Palveluanalytiikka',
'75.10':'Hankintastrategia','75.30':'Toimittajahallinta','75.35':'Kilpailutus ja sopimukset','75.40':'Ostot','75.50':'Ostoreskontra','75.80':'Hankinta-analytiikka'}
FA={
'Finance\\Accounting\\Accounting':'90.10','Finance\\Accounting\\Organization structure':'90.10','Finance\\Accounting\\Inventory valuation':'60.20','Finance\\Accounting\\Asset financials':'10.05',
'Finance\\Accounts receivable\\Accounts receivable':'65.30','Finance\\Accounts receivable\\Customer management':'65.05','Finance\\Accounts receivable\\Project financials':'80.50','Finance\\Accounts receivable\\Customer trade allowances':'65.05','Finance\\Accounts receivable\\Revenue recognition':'65.30',
'Finance\\Accounts payable\\Accounts payable':'75.50','Finance\\Accounts payable\\Supplier management':'75.30','Finance\\Accounts payable\\Expense management':'90.50','Finance\\Accounts payable\\Supplier trade allowances':'75.10',
'Finance\\Treasury\\Cash and bank management':'90.25','Finance\\Tax and compliance\\Sales and use tax':'90.10','Finance\\Tax and compliance\\Financial compliance':'90.60',
'Finance\\Financial planning and analysis\\Budgeting':'90.30','Finance\\Financial planning and analysis\\Financial analysis':'90.70',
'Operations\\Logistics\\Inbound inventory':'60.30','Operations\\Logistics\\Outbound inventory':'60.40','Operations\\Logistics\\On-hand inventory':'60.20','Operations\\Logistics\\Transportation management':'60.60','Operations\\Logistics\\Inventory quality':'60.50',
'Operations\\Item management\\Product information management':'40.20','Operations\\Item management\\Engineering':'40.10','Operations\\Item management':'40.50',
'Operations\\Procurement\\Procurement':'75.40','Operations\\Procurement\\Purchase pricing and rebates':'75.35','Operations\\Procurement\\Procurement planning':'50.35',
'Operations\\Production\\Manufacturing':'70.30','Operations\\Production\\Production planning':'70.20','Operations\\Production\\Manufacturing quality':'70.60','Operations\\Production\\Maintenance':'10.50',
'Operations\\Project delivery\\Project delivery':'80.40','Operations\\Project delivery\\Project setup':'80.30','Operations\\Project delivery\\Project time and expenses':'80.40',
'Operations\\Service operations\\Service delivery':'95.35','Operations\\Service operations\\Service assets':'95.25',
'Customer experience\\Sales strategy\\Sales pricing and rebates':'65.05','Customer experience\\Sales strategy\\Sales planning':'50.25','Customer experience\\Sales strategy\\Sales management':'65.05',
'Customer experience\\Sales execution\\Order entry':'65.20','Customer experience\\Sales execution\\Sales funnel':'85.55',
'Customer experience\\Contact center\\Order management':'65.20','Customer experience\\Contact center\\Customer service':'20.40',
'Customer experience\\Commerce\\B2C eCommerce':'65.20','Customer experience\\Commerce\\Store management':'65.20',
'Customer experience\\Marketing\\Marketing automation':'30.45','Customer experience\\Marketing':'30.45',
'Human resources\\Human resources':'55.05','Human resources\\Human resources\\Human resource compliance':'55.30','Human resources\\Human resources\\Benefits management':'55.70','Human resources\\Human resources\\Compensation':'55.70','Human resources\\Human resources\\Organization chart':'55.05','Human resources\\Human resources\\Training':'55.40','Human resources\\Human resources\\Performance':'55.40','Human resources\\Human resources\\Task management':'55.10','Human resources\\Human resources\\Recruiting':'55.10',
'Human resources\\Payroll\\Payroll':'55.70','Human resources\\Payroll\\Time and attendance':'55.50','Human resources\\Payroll\\Leave and absence':'55.50',
'Information technology\\Applications\\System administration':'99.20','Information technology\\Applications':'99.20','Information technology\\Applications\\Security management':'99.20'}

EPIC_OPT=[(r'portal|collaborat|self-service','Portaali tai ulkoinen yhteistyö'),(r'e-?commerce|retail|\bstore|call cent|point of sale','Commerce-kanava'),
 (r'subscription','Tilauslaskutus'),(r'rebate|trade allowance|royalt','Hyvitykset ja bonukset'),(r'consign','Konsignaatio'),
 (r'intercompany|consolidat|eliminat|shared service','Konsernitoiminnot'),(r'landed cost','Landed cost'),(r'letters? of (credit|guarantee)|promissory|bills? of exchange','Erikoismaksuinstrumentit'),
 (r'fiscal document|locali[sz]','Lokalisointi'),(r'sustainab|emission|carbon','Vastuullisuus'),(r'copilot|\bAI\b|artificial|machine learning|predict','Tekoäly ja ennusteet'),
 (r'\bIoT\b','IoT'),(r'demand forecast|forecast','Ennustaminen'),(r'lease|leasing','Leasing'),(r'quality|nonconform|CAPA','Laadunhallinta'),
 (r'transportation|freight|carrier','Kuljetustenhallinta'),(r'budget','Budjetointi'),(r'advanced warehouse|wave|license plate|mobile','Edistynyt varastonhallinta'),
 (r'public sector|encumbr|grant','Julkinen sektori'),(r'cost accounting','Kustannuslaskenta')]
FUNC_OPT=[(r'\bEDI\b|electronic data interchange','EDI'),(r'LATAM|Brazil|India|Mexic|Argentin|Chile|Peru|Colomb|Russia|China|Japan|Pola|Czech|Hungar|Ital|France|French|Spain|Spanish|German|Saudi|Egypt|Gulf|Thai|Malays|Arab|Austral|Zealand|Lithuan|Latvia|Eston|Norw|Swed|Denm|Danish|Finland|Finnish|Netherlands|Dutch|Belgi|Austria|Swiss|Paraguay|Uruguay|Bolivia|Ecuador|Singapore|United States|Canad|United Kingdom','Maakohtainen'),
 (r'third.party|Azure|SFTP|SharePoint location|Power Automate|Dataverse|dual.write','Ulkoinen integraatio'),(r'copilot|\bAI\b|predict|machine learning','Tekoäly')]
PARAM={'companies':r'intercompany|consolidat|eliminat|shared service|customer sets?|vendor sets?|legal entit',
 'countries':r'locali[sz]|electronic invoic|e-invoic|fiscal|\bVAT\b|intrastat|sales tax|withholding',
 'currencies':r'currenc|exchange rate|revaluat',
 'edi':r'\bEDI\b|electronic data interchange',
 'apInvoices':r'invoice capture|\bOCR\b|scan',
 'portal':r'portal|collaborat|self-service',
 'wms':r'warehouse work|mobile|wave|license plate|location directive|work template|cluster pick',
 'budget':r'budget'}
def match(rules,t):
    for p,r in rules:
        if re.search(p,t,re.I): return r
    return None
def trig(t):
    return [k for k,p in PARAM.items() if re.search(p,t,re.I)]

l2=b[b['Work item type']=='Process area']; l3=b[b['Work item type']=='Process']; l4=b[(b['Work item type']=='Scenario')&b['fo']]
d=pd.read_excel(A.deliverables).iloc[1:]
d=d[~d['Work item type'].isin(['Folder','Tree'])]
d['title']=d[[f'Title {i}' for i in range(1,7)]].bfill(axis=1).iloc[:,0].astype(str).str.strip()
d['fo']=d['Application family MS BPC'].fillna('').str.contains('Finance and Operations')
d['fa']=d['Area Path'].astype(str).str.replace('Your Project Name Here\\Functional areas\\','',regex=False)
d=d[d['fo']]
sopcount=d[d['Work item type']=='Documentation']['title'].str.extract(r'(\d{2}\.\d{2}\.\d{3}\.\d{3})')[0].value_counts().to_dict()
pool=d[d['Work item type']!='Documentation'].copy()
pool['lego']=pool['fa'].map(FA)
CODE={'Configuration':'C','Workflow':'W','Integration':'I','Job':'J','Migration':'M','Report':'R','Enhancement':'E','Personalization':'P','Security':'S'}
pool['code']=pool['Work item type'].map(CODE)
FAS=sorted(pool['fa'].dropna().unique().tolist())
stats={'unmapped':int(pool['lego'].isna().sum())}
pool=pool[pool['lego'].notna()]
duplos=[]
for e in ORDER:
    e2=b[(b['Work item type']=='End to end')&(b['seq'].str[:2]==e)].iloc[0]
    legos=[]
    for _,a in l2[l2['seq'].str[:2]==e].sort_values('seq').iterrows():
        k=a['seq'][:5]
        epics=[]
        for _,p in l3[l3['seq'].str[:5]==k].sort_values('seq').iterrows():
            pk=p['seq'][:9]
            fns=[]
            for _,s in l4[l4['seq'].str[:9]==pk].sort_values('seq').iterrows():
                t=clean(s['title']); r=None
                if s['isv']: r='Kumppaniratkaisu: '+s['isv']
                else: r=match(FUNC_OPT,t)
                fns.append({'id':s['seq'],'t':t,'p':prod(s['Products MS BPC']),'sop':int(sopcount.get(s['seq'],0)),'o':r,'tr':trig(t),'n':1 if s['status']=='10' else 0})
            if not fns: continue
            pt=p['title']
            if re.match(r'Analy',a['title']): rule='Analytiikka ja raportointi'
            else: rule=match(EPIC_OPT,pt)
            if not rule and all(f['o'] and f['o'].startswith('Kumppani') for f in fns): rule='Kumppaniratkaisu'
            tr=sorted(set(trig(pt))|set(x for f in fns for x in f['tr'] if f['o'] is None and False))
            epics.append({'id':p['seq'],'t':pt,'d':desc(p['Description']),'s':'O' if rule else 'S','r':rule,'tr':trig(pt),'f':fns})
        dl=pool[pool['lego']==k]
        dels=[[r['title'][:140],r['code'],FAS.index(r['fa'])] for _,r in dl.iterrows()]
        if not epics: continue
        legos.append({'id':a['seq'],'t':a['title'],'fi':L2FI.get(k,a['title']),'e':epics,'dl':dels})
    duplos.append({'id':e,'fi':DUPLO[e],'e2e':e2['title'],'seq':e2['seq'],'d':desc(e2['Description']),'l':legos})
out={'version':'Business Process Catalog, '+A.versio,'fas':FAS,'duplos':duplos}

import os, re
ts='// Generated from Microsoft Business Process Catalog '+A.versio+' (F&O rows).\nimport type { Catalog } from \'./types\';\n\nexport const CATALOG: Catalog = '+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\n'
open(os.path.join(A.projekti,'src','data','catalog.ts'),'w',encoding='utf-8').write(ts)
nE=sum(len(l['e']) for d in out['duplos'] for l in d['l']); nF=sum(len(e['f']) for d in out['duplos'] for l in d['l'] for e in l['e'])
print(f"Valmis: {len(out['duplos'])} Duploa, {sum(len(d['l']) for d in out['duplos'])} Legoa, {nE} Epiciä, {nF} Functionia")
ids={e['id'] for d in out['duplos'] for l in d['l'] for e in l['e']}|{l['id'] for d in out['duplos'] for l in d['l']}
miss=[]
for f in ['src/data/e2e-chains.ts','src/lib/scope-model.ts']:
    t=open(os.path.join(A.projekti,f),encoding='utf-8').read()
    for m in sorted(set(re.findall(r'"(\d{2}\.\d{2}\.\d{3})(?:\.000)?"',t))):
        if m+'.000' not in ids: miss.append((f,m))
if miss:
    print('HUOM: nämä Epic-tunnukset puuttuvat uudesta katalogista:')
    for f,m in miss: print('  ',m,'tiedostossa',f)
else: print('Viittaukset kunnossa: ketjujen ja perusedellytysten Epicit löytyvät.')

# stats
ne=sum(len(l['e']) for du in duplos for l in du['l']); no=sum(1 for du in duplos for l in du['l'] for ep in l['e'] if ep['s']=='O')
nf=sum(len(ep['f']) for du in duplos for l in du['l'] for ep in l['e']); nfo=sum(1 for du in duplos for l in du['l'] for ep in l['e'] for f in ep['f'] if f['o'])
nl=sum(len(du['l']) for du in duplos); nd=sum(len(l['dl']) for du in duplos for l in du['l'])
pass
for du in duplos: print(du['id'],du['fi'],len(du['l']),sum(len(l['e']) for l in du['l']),sum(1 for l in du['l'] for ep in l['e'] if ep['s']=='O'))
