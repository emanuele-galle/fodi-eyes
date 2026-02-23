import type { Hotspot, ConflictZone, MilitaryBase, UnderseaCable, NuclearFacility, StrategicWaterway, APTGroup, EconomicCenter, Spaceport, CriticalMineralProject } from '@/types';

// Hotspot levels are NOT hardcoded - they are dynamically calculated based on news activity
// All hotspots start at 'low' and rise to 'elevated' or 'high' based on matching news items
// Escalation scores: 1=stable, 2=watchlist, 3=elevated, 4=high tension, 5=critical/active conflict
export const INTEL_HOTSPOTS: Hotspot[] = [
  {
    id: 'roma',
    name: 'Roma',
    subtext: 'Governo IT',
    lat: 41.9,
    lon: 12.5,
    location: 'Roma, Italia',
    keywords: ['palazzo chigi', 'parlamento', 'governo italiano', 'meloni', 'mattarella', 'roma', 'italia', 'quirinale'],
    agencies: ['Governo', 'Parlamento'],
    description: 'Centro decisionale italiano, sede governo e istituzioni',
    status: 'Monitoring',
  },
  {
    id: 'tripoli',
    name: 'Tripoli',
    subtext: 'Libia/Migrazioni',
    lat: 32.9,
    lon: 13.18,
    location: 'Tripoli, Libia',
    keywords: ['libia', 'libya', 'tripoli', 'migranti', 'mediterraneo', 'guardia costiera'],
    agencies: ['UNHCR', 'IOM', 'Frontex'],
    description: 'Libia - area di interesse strategico per migrazione e energia',
    status: 'Monitoring',
    escalationScore: 3,
    escalationTrend: 'stable' as const,
    escalationIndicators: ['Rotte migratorie attive', 'Instabilita politica', 'Traffico esseri umani'],
  },
  {
    id: 'mediterraneo',
    name: 'Mediterraneo',
    subtext: 'Rotte migratorie',
    lat: 35.0,
    lon: 18.0,
    location: 'Mar Mediterraneo Centrale',
    keywords: ['mediterraneo', 'lampedusa', 'migranti', 'sbarchi', 'ONG', 'guardia costiera', 'SAR', 'frontex'],
    agencies: ['Frontex', 'UNHCR', 'IOM', 'Guardia Costiera IT'],
    description: 'Rotte migratorie e commerciali nel Mediterraneo centrale',
    status: 'Monitoring',
    escalationScore: 3,
    escalationTrend: 'stable' as const,
    escalationIndicators: ['Sbarchi Lampedusa', 'Operazioni SAR', 'Accordi Tunisia'],
  },
  {
    id: 'balcani',
    name: 'Balcani',
    subtext: 'Stabilita regionale',
    lat: 43.0,
    lon: 20.0,
    location: 'Balcani Occidentali',
    keywords: ['serbia', 'kosovo', 'bosnia', 'montenegro', 'albania', 'macedonia', 'balcani'],
    agencies: ['NATO', 'EUFOR', 'KFOR'],
    description: 'Balcani occidentali - area di integrazione europea',
    status: 'Monitoring',
    escalationScore: 2,
    escalationTrend: 'stable' as const,
    escalationIndicators: ['Tensioni Serbia-Kosovo', 'Processo adesione EU', 'Rotta balcanica migranti'],
  },
  {
    id: 'moscow',
    name: 'Moscow',
    subtext: 'Osservazione geopolitica',
    lat: 55.75,
    lon: 37.6,
    location: 'Russia',
    keywords: ['kremlin', 'putin', 'russia', 'moscow', 'russian'],
    agencies: ['Kremlin'],
    description: 'Mosca - osservazione geopolitica',
    status: 'Monitoring',
    escalationScore: 4,
    escalationTrend: 'stable',
    escalationIndicators: ['Ukraine war ongoing', 'Mobilization potential', 'Nuclear rhetoric'],
  },
  {
    id: 'kyiv',
    name: 'Kyiv',
    subtext: 'Conflitto in corso',
    lat: 50.45,
    lon: 30.5,
    location: 'Ukraine',
    keywords: ['kyiv', 'ukraine', 'zelensky', 'ukrainian', 'kiev'],
    agencies: ['Ukrainian Armed Forces'],
    description: 'Kyiv - conflitto in corso, impatto su Europa',
    status: 'Monitoring',
    escalationScore: 5,
    escalationTrend: 'stable',
    escalationIndicators: ['Active combat operations', 'Western weapons deliveries', 'Drone warfare escalation'],
  },
  {
    id: 'brussels',
    name: 'Brussels',
    subtext: 'EU/NATO HQ',
    lat: 50.85,
    lon: 4.35,
    location: 'Belgium (NATO HQ)',
    keywords: ['nato', 'brussels', 'eu', 'european union', 'europe'],
    agencies: ['NATO', 'EU Commission'],
    description: 'Centro decisionale europeo (EU, NATO HQ)',
    status: 'Monitoring',
  },
  {
    id: 'ankara',
    name: 'Ankara',
    subtext: 'Crocevia geopolitico',
    lat: 39.9,
    lon: 32.9,
    location: 'Turkey',
    keywords: ['turkey', 'ankara', 'erdogan', 'turkish'],
    agencies: ['Turkish Armed Forces'],
    description: 'Turchia - crocevia geopolitico',
    status: 'Monitoring',
  },
  {
    id: 'tehran',
    name: 'Tehran',
    subtext: 'Dinamiche regionali',
    lat: 35.7,
    lon: 51.4,
    location: 'Iran',
    keywords: ['iran', 'tehran', 'khamenei', 'persian', 'iranian'],
    agencies: ['Iran'],
    description: 'Iran - dinamiche regionali Medio Oriente',
    status: 'Monitoring',
    escalationScore: 4,
    escalationTrend: 'escalating',
    escalationIndicators: ['Near-weapons-grade enrichment', 'Proxy attacks', 'Houthi coordination'],
  },
  {
    id: 'cairo',
    name: 'Cairo',
    subtext: 'Egitto/Suez',
    lat: 30.0,
    lon: 31.2,
    location: 'Egypt',
    keywords: ['egypt', 'cairo', 'sisi', 'egyptian', 'suez'],
    agencies: ['Egyptian Armed Forces'],
    description: 'Egitto - partner ENI, Canale di Suez',
    status: 'Monitoring',
  },
];

