export interface TrafficWebcam {
  id: string;
  autostrada: string;
  km: number;
  direzione: 'nord' | 'sud' | 'est' | 'ovest' | 'entrambe';
  localita: string;
  lat: number;
  lon: number;
  snapshotUrl: string;
  portale: string;
  refreshIntervalSec: number;
}

/**
 * Traffic webcams from Autobrennero A22 and other verifiable Italian highway sources.
 * Snapshot URLs are predictable patterns: https://www.autobrennero.it/WebCamImg/km{N}.jpg
 */
export const TRAFFIC_WEBCAMS: TrafficWebcam[] = [
  // === A22 - Autobrennero (Brennero → Modena) ===
  {
    id: 'a22-km0',
    autostrada: 'A22',
    km: 0,
    direzione: 'entrambe',
    localita: 'Brennero - Confine di Stato',
    lat: 47.0000,
    lon: 11.5067,
    snapshotUrl: 'https://www.autobrennero.it/WebCamImg/km0.jpg',
    portale: 'autobrennero.it',
    refreshIntervalSec: 60,
  },
  {
    id: 'a22-km10',
    autostrada: 'A22',
    km: 10,
    direzione: 'entrambe',
    localita: 'Vipiteno',
    lat: 46.8936,
    lon: 11.4339,
    snapshotUrl: 'https://www.autobrennero.it/WebCamImg/km10.jpg',
    portale: 'autobrennero.it',
    refreshIntervalSec: 60,
  },
  {
    id: 'a22-km30',
    autostrada: 'A22',
    km: 30,
    direzione: 'entrambe',
    localita: 'Fortezza',
    lat: 46.7978,
    lon: 11.6228,
    snapshotUrl: 'https://www.autobrennero.it/WebCamImg/km30.jpg',
    portale: 'autobrennero.it',
    refreshIntervalSec: 60,
  },
  {
    id: 'a22-km50',
    autostrada: 'A22',
    km: 50,
    direzione: 'entrambe',
    localita: 'Chiusa',
    lat: 46.6414,
    lon: 11.5678,
    snapshotUrl: 'https://www.autobrennero.it/WebCamImg/km50.jpg',
    portale: 'autobrennero.it',
    refreshIntervalSec: 60,
  },
  {
    id: 'a22-km70',
    autostrada: 'A22',
    km: 70,
    direzione: 'entrambe',
    localita: 'Bolzano Nord',
    lat: 46.5178,
    lon: 11.3506,
    snapshotUrl: 'https://www.autobrennero.it/WebCamImg/km70.jpg',
    portale: 'autobrennero.it',
    refreshIntervalSec: 60,
  },
  {
    id: 'a22-km85',
    autostrada: 'A22',
    km: 85,
    direzione: 'entrambe',
    localita: 'Bolzano Sud',
    lat: 46.4567,
    lon: 11.3106,
    snapshotUrl: 'https://www.autobrennero.it/WebCamImg/km85.jpg',
    portale: 'autobrennero.it',
    refreshIntervalSec: 60,
  },
  {
    id: 'a22-km105',
    autostrada: 'A22',
    km: 105,
    direzione: 'entrambe',
    localita: 'Egna-Ora',
    lat: 46.3161,
    lon: 11.2625,
    snapshotUrl: 'https://www.autobrennero.it/WebCamImg/km105.jpg',
    portale: 'autobrennero.it',
    refreshIntervalSec: 60,
  },
  {
    id: 'a22-km125',
    autostrada: 'A22',
    km: 125,
    direzione: 'entrambe',
    localita: 'Trento Nord',
    lat: 46.1047,
    lon: 11.1197,
    snapshotUrl: 'https://www.autobrennero.it/WebCamImg/km125.jpg',
    portale: 'autobrennero.it',
    refreshIntervalSec: 60,
  },
  {
    id: 'a22-km140',
    autostrada: 'A22',
    km: 140,
    direzione: 'entrambe',
    localita: 'Rovereto Nord',
    lat: 45.9178,
    lon: 11.0197,
    snapshotUrl: 'https://www.autobrennero.it/WebCamImg/km140.jpg',
    portale: 'autobrennero.it',
    refreshIntervalSec: 60,
  },
  {
    id: 'a22-km155',
    autostrada: 'A22',
    km: 155,
    direzione: 'entrambe',
    localita: 'Rovereto Sud - Lago di Garda Nord',
    lat: 45.8428,
    lon: 10.9653,
    snapshotUrl: 'https://www.autobrennero.it/WebCamImg/km155.jpg',
    portale: 'autobrennero.it',
    refreshIntervalSec: 60,
  },
  {
    id: 'a22-km175',
    autostrada: 'A22',
    km: 175,
    direzione: 'entrambe',
    localita: 'Affi - Lago di Garda',
    lat: 45.5514,
    lon: 10.7647,
    snapshotUrl: 'https://www.autobrennero.it/WebCamImg/km175.jpg',
    portale: 'autobrennero.it',
    refreshIntervalSec: 60,
  },
  {
    id: 'a22-km195',
    autostrada: 'A22',
    km: 195,
    direzione: 'entrambe',
    localita: 'Verona Nord',
    lat: 45.4583,
    lon: 10.9714,
    snapshotUrl: 'https://www.autobrennero.it/WebCamImg/km195.jpg',
    portale: 'autobrennero.it',
    refreshIntervalSec: 60,
  },
  {
    id: 'a22-km205',
    autostrada: 'A22',
    km: 205,
    direzione: 'entrambe',
    localita: 'Nogarole Rocca',
    lat: 45.2833,
    lon: 10.8833,
    snapshotUrl: 'https://www.autobrennero.it/WebCamImg/km205.jpg',
    portale: 'autobrennero.it',
    refreshIntervalSec: 60,
  },
  {
    id: 'a22-km225',
    autostrada: 'A22',
    km: 225,
    direzione: 'entrambe',
    localita: 'Mantova Nord',
    lat: 45.1833,
    lon: 10.8333,
    snapshotUrl: 'https://www.autobrennero.it/WebCamImg/km225.jpg',
    portale: 'autobrennero.it',
    refreshIntervalSec: 60,
  },
  {
    id: 'a22-km245',
    autostrada: 'A22',
    km: 245,
    direzione: 'entrambe',
    localita: 'Pegognaga',
    lat: 44.9333,
    lon: 10.8500,
    snapshotUrl: 'https://www.autobrennero.it/WebCamImg/km245.jpg',
    portale: 'autobrennero.it',
    refreshIntervalSec: 60,
  },
  {
    id: 'a22-km265',
    autostrada: 'A22',
    km: 265,
    direzione: 'entrambe',
    localita: 'Carpi',
    lat: 44.7833,
    lon: 10.8833,
    snapshotUrl: 'https://www.autobrennero.it/WebCamImg/km265.jpg',
    portale: 'autobrennero.it',
    refreshIntervalSec: 60,
  },
  {
    id: 'a22-km285',
    autostrada: 'A22',
    km: 285,
    direzione: 'entrambe',
    localita: 'Campogalliano - Interconnessione A1',
    lat: 44.6833,
    lon: 10.8333,
    snapshotUrl: 'https://www.autobrennero.it/WebCamImg/km285.jpg',
    portale: 'autobrennero.it',
    refreshIntervalSec: 60,
  },

  // === SERRAVALLE (A50/A51/A52 - Tangenziali Milano) — already in webcams-italia.ts ===
  // These are referenced but managed via the territorial webcam system (tipo: 'traffico')
];

/** Get list of unique highways */
export function getHighways(): string[] {
  const set = new Set<string>();
  for (const w of TRAFFIC_WEBCAMS) set.add(w.autostrada);
  return Array.from(set).sort();
}
