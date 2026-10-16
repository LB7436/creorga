import ts from 'typescript'
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
export const gameRoots = ['apps/web/src/pages/guest/games', 'apps/web/src/pages/guest/GamesSection.tsx',
  'apps/web/public/cards/scopa', 'apps/guest/src/pages/GamesPage.tsx', 'apps/backend/src/routes/gameScores.ts']
const git = (root, args) => execFileSync('git', args, {cwd:root,windowsHide:true,maxBuffer:16*1024*1024})
export function gameInventory(root, commit) {
  if (!/^[a-f0-9]{40}$/.test(commit)) throw Error('SHA de commit complet requis')
  git(root,['cat-file','-e',`${commit}^{commit}`])
  const catalogPath='apps/web/src/pages/guest/games/catalog.ts'
  const code=git(root,['show',`${commit}:${catalogPath}`]).toString('utf8')
  const source=ts.createSourceFile(catalogPath,code,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS)
  const games=[], selected=new Set()
  function visit(node) {
    if(ts.isVariableDeclaration(node)&&node.name.getText(source)==='GUEST_GAMES'&&node.initializer&&ts.isArrayLiteralExpression(node.initializer)) {
      for(const game of node.initializer.elements) {
        if(!ts.isObjectLiteralExpression(game))continue
        const props=Object.fromEntries(game.properties.filter(ts.isPropertyAssignment).map(p=>[p.name.getText(source),p.initializer]))
        const string=name=>props[name]&&ts.isStringLiteralLike(props[name])?props[name].text:null
        let loader=null
        if(props.chargeur){const match=props.chargeur.getText(source).match(/import\(['"]([^'"]+)['"]\)/);loader=match?.[1]||null}
        games.push({id:string('id'),name:string('name'),status:string('statut'),renderer:string('rendu'),loader})
      }
    }
    if(ts.isVariableDeclaration(node)&&node.name.getText(source)==='GAME_SELECTION_BY_CATEGORY'&&node.initializer&&ts.isObjectLiteralExpression(node.initializer)){
      for(const property of node.initializer.properties)if(ts.isPropertyAssignment(property)&&ts.isArrayLiteralExpression(property.initializer))
        for(const id of property.initializer.elements)if(ts.isStringLiteralLike(id))selected.add(id.text)
    }
    ts.forEachChild(node,visit)
  }
  visit(source)
  const files=git(root,['ls-tree','-r',commit,'--',...gameRoots]).toString('utf8').trim().split(/\r?\n/).filter(Boolean).map(line=>{
    const match=line.match(/^(\d+) blob ([a-f0-9]+)\t(.+)$/)
    if(!match||match[1]!=='100644')throw Error('Entrée Git inattendue dans les jeux')
    const buffer=git(root,['show',`${commit}:${match[3]}`])
    return {path:match[3],gitBlob:match[2],bytes:buffer.length,sha256:createHash('sha256').update(buffer).digest('hex')}
  })
  return {version:1,commit,repository:'https://github.com/LB7436/creorga',games:games.map(g=>({...g,selected:selected.has(g.id)})),
    summary:{definitions:games.length,loaders:games.filter(g=>g.loader).length,selected:games.filter(g=>selected.has(g.id)).length,files:files.length,bytes:files.reduce((n,f)=>n+f.bytes,0)},files,
    limits:'Inventaire source statique. Un chargeur ou une sélection ne prouve pas les règles ni le fonctionnement complet du jeu.'}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const root=path.resolve(import.meta.dirname,'..'),commit=process.argv[2]||git(root,['rev-parse','HEAD']).toString('utf8').trim()
  const result=gameInventory(root,commit),output=process.argv[3]
  if(output){fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2))}
  console.log(JSON.stringify(result.summary))
}