export const STRATEGIC_WATERWAYS: StrategicWaterway[] = [
  { id: 'suez', name: 'SUEZ CANAL', lat: 30.5, lon: 32.3, description: 'Europe-Asia shipping' },
  { id: 'gibraltar', name: 'STRAIT OF GIBRALTAR', lat: 35.9, lon: -5.6, description: 'Mediterranean access, NATO control' },
  { id: 'bosphorus', name: 'BOSPHORUS STRAIT', lat: 41.1, lon: 29.0, description: 'Black Sea access, Turkey control' },
  { id: 'dardanelles', name: 'DARDANELLES', lat: 40.2, lon: 26.4, description: 'Aegean-Marmara link, Turkey control' },
];

export const APT_GROUPS: APTGroup[] = [
  { id: 'apt28', name: 'APT28/29', aka: 'Fancy Bear/Cozy Bear', sponsor: 'Russia', lat: 55.0, lon: 40.0 },
  { id: 'apt41', name: 'APT41', aka: 'Double Dragon', sponsor: 'China', lat: 38.0, lon: 118.0 },
  { id: 'lazarus', name: 'Lazarus', aka: 'Hidden Cobra', sponsor: 'North Korea', lat: 38.5, lon: 127.0 },
  { id: 'apt33', name: 'APT33/35', aka: 'Elfin/Charming Kitten', sponsor: 'Iran', lat: 34.0, lon: 53.0 },
];

export const CONFLICT_ZONES: ConflictZone[] = [
  {
    id: 'ukraine',
    name: 'Ukraine Conflict',
    coords: [[30, 52], [40, 52], [40, 44], [30, 44]],
    center: [35, 48],
    intensity: 'high',
    parties: ['Russia', 'Ukraine', 'NATO (support)'],
    casualties: '500,000+ (est.)',
    displaced: '6.5M+ refugees',
    keywords: ['ukraine', 'russia', 'zelensky', 'putin', 'donbas', 'crimea'],
    startDate: 'Feb 24, 2022',
    location: 'Eastern Ukraine (Donetsk, Luhansk)',
    description: 'Full-scale Russian invasion of Ukraine. Active frontlines in Donetsk, Luhansk, Zaporizhzhia, and Kherson oblasts.',
    keyDevelopments: ['Battle of Bakhmut', 'Kursk incursion', 'Black Sea drone strikes', 'Infrastructure attacks'],
  },
  {
    id: 'yemen_redsea',
    name: 'Red Sea Crisis',
    coords: [[42, 12], [42, 16], [44, 16], [45, 13], [44, 12]],
    center: [43, 14],
    intensity: 'high',
    parties: ['Houthis', 'US/UK Coalition', 'Yemen Govt'],
    casualties: 'Unknown (Maritime)',
    displaced: '4.5M+ (Yemen Civil War)',
    keywords: ['houthi', 'red sea', 'yemen', 'missile', 'drone', 'ship'],
    startDate: 'Nov 19, 2023',
    location: 'Red Sea & Gulf of Aden, Yemen',
    description: 'Houthi maritime campaign against commercial shipping. US/UK airstrikes on Houthi targets. Impacts Mediterranean shipping via Suez.',
    keyDevelopments: ['Ship hijackings', 'US airstrikes', 'Cable cuts', 'Sinking of Rubymar'],
  },
];

