import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const code=fs.readFileSync('loterias-ai/js/schedule-engine.js','utf8');const ctx={globalThis:{},window:undefined,Date,Math,String,Number,Array,Object,console};vm.createContext(ctx);vm.runInContext(code,ctx);const E=ctx.globalThis.LotterySchedule;const cfg=JSON.parse(fs.readFileSync('loterias-ai/data/draw-schedule.json','utf8'));
const by=id=>cfg.games.find(g=>g.gameId===id);
const fri=new Date(2026,7,14,12,0,0);assert.equal(E.isToday(by('bonoloto'),fri),true);assert.equal(E.isToday(by('euromillones'),fri),true);assert.equal(E.isToday(by('primitiva'),fri),false);assert.equal(E.label(E.nextDraw(by('bonoloto'),fri)),'vie 14/08 · 21:30');
const sat=new Date(2026,7,15,10,0,0);assert.equal(E.isToday(by('loteria-nacional'),sat),true);assert.equal(E.isToday(by('primitiva'),sat),true);assert.equal(E.label(E.nextDraw(by('loteria-nacional'),sat)),'sáb 15/08 · 13:00');
const sun=new Date(2026,7,16,12,0,0);assert.equal(E.isToday(by('gordo-primitiva'),sun),true);assert.equal(E.label(E.nextDraw(by('gordo-primitiva'),sun)),'dom 16/08 · 21:40');
console.log('Loterías AI schedule tests: PASS');