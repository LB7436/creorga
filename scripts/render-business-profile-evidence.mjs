import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { summarizeUnit, summarizeBrowser } from './render-t100-evidence.mjs'
import { scanWorkspace } from './audit-ui-controls.mjs'
const [directory,sinceText]=process.argv.slice(2),since=Date.parse(sinceText)
if(!directory||!Number.isFinite(since))throw Error('Dossier privé et date minimale ISO requis')
const root=path.resolve(import.meta.dirname,'..'),reports=path.resolve(directory),output=path.join(root,'docs/2.0/preuves')
const read=name=>JSON.parse(fs.readFileSync(path.join(reports,name),'utf8').replace(/^\uFEFF/,''))
const unit=['backend-unit','web-unit','pos-unit','integration'].map(suite=>{
  const report=read(`business-${suite}.json`)
  assert.equal(report.success,true);assert.equal(report.numFailedTestSuites,0)
  const summary=summarizeUnit(report,suite);assert.ok(Date.parse(summary.executedAt)>=since);assert.equal(summary.failed,0);assert.equal(summary.skipped,0)
  return summary
})
const browser=summarizeBrowser(read('business-browser.json'))
assert.equal(browser.globalErrors,0);assert.equal(browser.counts.FAIL,0);assert.equal(browser.counts['NOT RUN'],0);assert.ok(Date.parse(browser.executedAt)>=since)
const expectedFiles=fs.readdirSync(path.join(root,'tests/browser-lab')).filter(file=>file.endsWith('.spec.ts')).sort()
assert.deepEqual([...new Set(browser.cases.map(row=>path.basename(row.file)))].sort(),expectedFiles,'Recette Chrome partielle refusée')
assert.equal(new Set(browser.cases.map(row=>row.file+'::'+row.name)).size,browser.cases.length,'Parcours Chrome compté deux fois')
assert.ok(browser.cases.length>=28,'Les parcours nouveaux ne peuvent pas être omis')
const inventory=scanWorkspace(root)
assert.ok(inventory.metadata.completeParse);assert.ok(inventory.controls.every(row=>row.status==='NOT RUN'))
const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim()
const proof={generatedAt:new Date().toISOString(),baseCommit:'962c01b2767a06db510c6b0aa3e22d521da77534',sourceCommit,
  environment:'Windows ; laboratoires PostgreSQL loopback:5450 ; Chrome neuf ; profil business compilé ; IA/banques/incidents remplacés lorsque précisé.',
  unit,browser,inventory:inventory.metadata,t100:{status:'NOT RUN',partial:true,matrix:{PASS:54,FAIL:0,BLOCKED:45,'NOT RUN':1},
    reason:'Parcours supplémentaires ciblés, pas tous les écrans/rôles/erreurs. Inventaire statique conservé non exécuté, jeux réservés au profil complet.'},
  safety:{productionDeployment:false,realPayment:false,historicProfileOpened:false,windowsSoftwareUninstalled:false,sqlMigrationAdded:false,stripeRefundsEnabled:false,videoEnabled:false}}
fs.writeFileSync(path.join(output,'business-only-validation-2026-10-16.json'),JSON.stringify(proof,null,2))
const records=[{type:'metadata',...inventory.metadata},...inventory.routes.map(r=>({type:'route',...r})),...inventory.controls.map(r=>({type:'control',...r,
  profile:/\/guest\/games\/|\/guest\/GamesSection\.tsx|apps\/guest\/src\/pages\/GamesPage\.tsx/.test(r.file||'')?'full-only':'source-a-qualifier'}))]
fs.writeFileSync(path.join(output,'business-only-inventaire-t100-2026-10-16.jsonl'),records.map(r=>JSON.stringify(r)).join('\n')+'\n')
const rows=[]
for(const label of ['dev-complet','compile-complet','business-seul']){
  const resource=read(`resources-${label}.json`),ui=read(`ui-${label}.json`),startup=read(`startup-paired-${label}.json`)
  assert.ok(Date.parse(resource.measuredAt)>=since);assert.equal(ui.jsErrors.length,0)
  const average=key=>{const values=resource.measurements.map(r=>r[key]).filter(v=>typeof v==='number');return values.length?Number((values.reduce((n,v)=>n+v,0)/values.length).toFixed(4)):null}
  rows.push({profile:label,measuredAt:resource.measuredAt,sampleCount:resource.measurements.length,logicalCpus:resource.logicalCpus,
    workingSetSumMiB:average('workingSetSumMiB'),privateCommitMiB:average('privateCommitMiB'),cpuNormalizedPercent:average('cpuNormalizedPercent'),
    gpuEnginePercentSum:average('gpuEnginePercentSum'),gpuDedicatedMiB:average('gpuDedicatedMiB'),gpuSharedMiB:average('gpuSharedMiB'),
    processCountMin:Math.min(...resource.measurements.map(r=>r.processCount)),processCountMax:Math.max(...resource.measurements.map(r=>r.processCount)),
    gpuErrors:[...new Set(resource.measurements.map(r=>r.gpuError).filter(Boolean))],startup,ui:{chrome:ui.chrome,dataset:ui.dataset,measurements:ui.measurements,jsErrors:ui.jsErrors,limits:ui.limits},measurementLimits:resource.limits})
}
for(const row of rows)assert.deepEqual(row.ui.dataset,rows[0].ui.dataset,'Jeux de données différents : comparaison refusée')
const disk=[]
for(const profile of ['business','full']){
  const directory=path.join(root,'apps/web',`dist-${profile}`)
  const walk=folder=>fs.readdirSync(folder,{withFileTypes:true}).reduce((a,f)=>{const p=path.join(folder,f.name);if(f.isDirectory()){const sub=walk(p);a.files+=sub.files;a.bytes+=sub.bytes}else{a.files++;a.bytes+=fs.statSync(p).size}return a},{files:0,bytes:0})
  disk.push({profile,...walk(directory),graph:JSON.parse(fs.readFileSync(path.join(directory,'profile-manifest.json'),'utf8'))})
}
fs.writeFileSync(path.join(output,'business-only-ressources-2026-10-16.json'),JSON.stringify({generatedAt:new Date().toISOString(),profiles:rows,webArtifacts:disk,
  limits:'Séries courtes séquentielles, une relance par profil, même jeu fictif. Somme des working sets non dédupliquée. CPU zéro observé peut être sous la résolution sur cet intervalle. GPU somme des moteurs, pas pourcentage normalisé. Aucun wattmètre ni gain énergétique déduit. Autres applications conservées.'},null,2))
console.log(JSON.stringify({unit,browser:browser.counts,inventory:inventory.metadata.totals,resources:rows.map(r=>({profile:r.profile,workingSetSumMiB:r.workingSetSumMiB,cpu:r.cpuNormalizedPercent,processes:r.processCountMax}))},null,2))