// Installazioni NATO in Italia e Europa - ~20 basi rilevanti
export const MILITARY_BASES: MilitaryBase[] = [
  // Italia
  { id: 'aviano', name: 'Aviano AB', lat: 46.07, lon: 12.59, type: 'us-nato', description: 'USAF 31st Fighter Wing. Base aerea NATO nel Friuli.' },
  { id: 'sigonella', name: 'NAS Sigonella', lat: 37.40, lon: 14.92, type: 'us-nato', description: 'Naval Air Station. Hub logistico Mediterraneo, Sicilia.' },
  { id: 'ghedi', name: 'Ghedi AB', lat: 45.43, lon: 10.27, type: 'us-nato', description: 'AMI/USAF. 6° Stormo Tornado, nuclear sharing NATO.' },
  { id: 'camp_darby', name: 'Camp Darby', lat: 43.63, lon: 10.29, type: 'us-nato', description: 'US Army. Deposito logistico, Pisa/Livorno.' },
  { id: 'napoli_jfc', name: 'JFC Naples', lat: 40.83, lon: 14.25, type: 'us-nato', description: 'Allied Joint Force Command Naples. Comando NATO Sud.' },
  { id: 'vicenza', name: 'Caserma Ederle/Del Din', lat: 45.56, lon: 11.54, type: 'us-nato', description: 'US Army SETAF-AF. 173rd Airborne Brigade.' },
  { id: 'la_maddalena', name: 'La Maddalena', lat: 41.21, lon: 9.41, type: 'us-nato', description: 'Ex base sommergibili US Navy, Sardegna.' },
  { id: 'gaeta', name: 'NSA Gaeta', lat: 41.21, lon: 13.57, type: 'us-nato', description: 'US Navy 6th Fleet flagship homeport.' },
  { id: 'decimomannu', name: 'Decimomannu AB', lat: 39.35, lon: 8.97, type: 'us-nato', description: 'Base addestramento NATO, Sardegna.' },
  { id: 'gioia_del_colle', name: 'Gioia del Colle AB', lat: 40.77, lon: 16.93, type: 'us-nato', description: 'AMI 36° Stormo Eurofighter, Puglia.' },
  { id: 'amendola', name: 'Amendola AB', lat: 41.54, lon: 15.72, type: 'us-nato', description: 'AMI 32° Stormo, droni MQ-9 Reaper, Puglia.' },
  { id: 'trapani_birgi', name: 'Trapani-Birgi AB', lat: 37.91, lon: 12.49, type: 'us-nato', description: 'AMI 37° Stormo Eurofighter, Sicilia.' },
  // Europa NATO
  { id: 'ramstein', name: 'Ramstein AB', lat: 49.44, lon: 7.77, type: 'us-nato', description: 'USAF HQ Europe. Centro comando aereo NATO, Germania.' },
  { id: 'incirlik', name: 'Incirlik AB', lat: 37.0, lon: 35.43, type: 'us-nato', description: 'USAF/Turkish base. Deposito nucleare NATO, Turchia.' },
  { id: 'souda_bay', name: 'Souda Bay', lat: 35.49, lon: 24.12, type: 'us-nato', description: 'Base navale NATO, Creta (Grecia).' },
  { id: 'rota', name: 'Naval Station Rota', lat: 36.62, lon: -6.35, type: 'us-nato', description: 'US/Spanish naval base. Aegis destroyers, Spagna.' },
  { id: 'lajes', name: 'Lajes Field', lat: 38.77, lon: -27.09, type: 'us-nato', description: 'Base aerea NATO, Azzorre (Portogallo).' },
  { id: 'keflavik', name: 'Keflavik', lat: 63.97, lon: -22.60, type: 'us-nato', description: 'Base NATO sorveglianza Nord Atlantico, Islanda.' },
  { id: 'deveselu', name: 'Deveselu', lat: 43.76, lon: 24.37, type: 'us-nato', description: 'Aegis Ashore BMD site, Romania.' },
  { id: 'redzikowo', name: 'Redzikowo', lat: 54.48, lon: 17.10, type: 'us-nato', description: 'Aegis Ashore BMD site, Polonia.' },
];

