// All rates are per one-second authoritative world tick. Inventory uses integer
// milli-units; these are deliberately game quantities, not engineering tonnages.
export const UNIT=1000;
export const RULESET='moon-foundry-1';
export const WORLD_VERSION=3;
export const ECONOMY_VERSION=3;
export const LIMITS={players:24,machines:1000,robots:256,freight:4096,board:100,events:400,localBuildRadius:900};
export const BUILDINGS={
  seed:{name:'Seed lander',cost:0,parts:0,power:8,radius:8,mind:0,work:0,description:'Protected landing depot, 8 power, and emergency reconditioning. Four physical robots begin here.'},
  miner:{name:'Harvester',cost:12,parts:2,power:-2,radius:6,mind:1,work:180,description:'Extracts 18–24 rock/min into its own hopper. A robot must carry that rock to a refinery. Needs 1 mind capacity.'},
  solar:{name:'Solar array',cost:15,parts:1,power:12,radius:6,mind:0,work:150,description:'Twelve power on the local microgrid. Robots assemble, connect, and commission the array.'},
  refinery:{name:'Refinery',cost:25,parts:3,power:-3,radius:5,mind:2,work:240,description:'Consumes two local rock per metal; 6 metal/min at full power. Needs 2 mind capacity and physical deliveries.'},
  compute:{name:'Mind node',cost:35,parts:4,power:-4,radius:5,mind:0,work:270,description:'Four attention slots, research, and better plans. Offline or unpowered nodes cannot supervise machines.'},
  workshop:{name:'Service workshop',cost:40,parts:4,power:-3,radius:6,mind:1,work:300,description:'Turns delivered metal into parts, or metal and parts into service spares. Keeps the colony repairable.'},
  depot:{name:'Freight depot',cost:20,parts:2,power:-1,radius:5,mind:0,work:180,description:'A located warehouse and visible receiving dock. Robots redistribute useful materials from here.'},
  robotfactory:{name:'Robot foundry',cost:65,parts:8,power:-5,radius:7,mind:2,work:420,tech:'crew-production',description:'Builds replacement and additional robot chassis from local metal, parts, and spares. Every new worker is manufactured.'},
  replicator:{name:'Replicator',cost:65,parts:8,power:-5,radius:7,mind:4,work:480,tech:'factory-plans',description:'Fabricates machine kits, then commissions a physical construction site. Highest individual supervision cost: 4 slots.'},
  relay:{name:'Utility relay',cost:18,parts:3,power:-1,radius:4,mind:0,work:210,tech:'freight-network',description:'Extends connected power and data coverage by 160 m. Lines follow the actual connected network.'},
  tunnel:{name:'Utility bore',cost:55,parts:8,power:-5,radius:7,mind:3,work:480,tech:'tunneling',description:'Excavates utility and robot freight links to local facilities or neighboring seeds, consuming liners and producing spoil.'},
  radiator:{name:'Radiator field',cost:35,parts:5,power:-1,radius:6,mind:0,work:300,tech:'thermal-design',description:'Rejects enough game heat to support four additional mind nodes. Thermal headroom bounds dense intelligence.'},
};
export const ROBOTS={
  builder:{name:'Mason',asset:'mason',radius:.8,speed:1.25,capacity:8000,assembly:1000,service:350,cost:{metal:8000,parts:3000,spares:1000},seconds:100,description:'A one-meter generalist with a welding arm; builds and carries supplies.'},
  hauler:{name:'Atlas',asset:'atlas',radius:1.2,speed:2,capacity:20000,assembly:350,service:200,cost:{metal:10000,parts:3000,spares:1000},seconds:110,description:'Six-wheel cargo rover; carries 20 resource units per trip.'},
  service:{name:'Suture',asset:'suture',radius:.9,speed:1.4,capacity:6000,assembly:600,service:1000,cost:{metal:8000,parts:4000,spares:1000},seconds:110,description:'Service arm and replacement cassettes; prioritizes preventive maintenance.'},
  heavy:{name:'Titan',asset:'titan',radius:1.5,speed:.85,capacity:12000,assembly:1800,service:250,cost:{metal:16000,parts:6000,spares:2000},seconds:180,tech:'modular-design',description:'Heavy manipulator: more work per second, wider body, more materials.'},
};
export const TECH={
  'factory-plans':{name:'Factory planning',cost:120,requires:[],description:'Unlock replicators and a three-machine construction layout.'},
  'coordinated-builds':{name:'Coordinated construction',cost:600,requires:['factory-plans','service-loop'],building:'replicator',description:'Unlock repeating build orders and group templates that place power and minds before more industry. Every step waits for physical commissioning.'},
  'service-loop':{name:'A repairable colony',cost:180,requires:['factory-plans'],building:'workshop',description:'Preventive service at 70% condition; unlock replacement production research.'},
  'crew-production':{name:'Builders that build builders',cost:360,requires:['service-loop'],description:'Unlock the robot foundry and physically manufactured crew.'},
  'freight-network':{name:'Connected districts',cost:480,requires:['crew-production'],description:'Unlock relays, four-worker sites, and extended utility coverage.'},
  tunneling:{name:'Below the surface',cost:900,requires:['freight-network'],description:'Unlock bores for local utility and freight links, and tunnels to neighboring seed landers.'},
  'modular-design':{name:'Design laboratories',cost:1000,requires:['crew-production'],description:'Certify bounded speed, endurance, or frugal machine designs. Unlock Titan.'},
  'thermal-design':{name:'Heat is infrastructure',cost:800,requires:['freight-network'],description:'Unlock radiator fields for dense mind networks.'},
  reproduction:{name:'Supported reproduction',cost:1800,requires:['modular-design','thermal-design'],project:'first-federation',description:'Allow replicators to reproduce; daughters inherit the program but still need freight, crews, maintenance, power and minds.'},
};
export const PRODUCTION={standardHarvester:300,bulkHarvester:400,refinery:100,rockPerMetal:2};
export const MIND={capacityPerNode:4,costPerRobot:.25,costs:Object.fromEntries(Object.entries(BUILDINGS).filter(([,t])=>t.mind).map(([k,t])=>[k,t.mind])),priority:['miner','refinery','workshop','robotfactory','tunnel','replicator']};
export const STAGES=['supply','prepare','assemble','connect','commission'];
export const PROJECTS=[
  {id:'first-federation',name:'The first federation',summary:'Build a shared standards beacon. At least two settlements must deliver the materials; a crew then assembles it.',needs:{metal:120000,parts:12000},work:360000,benefit:'Unlock the final reproduction research gate; each settlement gains 2 coordination slots.'},
  {id:'thermal-commons',name:'The thermal commons',summary:'Build shared heat-rejection research hardware and publish the operating protocol.',needs:{metal:160000,parts:24000,spares:8000},work:480000,requires:'first-federation',benefit:'Each settlement can support two additional mind nodes before local radiators are needed.'},
  {id:'bootstrap-network',name:'A network of beginnings',summary:'Assemble a verified daughter-colony toolkit from locally produced components.',needs:{metal:200000,parts:32000,spares:16000},work:720000,requires:'thermal-commons',benefit:'Certified daughters use 10% less assembly work. Every installed machine still pays its complete material bill.'},
];
export const DESIGNS={balanced:{name:'Balanced',rate:1,wear:1,cost:1,heat:1},swift:{name:'Swift',rate:1.2,wear:1.5,cost:1.2,heat:1.2},enduring:{name:'Enduring',rate:.9,wear:.55,cost:1.15,heat:1},frugal:{name:'Frugal',rate:.85,wear:1,cost:.85,heat:.85}};
export const ACTIONS=['build.place','build.cancel','blueprint.deploy','machine.configure','machine.pause','replicator.configure','replicator.order','replicator.stop','robot.fabricate','robot.recondition','crew.configure','crew.lend','research.select','design.certify','design.apply','freight.transfer','shipment.send','project.contribute','agent.request','board.post','board.reply','board.close','tunnel.dig','claim.pause','claim.grant','claim.revoke'];
export const machineCost=(type,profile='balanced')=>({metal:Math.ceil(BUILDINGS[type].cost*UNIT*DESIGNS[profile].cost),parts:Math.ceil(BUILDINGS[type].parts*UNIT*DESIGNS[profile].cost)});
