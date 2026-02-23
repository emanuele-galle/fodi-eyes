/**
 * Italian Entities Database
 * Monitored entities for intelligence: politicians, companies, institutions
 */

export type EntityType = 'politico' | 'azienda' | 'istituzione' | 'persona';

export interface ItalianEntity {
  id: string;
  name: string;
  type: EntityType;
  role: string;
  region?: string;
  party?: string;
  sector?: string;
  description: string;
  keywords: string[];
  links: { label: string; url: string }[];
}

export const ENTITY_TYPES: Record<EntityType, { label: string; icon: string }> = {
  politico: { label: 'Politici', icon: '🏛️' },
  azienda: { label: 'Aziende', icon: '🏢' },
  istituzione: { label: 'Istituzioni', icon: '⚖️' },
  persona: { label: 'Persone', icon: '👤' },
};

export const ENTITIES: ItalianEntity[] = [
  // === POLITICI ===
  { id: 'meloni', name: 'Giorgia Meloni', type: 'politico', role: 'Presidente del Consiglio', party: 'FdI', description: 'Premier italiano, leader Fratelli d\'Italia', keywords: ['meloni', 'palazzo chigi', 'premier', 'governo'], links: [{ label: 'Governo', url: 'https://www.governo.it' }] },
  { id: 'mattarella', name: 'Sergio Mattarella', type: 'politico', role: 'Presidente della Repubblica', description: 'Capo dello Stato italiano', keywords: ['mattarella', 'quirinale', 'presidente repubblica'], links: [{ label: 'Quirinale', url: 'https://www.quirinale.it' }] },
  { id: 'schlein', name: 'Elly Schlein', type: 'politico', role: 'Segretaria PD', party: 'PD', description: 'Leader dell\'opposizione, segretaria Partito Democratico', keywords: ['schlein', 'pd', 'partito democratico', 'opposizione'], links: [] },
  { id: 'salvini', name: 'Matteo Salvini', type: 'politico', role: 'Vicepresidente del Consiglio', party: 'Lega', description: 'Ministro Infrastrutture e Trasporti, leader Lega', keywords: ['salvini', 'lega', 'mit', 'trasporti'], links: [] },
  { id: 'tajani', name: 'Antonio Tajani', type: 'politico', role: 'Vicepresidente del Consiglio', party: 'Forza Italia', description: 'Ministro Esteri, leader Forza Italia', keywords: ['tajani', 'forza italia', 'farnesina', 'esteri'], links: [] },
  { id: 'conte', name: 'Giuseppe Conte', type: 'politico', role: 'Presidente M5S', party: 'M5S', description: 'Leader Movimento 5 Stelle, ex Premier', keywords: ['conte', 'm5s', 'cinque stelle'], links: [] },
  { id: 'calenda', name: 'Carlo Calenda', type: 'politico', role: 'Leader Azione', party: 'Azione', description: 'Leader di Azione, ex Ministro Sviluppo Economico', keywords: ['calenda', 'azione', 'terzo polo'], links: [] },
  { id: 'renzi', name: 'Matteo Renzi', type: 'politico', role: 'Leader Italia Viva', party: 'Italia Viva', description: 'Senatore, leader Italia Viva, ex Premier', keywords: ['renzi', 'italia viva'], links: [] },
  { id: 'giorgetti', name: 'Giancarlo Giorgetti', type: 'politico', role: 'Ministro Economia', party: 'Lega', description: 'Ministro dell\'Economia e delle Finanze', keywords: ['giorgetti', 'mef', 'economia', 'finanze', 'legge bilancio'], links: [] },
  { id: 'piantedosi', name: 'Matteo Piantedosi', type: 'politico', role: 'Ministro Interno', description: 'Ministro dell\'Interno', keywords: ['piantedosi', 'viminale', 'interno', 'immigrazione', 'sicurezza'], links: [] },
  { id: 'crosetto', name: 'Guido Crosetto', type: 'politico', role: 'Ministro Difesa', party: 'FdI', description: 'Ministro della Difesa', keywords: ['crosetto', 'difesa', 'militare', 'nato'], links: [] },

  // === AZIENDE ===
  { id: 'eni', name: 'ENI', type: 'azienda', role: 'Oil & Gas', sector: 'Energia', description: 'Principale azienda energetica italiana, multinazionale oil & gas', keywords: ['eni', 'petrolio', 'gas', 'energia', 'descalzi'], links: [{ label: 'Sito', url: 'https://www.eni.com' }] },
  { id: 'enel', name: 'ENEL', type: 'azienda', role: 'Utility', sector: 'Energia', description: 'Principale utility elettrica italiana, leader rinnovabili', keywords: ['enel', 'elettricità', 'rinnovabili', 'energia'], links: [{ label: 'Sito', url: 'https://www.enel.com' }] },
  { id: 'leonardo', name: 'Leonardo', type: 'azienda', role: 'Difesa & Aerospazio', sector: 'Difesa', description: 'Gruppo industriale difesa, aerospazio e sicurezza', keywords: ['leonardo', 'finmeccanica', 'difesa', 'aerospazio', 'elicotteri'], links: [{ label: 'Sito', url: 'https://www.leonardo.com' }] },
  { id: 'fincantieri', name: 'Fincantieri', type: 'azienda', role: 'Cantieristica navale', sector: 'Difesa', description: 'Primo costruttore navale occidentale', keywords: ['fincantieri', 'navi', 'cantiere', 'marina'], links: [{ label: 'Sito', url: 'https://www.fincantieri.com' }] },
  { id: 'ferrovie', name: 'Ferrovie dello Stato', type: 'azienda', role: 'Trasporti', sector: 'Trasporti', description: 'Gruppo ferroviario statale italiano', keywords: ['ferrovie', 'trenitalia', 'rfi', 'alta velocità', 'treni'], links: [{ label: 'Sito', url: 'https://www.fsitaliane.it' }] },
  { id: 'poste', name: 'Poste Italiane', type: 'azienda', role: 'Servizi postali & finanziari', sector: 'Servizi', description: 'Servizi postali, bancari e assicurativi', keywords: ['poste', 'bancoposta', 'postepay'], links: [{ label: 'Sito', url: 'https://www.posteitaliane.it' }] },
  { id: 'unicredit', name: 'UniCredit', type: 'azienda', role: 'Banca', sector: 'Finanza', description: 'Principale gruppo bancario italiano per capitalizzazione', keywords: ['unicredit', 'orcel', 'banca', 'finanza'], links: [{ label: 'Sito', url: 'https://www.unicredit.it' }] },
  { id: 'intesa', name: 'Intesa Sanpaolo', type: 'azienda', role: 'Banca', sector: 'Finanza', description: 'Maggiore gruppo bancario italiano per attivi', keywords: ['intesa sanpaolo', 'messina', 'banca', 'finanza'], links: [{ label: 'Sito', url: 'https://www.intesasanpaolo.com' }] },
  { id: 'stellantis', name: 'Stellantis', type: 'azienda', role: 'Automotive', sector: 'Automotive', description: 'Gruppo automobilistico (ex FCA + PSA), FIAT, Alfa Romeo, Maserati', keywords: ['stellantis', 'fiat', 'alfa romeo', 'maserati', 'automotive'], links: [{ label: 'Sito', url: 'https://www.stellantis.com' }] },
  { id: 'generali', name: 'Generali', type: 'azienda', role: 'Assicurazioni', sector: 'Finanza', description: 'Principale gruppo assicurativo italiano', keywords: ['generali', 'assicurazioni', 'donnet'], links: [{ label: 'Sito', url: 'https://www.generali.com' }] },
  { id: 'telecom', name: 'TIM', type: 'azienda', role: 'Telecomunicazioni', sector: 'Telecom', description: 'Principale operatore telecom italiano', keywords: ['tim', 'telecom italia', 'rete', 'fibra', 'telecomunicazioni'], links: [{ label: 'Sito', url: 'https://www.gruppotim.it' }] },
  { id: 'mediobanca', name: 'Mediobanca', type: 'azienda', role: 'Investment banking', sector: 'Finanza', description: 'Banca d\'affari italiana, partecipazioni strategiche', keywords: ['mediobanca', 'nagel', 'investment banking'], links: [{ label: 'Sito', url: 'https://www.mediobanca.com' }] },

  // === ISTITUZIONI ===
  { id: 'bankitalia', name: 'Banca d\'Italia', type: 'istituzione', role: 'Banca Centrale', description: 'Banca centrale italiana, parte del SEBC', keywords: ['bankitalia', 'banca italia', 'panetta', 'politica monetaria'], links: [{ label: 'Sito', url: 'https://www.bancaditalia.it' }] },
  { id: 'consob', name: 'CONSOB', type: 'istituzione', role: 'Vigilanza mercati', description: 'Commissione Nazionale Società e Borsa — vigilanza mercati finanziari', keywords: ['consob', 'borsa', 'vigilanza', 'insider trading'], links: [{ label: 'Sito', url: 'https://www.consob.it' }] },
  { id: 'agcom', name: 'AGCOM', type: 'istituzione', role: 'Autorità comunicazioni', description: 'Autorità per le Garanzie nelle Comunicazioni', keywords: ['agcom', 'comunicazioni', 'media', 'telecomunicazioni'], links: [{ label: 'Sito', url: 'https://www.agcom.it' }] },
  { id: 'arera', name: 'ARERA', type: 'istituzione', role: 'Autorità energia', description: 'Autorità di Regolazione per Energia Reti e Ambiente', keywords: ['arera', 'energia', 'tariffe', 'gas', 'elettricità'], links: [{ label: 'Sito', url: 'https://www.arera.it' }] },
  { id: 'garante_privacy', name: 'Garante Privacy', type: 'istituzione', role: 'Protezione dati', description: 'Garante per la protezione dei dati personali', keywords: ['garante privacy', 'gdpr', 'dati personali', 'privacy'], links: [{ label: 'Sito', url: 'https://www.garanteprivacy.it' }] },
  { id: 'corte_cost', name: 'Corte Costituzionale', type: 'istituzione', role: 'Giustizia costituzionale', description: 'Organo di garanzia costituzionale', keywords: ['corte costituzionale', 'consulta', 'incostituzionale'], links: [{ label: 'Sito', url: 'https://www.cortecostituzionale.it' }] },
  { id: 'anac', name: 'ANAC', type: 'istituzione', role: 'Anticorruzione', description: 'Autorità Nazionale Anticorruzione — trasparenza e appalti', keywords: ['anac', 'anticorruzione', 'appalti', 'trasparenza'], links: [{ label: 'Sito', url: 'https://www.anticorruzione.it' }] },
  { id: 'agcm', name: 'AGCM', type: 'istituzione', role: 'Antitrust', description: 'Autorità Garante della Concorrenza e del Mercato', keywords: ['agcm', 'antitrust', 'concorrenza', 'pratiche commerciali'], links: [{ label: 'Sito', url: 'https://www.agcm.it' }] },
  { id: 'protezione_civile', name: 'Protezione Civile', type: 'istituzione', role: 'Emergenze', description: 'Dipartimento della Protezione Civile', keywords: ['protezione civile', 'emergenza', 'allerta', 'terremoto', 'alluvione'], links: [{ label: 'Sito', url: 'https://www.protezionecivile.gov.it' }] },
  { id: 'mise', name: 'MIMIT', type: 'istituzione', role: 'Ministero Imprese', description: 'Ministero delle Imprese e del Made in Italy', keywords: ['mimit', 'mise', 'imprese', 'made in italy', 'industria'], links: [{ label: 'Sito', url: 'https://www.mimit.gov.it' }] },
];

export function searchEntities(query: string): ItalianEntity[] {
  if (!query.trim()) return ENTITIES;
  const q = query.toLowerCase().trim();
  return ENTITIES.filter(e =>
    e.name.toLowerCase().includes(q) ||
    e.role.toLowerCase().includes(q) ||
    e.description.toLowerCase().includes(q) ||
    e.keywords.some(k => k.includes(q)) ||
    (e.party && e.party.toLowerCase().includes(q)) ||
    (e.sector && e.sector.toLowerCase().includes(q))
  );
}

export function getEntitiesByType(type: EntityType): ItalianEntity[] {
  return ENTITIES.filter(e => e.type === type);
}

export function getEntitiesByRegion(region: string): ItalianEntity[] {
  const r = region.toLowerCase();
  return ENTITIES.filter(e => e.region?.toLowerCase() === r);
}