// Cavi sottomarini che toccano Italia/Mediterraneo
export const UNDERSEA_CABLES: UnderseaCable[] = [
  {
    id: 'seamewe6',
    name: 'SEA-ME-WE 6',
    points: [[103.8, 1.3], [80.0, 6.0], [55.0, 24.0], [43.0, 12.0], [32.5, 30.0], [12.5, 42.0], [-9.0, 38.0]],
    major: true,
    capacityTbps: 100,
    rfsYear: 2025,
    owners: ['Consortium'],
    landingPoints: [
      { country: 'SG', countryName: 'Singapore', city: 'Singapore', lat: 1.35, lon: 103.82 },
      { country: 'IN', countryName: 'India', city: 'Mumbai', lat: 19.08, lon: 72.88 },
      { country: 'AE', countryName: 'UAE', city: 'Fujairah', lat: 25.13, lon: 56.34 },
      { country: 'SA', countryName: 'Saudi Arabia', city: 'Jeddah', lat: 21.49, lon: 39.19 },
      { country: 'EG', countryName: 'Egypt', city: 'Suez', lat: 29.97, lon: 32.55 },
      { country: 'FR', countryName: 'France', city: 'Marseille', lat: 43.30, lon: 5.37 },
    ],
    countriesServed: [
      { country: 'SG', capacityShare: 0.10, isRedundant: true },
      { country: 'IN', capacityShare: 0.15, isRedundant: true },
      { country: 'AE', capacityShare: 0.12, isRedundant: true },
      { country: 'SA', capacityShare: 0.08, isRedundant: true },
      { country: 'EG', capacityShare: 0.10, isRedundant: true },
    ],
  },
  {
    id: 'flag',
    name: 'FLAG Europe-Asia',
    points: [[0.0, 51.0], [-6.0, 36.0], [32.5, 30.0], [55.0, 24.0], [73.0, 15.0], [103.8, 1.3], [139.7, 35.7]],
    major: true,
    capacityTbps: 10,
    rfsYear: 1997,
    owners: ['Global Cloud Xchange'],
    landingPoints: [
      { country: 'GB', countryName: 'United Kingdom', city: 'Porthcurno', lat: 50.04, lon: -5.66 },
      { country: 'EG', countryName: 'Egypt', city: 'Alexandria', lat: 31.20, lon: 29.92 },
      { country: 'AE', countryName: 'UAE', city: 'Dubai', lat: 25.20, lon: 55.27 },
      { country: 'IN', countryName: 'India', city: 'Mumbai', lat: 19.08, lon: 72.88 },
      { country: 'SG', countryName: 'Singapore', city: 'Singapore', lat: 1.35, lon: 103.82 },
      { country: 'JP', countryName: 'Japan', city: 'Tokyo', lat: 35.69, lon: 139.69 },
    ],
    countriesServed: [
      { country: 'IN', capacityShare: 0.23, isRedundant: false },
      { country: 'AE', capacityShare: 0.18, isRedundant: true },
      { country: 'SA', capacityShare: 0.12, isRedundant: true },
      { country: 'EG', capacityShare: 0.09, isRedundant: true },
      { country: 'PK', capacityShare: 0.07, isRedundant: false },
    ],
  },
  {
    id: '2africa',
    name: '2Africa',
    points: [[0.0, 51.0], [-9.0, 38.0], [-17.0, 15.0], [4.0, 6.0], [18.0, -34.0], [55.0, -20.0], [55.0, 24.0], [32.5, 30.0]],
    major: true,
    capacityTbps: 180,
    rfsYear: 2024,
    owners: ['Meta', 'MTN', 'Vodafone', 'Orange'],
    landingPoints: [
      { country: 'GB', countryName: 'United Kingdom', city: 'Bude', lat: 50.83, lon: -4.55 },
      { country: 'PT', countryName: 'Portugal', city: 'Lisbon', lat: 38.72, lon: -9.14 },
      { country: 'SN', countryName: 'Senegal', city: 'Dakar', lat: 14.69, lon: -17.44 },
      { country: 'NG', countryName: 'Nigeria', city: 'Lagos', lat: 6.52, lon: 3.38 },
      { country: 'ZA', countryName: 'South Africa', city: 'Cape Town', lat: -33.93, lon: 18.42 },
      { country: 'KE', countryName: 'Kenya', city: 'Mombasa', lat: -4.04, lon: 39.67 },
      { country: 'SA', countryName: 'Saudi Arabia', city: 'Jeddah', lat: 21.49, lon: 39.19 },
      { country: 'EG', countryName: 'Egypt', city: 'Port Said', lat: 31.26, lon: 32.30 },
    ],
    countriesServed: [
      { country: 'NG', capacityShare: 0.30, isRedundant: true },
      { country: 'ZA', capacityShare: 0.20, isRedundant: true },
      { country: 'KE', capacityShare: 0.25, isRedundant: true },
      { country: 'SN', capacityShare: 0.35, isRedundant: false },
      { country: 'EG', capacityShare: 0.08, isRedundant: true },
    ],
  },
  {
    id: 'eassy',
    name: 'EASSy',
    points: [[18.0, -34.0], [32.0, -26.0], [40.0, -15.0], [44.0, -12.0], [50.0, -20.0], [55.0, 24.0]],
    major: true,
    capacityTbps: 10,
    rfsYear: 2010,
    owners: ['Consortium of 16 telecom companies'],
    landingPoints: [
      { country: 'ZA', countryName: 'South Africa', city: 'Mtunzini', lat: -28.95, lon: 31.75 },
      { country: 'MZ', countryName: 'Mozambique', city: 'Maputo', lat: -25.97, lon: 32.58 },
      { country: 'TZ', countryName: 'Tanzania', city: 'Dar es Salaam', lat: -6.79, lon: 39.28 },
      { country: 'KE', countryName: 'Kenya', city: 'Mombasa', lat: -4.04, lon: 39.67 },
      { country: 'DJ', countryName: 'Djibouti', city: 'Djibouti', lat: 11.59, lon: 43.15 },
    ],
    countriesServed: [
      { country: 'KE', capacityShare: 0.20, isRedundant: true },
      { country: 'TZ', capacityShare: 0.30, isRedundant: false },
      { country: 'MZ', capacityShare: 0.25, isRedundant: false },
      { country: 'MG', capacityShare: 0.40, isRedundant: false },
    ],
  },
  {
    id: 'falcon',
    name: 'Falcon',
    points: [[55.0, 24.0], [56.0, 25.0], [51.5, 26.0], [48.0, 29.0]],
    major: true,
    capacityTbps: 5,
    rfsYear: 2006,
    owners: ['GBI'],
    landingPoints: [
      { country: 'AE', countryName: 'UAE', city: 'Fujairah', lat: 25.13, lon: 56.34 },
      { country: 'OM', countryName: 'Oman', city: 'Muscat', lat: 23.59, lon: 58.38 },
      { country: 'BH', countryName: 'Bahrain', city: 'Manama', lat: 26.23, lon: 50.59 },
      { country: 'KW', countryName: 'Kuwait', city: 'Kuwait City', lat: 29.38, lon: 47.98 },
    ],
    countriesServed: [
      { country: 'AE', capacityShare: 0.08, isRedundant: true },
      { country: 'OM', capacityShare: 0.15, isRedundant: true },
      { country: 'BH', capacityShare: 0.20, isRedundant: true },
      { country: 'KW', capacityShare: 0.15, isRedundant: true },
    ],
  },
];

