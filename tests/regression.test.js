#!/usr/bin/env node
/* Astros Spoiler-Free Tracker: mid-PA runner movement regression tests.
   Run: node tests/regression.test.js */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');
const elements = new Map();
const document = {
  getElementById(id) {
    if (!elements.has(id)) elements.set(id, {textContent:'', value:''});
    return elements.get(id);
  },
  addEventListener() {}
};
const context = {window:{location:{search:''}}, document, URLSearchParams, Intl, Date, console};
vm.runInNewContext(source +
  '\n;globalThis.__tracker={buildEvents,get events(){return events;},' +
  'getDisplayState,getVisibleBases,getCurrentIndex,' +
  'setRevealedIndexes(v){revealedIndexes=v;}};', context, {filename:'script.js'});
const t = context.__tracker;
let passed = 0;
function eq(actual, expected, label) {
  assert.equal(actual, expected, label);
  passed++;
}
function ok(value, label) {
  assert.ok(value, label);
  passed++;
}
function baseState(e) { return JSON.parse(JSON.stringify(e.bases)); }
function pitch(index, description, balls=0, strikes=0) {
  return {index, isPitch:true, pitchNumber:index+1,
    details:{description},count:{balls,strikes,outs:0}};
}
function event(index, description) {
  return {index,isPitch:false,details:{description},count:{balls:1,strikes:1,outs:0}};
}
function runner(id, name, start, end, playIndex, isOut=false) {
  return {details:{runner:{id,fullName:name},
    ...(playIndex===undefined?{}:{playIndex})},
    movement:{originBase:start,start,end,isOut}};
}
function play(batter, playEvents, runners, resultDescription, inning=9, halfInning='bottom') {
  return {about:{inning,halfInning},matchup:{
      batter:{id:batter.length,fullName:batter},
      pitcher:{id:1,fullName:'Pitcher'}},
    count:{balls:0,strikes:0,outs:0},
    playEvents,runners,result:{description:resultDescription,awayScore:2,homeScore:1,eventType:'walk'}};
}
function build(plays) {
  t.buildEvents({gameData:{teams:{away:{id:119},home:{id:158}},
      status:{abstractGameState:'Live'},
      game:{season:'2025',type:'L'}},
    liveData:{plays:{allPlays:plays}}});
  return t.events;
}
const yelich = 'Christian Yelich';
const contreras = 'William Contreras';
const firstPA = play(yelich,
  [pitch(0,'Ball',1)], [runner(101,yelich,null,'1B')],
  yelich + ' walks.');

const stealPA = play(contreras,[
  pitch(0,'Foul',0,1),
  pitch(1,'Ball',1,1),
  event(2,yelich+' steals (1) 2nd base.'),
  pitch(3,'Ball',2,1)
], [
  runner(101,yelich,'1B','2B',2),
  runner(102,contreras,null,'1B')
],contreras+' walks.');

let events = build([firstPA,stealPA]);
const yelichResult = events.find(x=>x.isResult && x.batter===yelich);
const foul = events.find(x=>x.text==='Foul');
const ballBefore = events.find(x=>x.batter===contreras && x.playEventIndex===1);
const steal = events.find(x=>/steals/.test(x.text));
const ballAfter = events.find(x=>x.batter===contreras && x.playEventIndex===3);
const contrerasResult = events.find(x=>x.isResult && x.batter===contreras);
ok(yelichResult && foul && ballBefore && steal && ballAfter && contrerasResult,
  'all synthetic play events are built');
eq(baseState(yelichResult).first,yelich,'walk reaches first at result');
eq(baseState(foul).first,yelich,'runner still on first before steal');
eq(baseState(ballBefore).second,null,'second empty before steal');
eq(baseState(steal).first,null,'steal vacates first on that event');
eq(baseState(steal).second,yelich,'steal occupies second immediately');
eq(baseState(ballAfter).first,null,'first remains empty on next pitch');
eq(baseState(ballAfter).second,yelich,'steal persists through subsequent pitches');
eq(baseState(contrerasResult).first,contreras,'walk later puts batter at first');
eq(baseState(contrerasResult).second,yelich,'walk does not erase earlier steal');

const stealIndex=events.indexOf(steal);
t.setRevealedIndexes(Array.from({length:stealIndex+1},(_,i)=>i));
eq(t.getCurrentIndex(),stealIndex,'reveal index remains at the steal');
eq(JSON.stringify(baseState(t.getDisplayState().event)),
  JSON.stringify(baseState(steal)),'visible diamond uses steal event bases');

// Movement on an event hidden from the feed must still appear at next visible pitch.
const hiddenPA = play('Next batter',[
  pitch(0,'Ball',1),
  event(1,'Pitcher Step Off'),
  pitch(2,'Foul',1,1)
],[runner(101,yelich,'1B','2B',1)],'Next batter strikes out.');
events = build([firstPA,hiddenPA]);
const nextVisibleFoul = events.find(x=>x.batter==='Next batter' && x.text==='Foul');
ok(!events.some(x=>x.text==='Pitcher Step Off'),'step-off remains hidden');
eq(baseState(nextVisibleFoul).second,yelich,'hidden event movement reaches next visible pitch');

// No playIndex is deliberately deferred until the PA result. Never reveal
// a later batter's trip to first before the terminal outcome is disclosed.
const deferredPA = play('Another batter',[
  pitch(0,'Foul',0,1),pitch(1,'Ball',1,1)
],[runner(201,'Another batter',null,'1B')],'Another batter walks.');
events = build([deferredPA]);
eq(baseState(events[0]).first,null,'deferred walk does not leak on first pitch');
eq(baseState(events[1]).first,null,'deferred walk does not leak on second pitch');
eq(baseState(events.find(x=>x.isResult)).first,'Another batter',
  'deferred walk is applied at result');

// Caught stealing removes runner as soon as the associated non-pitch event occurs.
const caughtPA = play('Batter',[
  pitch(0,'Ball',1),
  event(1,'Christian Yelich caught stealing 2nd base.'),
  pitch(2,'Foul',1,1)
],[runner(101,yelich,'1B','2B',1,true)],'Batter strikes out.');
events = build([firstPA,caughtPA]);
const caught=events.find(x=>/caught stealing/.test(x.text));
eq(baseState(caught).first,null,'caught stealing vacates first at the event');
eq(baseState(caught).second,null,'caught stealing does not populate second');
eq(baseState(events.find(x=>x.batter==='Batter'&&x.text==='Foul')).first,null,
  'caught-stealing result stays applied on following pitches');

console.log(passed+' passed, 0 failed');
