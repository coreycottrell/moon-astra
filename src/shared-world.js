// This isolated fork has its own ruleset and deliberately incompatible saves.
export {RULESET,UNIT,ECONOMY_VERSION} from './foundry/catalog.js';
export {GameError,emit,player,claim,addPlayer,freshSharedWorld} from './foundry/state.js';
export {applyCommand,BLUEPRINT} from './foundry/commands.js';
export {powerFor,industryFor} from './foundry/industry.js';
export {stepWorld,observe} from './foundry/world.js';
import {BUILDINGS,UNIT,ECONOMY_VERSION} from './foundry/catalog.js';
import {applyCommand} from './foundry/commands.js';
export const LIMIT=1000,PLANNER_WORK=120*UNIT,PROJECT_COST=120*UNIT;
export const BUILD_TIME=Object.fromEntries(Object.entries(BUILDINGS).filter(([t])=>t!=='seed').map(([t,b])=>[t,b.work]));
export function migrateEconomy(w){if(w.economyVersion!==ECONOMY_VERSION)throw Error('Foundry needs its own fresh database. It cannot migrate a live neighbors world.');return false;}
export function preview(w,actor,cmd,options){return {ok:true,result:applyCommand(structuredClone(w),actor,cmd,options),atTick:w.tick};}