// Impianti nucleari EU
export const NUCLEAR_FACILITIES: NuclearFacility[] = [
  // France
  { id: 'gravelines', name: 'Gravelines', lat: 51.01, lon: 2.14, type: 'plant', status: 'active' },
  { id: 'paluel', name: 'Paluel', lat: 49.86, lon: 0.63, type: 'plant', status: 'active' },
  { id: 'cattenom', name: 'Cattenom', lat: 49.42, lon: 6.22, type: 'plant', status: 'active' },
  { id: 'bugey', name: 'Bugey', lat: 45.80, lon: 5.27, type: 'plant', status: 'active' },
  { id: 'tricastin', name: 'Tricastin', lat: 44.33, lon: 4.73, type: 'plant', status: 'active' },
  { id: 'cruas', name: 'Cruas', lat: 44.63, lon: 4.76, type: 'plant', status: 'active' },
  { id: 'blayais', name: 'Blayais', lat: 45.26, lon: -0.69, type: 'plant', status: 'active' },
  { id: 'golfech', name: 'Golfech', lat: 44.11, lon: 0.85, type: 'plant', status: 'active' },
  { id: 'flamanville', name: 'Flamanville', lat: 49.54, lon: -1.88, type: 'plant', status: 'active' },
  { id: 'la_hague', name: 'La Hague', lat: 49.68, lon: -1.88, type: 'enrichment', status: 'active' },
  // UK
  { id: 'hinkley_point', name: 'Hinkley Point', lat: 51.21, lon: -3.13, type: 'plant', status: 'active' },
  { id: 'sizewell', name: 'Sizewell', lat: 52.21, lon: 1.62, type: 'plant', status: 'active' },
  { id: 'heysham', name: 'Heysham', lat: 54.03, lon: -2.92, type: 'plant', status: 'active' },
  { id: 'torness', name: 'Torness', lat: 55.97, lon: -2.41, type: 'plant', status: 'active' },
  { id: 'sellafield', name: 'Sellafield', lat: 54.42, lon: -3.50, type: 'enrichment', status: 'active' },
  // Germany (shutdown)
  { id: 'neckarwestheim', name: 'Neckarwestheim', lat: 49.04, lon: 9.18, type: 'plant', status: 'inactive' },
  { id: 'isar', name: 'Isar', lat: 48.61, lon: 12.29, type: 'plant', status: 'inactive' },
  { id: 'emsland', name: 'Emsland', lat: 52.47, lon: 7.32, type: 'plant', status: 'inactive' },
  // Ukraine
  { id: 'zaporizhzhia', name: 'Zaporizhzhia NPP', lat: 47.51, lon: 34.58, type: 'plant', status: 'contested' },
  { id: 'rivne', name: 'Rivne NPP', lat: 51.33, lon: 25.88, type: 'plant', status: 'active' },
  { id: 'south_ukraine', name: 'South Ukraine NPP', lat: 47.81, lon: 31.22, type: 'plant', status: 'active' },
  { id: 'khmelnytskyi', name: 'Khmelnytskyi NPP', lat: 50.30, lon: 26.65, type: 'plant', status: 'active' },
  { id: 'chernobyl', name: 'Chernobyl', lat: 51.39, lon: 30.10, type: 'plant', status: 'inactive' },
  // Central/Eastern Europe
  { id: 'paks', name: 'Paks', lat: 46.57, lon: 18.86, type: 'plant', status: 'active' },
  { id: 'temelin', name: 'Temelin', lat: 49.18, lon: 14.38, type: 'plant', status: 'active' },
  { id: 'dukovany', name: 'Dukovany', lat: 49.09, lon: 16.15, type: 'plant', status: 'active' },
  { id: 'mochovce', name: 'Mochovce', lat: 48.28, lon: 18.44, type: 'plant', status: 'active' },
  { id: 'kozloduy', name: 'Kozloduy', lat: 43.75, lon: 23.63, type: 'plant', status: 'active' },
  { id: 'cernavoda', name: 'Cernavoda', lat: 44.32, lon: 28.05, type: 'plant', status: 'active' },
  { id: 'krsko', name: 'Krsko', lat: 45.94, lon: 15.52, type: 'plant', status: 'active' },
  // Nordic
  { id: 'ringhals', name: 'Ringhals', lat: 57.26, lon: 12.11, type: 'plant', status: 'active' },
  { id: 'forsmark', name: 'Forsmark', lat: 60.41, lon: 18.17, type: 'plant', status: 'active' },
  { id: 'oskarshamn', name: 'Oskarshamn', lat: 57.42, lon: 16.67, type: 'plant', status: 'active' },
  { id: 'olkiluoto', name: 'Olkiluoto', lat: 61.24, lon: 21.44, type: 'plant', status: 'active' },
  { id: 'loviisa', name: 'Loviisa', lat: 60.37, lon: 26.35, type: 'plant', status: 'active' },
  // Benelux/Iberia
  { id: 'borssele', name: 'Borssele', lat: 51.43, lon: 3.72, type: 'plant', status: 'active' },
  { id: 'doel', name: 'Doel', lat: 51.33, lon: 4.26, type: 'plant', status: 'active' },
  { id: 'tihange', name: 'Tihange', lat: 50.53, lon: 5.27, type: 'plant', status: 'active' },
  { id: 'almaraz', name: 'Almaraz', lat: 39.81, lon: -5.70, type: 'plant', status: 'active' },
  { id: 'cofrentes', name: 'Cofrentes', lat: 39.21, lon: -1.05, type: 'plant', status: 'active' },
  { id: 'asco', name: 'Asco', lat: 41.20, lon: 0.57, type: 'plant', status: 'active' },
  { id: 'vandellos', name: 'Vandellos', lat: 40.95, lon: 0.87, type: 'plant', status: 'active' },
  { id: 'trillo', name: 'Trillo', lat: 40.70, lon: -2.62, type: 'plant', status: 'active' },
];

