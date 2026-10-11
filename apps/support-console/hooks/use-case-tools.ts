'use client';
import { useEffect } from 'react';
import { flushSync } from 'react-dom';
import { cases, type SupportCase } from '@/lib/fixtures';
type Registry={registerTool(tool:{name:string;description:string;inputSchema:object;annotations:{readOnlyHint:boolean};execute:(input:unknown)=>unknown},options:{signal:AbortSignal}):void|Promise<void>};
export function useCaseTools(openCase:(item:SupportCase)=>void){
 useEffect(()=>{
 const registry=(document as Document & {modelContext?:Registry}).modelContext;if(!registry?.registerTool)return;
 const lifecycle=new AbortController();
 const tools=[
 {name:'search_demo_cases',description:'Read synthetic demo cases matching a query. No live records.',inputSchema:{type:'object',properties:{query:{type:'string',maxLength:200}},required:['query'],additionalProperties:false},annotations:{readOnlyHint:true},execute(input:unknown){
 const value=input as {query?:unknown};
 if(!value||typeof value!=='object'||typeof value.query!=='string'||value.query.length>200||Object.keys(value).some(k=>k!=='query'))throw new Error('A query string of at most 200 characters is required.');
 const q=value.query.toLowerCase();return {synthetic:true,cases:cases.filter(c=>(c.id+' '+c.account+' '+c.title).toLowerCase().includes(q)).map(c=>({id:c.id,account:c.account,title:c.title}))};
 }},
 {name:'open_demo_case',description:'Open the investigation panel for a synthetic case. Does not run checks or change records.',inputSchema:{type:'object',properties:{caseId:{type:'string',enum:cases.map(c=>c.id)}},required:['caseId'],additionalProperties:false},annotations:{readOnlyHint:false},execute(input:unknown){
 const value=input as {caseId?:unknown};
 if(!value||typeof value!=='object'||typeof value.caseId!=='string'||Object.keys(value).some(k=>k!=='caseId'))throw new Error('A demo case ID is required.');
 const item=cases.find(c=>c.id===value.caseId);if(!item)throw new Error('Unknown demo case.');
 flushSync(()=>openCase(item));return {caseId:item.id,panel:'open',synthetic:true};
 }}];
 for(const tool of tools){try{void Promise.resolve(registry.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{/* Optional browser capability; ordinary controls remain available. */}}
 return ()=>lifecycle.abort();
 },[openCase]);
}