export const SANCTIONED_COUNTRIES: Record<number, 'severe' | 'high' | 'moderate'> = {
  408: 'severe',   // North Korea
  728: 'severe',   // South Sudan
  760: 'severe',   // Syria
  364: 'high',     // Iran
  643: 'high',     // Russia
  112: 'high',     // Belarus
  862: 'moderate', // Venezuela
  104: 'moderate', // Myanmar
  178: 'moderate', // Congo
};

export const MAP_URLS = {
  world: 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json',
  us: 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json',
};

// Global Economic Centers - Stock Exchanges, Central Banks, Financial Hubs
export const ECONOMIC_CENTERS: EconomicCenter[] = [
  // Americas
  { id: 'nyse', name: 'NYSE', type: 'exchange', lat: 40.7069, lon: -74.0089, country: 'USA', marketHours: { open: '09:30', close: '16:00', timezone: 'America/New_York' }, description: 'New York Stock Exchange - World\'s largest stock exchange' },
  { id: 'nasdaq', name: 'NASDAQ', type: 'exchange', lat: 40.7569, lon: -73.9896, country: 'USA', marketHours: { open: '09:30', close: '16:00', timezone: 'America/New_York' }, description: 'Tech-heavy exchange' },
  { id: 'fed', name: 'Federal Reserve', type: 'central-bank', lat: 38.8927, lon: -77.0459, country: 'USA', description: 'US Central Bank - Controls USD monetary policy' },
  { id: 'cme', name: 'CME Group', type: 'exchange', lat: 41.8819, lon: -87.6278, country: 'USA', description: 'Chicago Mercantile Exchange - Futures & derivatives' },
  { id: 'tsx', name: 'TSX', type: 'exchange', lat: 43.6489, lon: -79.3850, country: 'Canada', marketHours: { open: '09:30', close: '16:00', timezone: 'America/Toronto' }, description: 'Toronto Stock Exchange' },
  { id: 'bovespa', name: 'B3', type: 'exchange', lat: -23.5505, lon: -46.6333, country: 'Brazil', description: 'Brazilian Stock Exchange (B3/Bovespa)' },
  // Europe
  { id: 'lse', name: 'LSE', type: 'exchange', lat: 51.5145, lon: -0.0940, country: 'UK', marketHours: { open: '08:00', close: '16:30', timezone: 'Europe/London' }, description: 'London Stock Exchange' },
  { id: 'boe', name: 'Bank of England', type: 'central-bank', lat: 51.5142, lon: -0.0880, country: 'UK', description: 'UK Central Bank' },
  { id: 'ecb', name: 'ECB', type: 'central-bank', lat: 50.1096, lon: 8.6732, country: 'Germany', description: 'European Central Bank - Controls EUR' },
  { id: 'euronext', name: 'Euronext', type: 'exchange', lat: 48.8690, lon: 2.3364, country: 'France', marketHours: { open: '09:00', close: '17:30', timezone: 'Europe/Paris' }, description: 'Pan-European Exchange (Paris, Amsterdam, Brussels, Lisbon)' },
  { id: 'dax', name: 'Deutsche Borse', type: 'exchange', lat: 50.1109, lon: 8.6821, country: 'Germany', marketHours: { open: '09:00', close: '17:30', timezone: 'Europe/Berlin' }, description: 'Frankfurt Stock Exchange - DAX' },
  { id: 'six', name: 'SIX Swiss', type: 'exchange', lat: 47.3769, lon: 8.5417, country: 'Switzerland', description: 'Swiss Exchange' },
  { id: 'snb', name: 'SNB', type: 'central-bank', lat: 46.9480, lon: 7.4474, country: 'Switzerland', description: 'Swiss National Bank' },
  // Asia-Pacific
  { id: 'tse', name: 'Tokyo SE', type: 'exchange', lat: 35.6830, lon: 139.7744, country: 'Japan', marketHours: { open: '09:00', close: '15:00', timezone: 'Asia/Tokyo' }, description: 'Tokyo Stock Exchange - Nikkei' },
  { id: 'boj', name: 'Bank of Japan', type: 'central-bank', lat: 35.6855, lon: 139.7579, country: 'Japan', description: 'Japan Central Bank - Controls JPY' },
  { id: 'sse', name: 'Shanghai SE', type: 'exchange', lat: 31.2304, lon: 121.4737, country: 'China', marketHours: { open: '09:30', close: '15:00', timezone: 'Asia/Shanghai' }, description: 'Shanghai Stock Exchange' },
  { id: 'szse', name: 'Shenzhen SE', type: 'exchange', lat: 22.5431, lon: 114.0579, country: 'China', description: 'Shenzhen Stock Exchange - Tech focus' },
  { id: 'pboc', name: 'PBOC', type: 'central-bank', lat: 39.9208, lon: 116.4074, country: 'China', description: 'People\'s Bank of China - Controls CNY' },
  { id: 'hkex', name: 'HKEX', type: 'exchange', lat: 22.2833, lon: 114.1577, country: 'Hong Kong', marketHours: { open: '09:30', close: '16:00', timezone: 'Asia/Hong_Kong' }, description: 'Hong Kong Exchange' },
  { id: 'sgx', name: 'SGX', type: 'exchange', lat: 1.2834, lon: 103.8607, country: 'Singapore', description: 'Singapore Exchange' },
  { id: 'mas', name: 'MAS', type: 'central-bank', lat: 1.2789, lon: 103.8536, country: 'Singapore', description: 'Monetary Authority of Singapore' },
  { id: 'kospi', name: 'KRX', type: 'exchange', lat: 37.5665, lon: 126.9780, country: 'South Korea', marketHours: { open: '09:00', close: '15:30', timezone: 'Asia/Seoul' }, description: 'Korea Exchange - KOSPI' },
  { id: 'bse', name: 'BSE', type: 'exchange', lat: 18.9307, lon: 72.8335, country: 'India', marketHours: { open: '09:15', close: '15:30', timezone: 'Asia/Kolkata' }, description: 'Bombay Stock Exchange - Sensex' },
  { id: 'nse', name: 'NSE India', type: 'exchange', lat: 19.0571, lon: 72.8621, country: 'India', description: 'National Stock Exchange - Nifty' },
  { id: 'rbi', name: 'RBI', type: 'central-bank', lat: 18.9322, lon: 72.8351, country: 'India', description: 'Reserve Bank of India' },
  { id: 'asx', name: 'ASX', type: 'exchange', lat: -33.8688, lon: 151.2093, country: 'Australia', marketHours: { open: '10:00', close: '16:00', timezone: 'Australia/Sydney' }, description: 'Australian Securities Exchange' },
  { id: 'rba', name: 'RBA', type: 'central-bank', lat: -33.8654, lon: 151.2105, country: 'Australia', description: 'Reserve Bank of Australia' },
  // Middle East & Africa
  { id: 'tadawul', name: 'Tadawul', type: 'exchange', lat: 24.6877, lon: 46.7219, country: 'Saudi Arabia', marketHours: { open: '10:00', close: '15:00', timezone: 'Asia/Riyadh' }, description: 'Saudi Stock Exchange - Largest in Arab world' },
  { id: 'adx', name: 'ADX', type: 'exchange', lat: 24.4539, lon: 54.3773, country: 'UAE', marketHours: { open: '10:00', close: '14:00', timezone: 'Asia/Dubai' }, description: 'Abu Dhabi Securities Exchange' },
  { id: 'dfm', name: 'DFM', type: 'exchange', lat: 25.2221, lon: 55.2867, country: 'UAE', marketHours: { open: '10:00', close: '14:00', timezone: 'Asia/Dubai' }, description: 'Dubai Financial Market' },
  { id: 'qse', name: 'QSE', type: 'exchange', lat: 25.2854, lon: 51.5310, country: 'Qatar', marketHours: { open: '09:30', close: '13:15', timezone: 'Asia/Qatar' }, description: 'Qatar Stock Exchange' },
  { id: 'bkw', name: 'Boursa Kuwait', type: 'exchange', lat: 29.3759, lon: 47.9774, country: 'Kuwait', marketHours: { open: '09:00', close: '12:30', timezone: 'Asia/Kuwait' }, description: 'Kuwait Stock Exchange' },
  { id: 'bse_bahrain', name: 'Bahrain Bourse', type: 'exchange', lat: 26.2285, lon: 50.5860, country: 'Bahrain', description: 'Bahrain Stock Exchange' },
  { id: 'egx', name: 'EGX', type: 'exchange', lat: 30.0444, lon: 31.2357, country: 'Egypt', marketHours: { open: '10:00', close: '14:30', timezone: 'Africa/Cairo' }, description: 'Egyptian Exchange - Cairo' },
  { id: 'tase', name: 'TASE', type: 'exchange', lat: 32.0853, lon: 34.7818, country: 'Israel', marketHours: { open: '09:59', close: '17:14', timezone: 'Asia/Jerusalem' }, description: 'Tel Aviv Stock Exchange' },
  { id: 'jse', name: 'JSE', type: 'exchange', lat: -26.1447, lon: 28.0381, country: 'South Africa', marketHours: { open: '09:00', close: '17:00', timezone: 'Africa/Johannesburg' }, description: 'Johannesburg Stock Exchange' },
  { id: 'nse_nigeria', name: 'NGX', type: 'exchange', lat: 6.4541, lon: 3.4218, country: 'Nigeria', description: 'Nigerian Exchange Group - Lagos' },
  { id: 'casa', name: 'Casablanca SE', type: 'exchange', lat: 33.5731, lon: -7.5898, country: 'Morocco', description: 'Casablanca Stock Exchange' },
  // Financial Hubs
  { id: 'dubai_hub', name: 'DIFC', type: 'financial-hub', lat: 25.2116, lon: 55.2708, country: 'UAE', description: 'Dubai International Financial Centre' },
  { id: 'cayman', name: 'Cayman Islands', type: 'financial-hub', lat: 19.3133, lon: -81.2546, country: 'Cayman Islands', description: 'Offshore financial center' },
  { id: 'luxembourg', name: 'Luxembourg', type: 'financial-hub', lat: 49.6116, lon: 6.1319, country: 'Luxembourg', description: 'European investment fund center' },
];

export const SPACEPORTS: Spaceport[] = [
  { id: 'ksc', name: 'Kennedy Space Center', lat: 28.57, lon: -80.64, country: 'USA', operator: 'NASA/Space Force', status: 'active', launches: 'High' },
  { id: 'vandenberg', name: 'Vandenberg SFB', lat: 34.74, lon: -120.57, country: 'USA', operator: 'US Space Force', status: 'active', launches: 'Medium' },
  { id: 'boca_chica', name: 'Starbase', lat: 25.99, lon: -97.15, country: 'USA', operator: 'SpaceX', status: 'active', launches: 'High' },
  { id: 'baikonur', name: 'Baikonur Cosmodrome', lat: 45.96, lon: 63.30, country: 'Kazakhstan', operator: 'Roscosmos', status: 'active', launches: 'Medium' },
  { id: 'plesetsk', name: 'Plesetsk Cosmodrome', lat: 62.92, lon: 40.57, country: 'Russia', operator: 'Roscosmos/Military', status: 'active', launches: 'Medium' },
  { id: 'vostochny', name: 'Vostochny Cosmodrome', lat: 51.88, lon: 128.33, country: 'Russia', operator: 'Roscosmos', status: 'active', launches: 'Low' },
  { id: 'jiuquan', name: 'Jiuquan SLC', lat: 40.96, lon: 100.29, country: 'China', operator: 'CNSA', status: 'active', launches: 'High' },
  { id: 'xichang', name: 'Xichang SLC', lat: 28.24, lon: 102.02, country: 'China', operator: 'CNSA', status: 'active', launches: 'High' },
  { id: 'wenchang', name: 'Wenchang SLC', lat: 19.61, lon: 110.95, country: 'China', operator: 'CNSA', status: 'active', launches: 'Medium' },
  { id: 'kourou', name: 'Guiana Space Centre', lat: 5.23, lon: -52.76, country: 'France', operator: 'ESA/CNES', status: 'active', launches: 'Medium' },
  { id: 'sriharikota', name: 'Satish Dhawan SC', lat: 13.72, lon: 80.23, country: 'India', operator: 'ISRO', status: 'active', launches: 'Medium' },
  { id: 'tanegashima', name: 'Tanegashima SC', lat: 30.40, lon: 130.97, country: 'Japan', operator: 'JAXA', status: 'active', launches: 'Low' },
];

export const CRITICAL_MINERALS: CriticalMineralProject[] = [
  // Lithium
  { id: 'greenbushes', name: 'Greenbushes', lat: -33.86, lon: 116.01, mineral: 'Lithium', country: 'Australia', operator: 'Talison Lithium', status: 'producing', significance: 'Largest hard-rock lithium mine' },
  { id: 'atacama', name: 'Salar de Atacama', lat: -23.50, lon: -68.33, mineral: 'Lithium', country: 'Chile', operator: 'SQM/Albemarle', status: 'producing', significance: 'Largest brine lithium source' },
  { id: 'pilgangoora', name: 'Pilgangoora', lat: -21.03, lon: 118.91, mineral: 'Lithium', country: 'Australia', operator: 'Pilbara Minerals', status: 'producing', significance: 'Major hard-rock deposit' },
  { id: 'silver_peak', name: 'Silver Peak', lat: 37.75, lon: -117.65, country: 'USA', mineral: 'Lithium', operator: 'Albemarle', status: 'producing', significance: 'Only active US lithium mine' },
  // Cobalt
  { id: 'mutanda', name: 'Mutanda', lat: -10.78, lon: 25.80, mineral: 'Cobalt', country: 'DRC', operator: 'Glencore', status: 'producing', significance: 'World largest cobalt mine' },
  { id: 'tenke', name: 'Tenke Fungurume', lat: -10.61, lon: 26.16, mineral: 'Cobalt', country: 'DRC', operator: 'CMOC', status: 'producing', significance: 'Major Chinese-owned cobalt source' },
  // Rare Earths
  { id: 'bayan_obo', name: 'Bayan Obo', lat: 41.76, lon: 109.95, mineral: 'Rare Earths', country: 'China', operator: 'China Northern Rare Earth', status: 'producing', significance: 'World largest REE mine (45% global production)' },
  { id: 'mountain_pass', name: 'Mountain Pass', lat: 35.47, lon: -115.53, mineral: 'Rare Earths', country: 'USA', operator: 'MP Materials', status: 'producing', significance: 'Only major US REE mine' },
  { id: 'mount_weld', name: 'Mount Weld', lat: -28.86, lon: 122.17, mineral: 'Rare Earths', country: 'Australia', operator: 'Lynas', status: 'producing', significance: 'Major non-Chinese REE source' },
  // Nickel
  { id: 'wedabay', name: 'Weda Bay', lat: 0.47, lon: 127.94, mineral: 'Nickel', country: 'Indonesia', operator: 'Tsingshan/Eramet', status: 'producing', significance: 'Massive nickel pig iron production' },
  { id: 'norilsk', name: 'Norilsk', lat: 69.33, lon: 88.21, mineral: 'Nickel', country: 'Russia', operator: 'Nornickel', status: 'producing', significance: 'Major palladium/nickel source' },
];
