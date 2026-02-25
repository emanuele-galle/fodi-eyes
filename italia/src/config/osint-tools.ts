/**
 * OSINT Arsenal — Curated database of OSINT tools
 * Sources: awesome-osint, OSINTSurveillance, community picks
 * Focus on Italy-relevant and most-used tools
 */

export interface OsintTool {
  name: string;
  url: string;
  description: string;
  category: OsintCategory;
  tags: string[];
  italyRelevant?: boolean;
  workflow?: 'identify' | 'footprint' | 'analyze' | 'verify';
}

export type OsintCategory =
  | 'social-media'
  | 'search-engines'
  | 'identity'
  | 'recon'
  | 'threat-intel'
  | 'geoint'
  | 'network'
  | 'shodan-dorks'
  | 'italia'
  | 'dark-web'
  | 'documents'
  | 'multimedia'
  | 'webcam'
  | 'frameworks'
  | 'surveillance'
  | 'vehicle'
  | 'mobile'
  | 'ai-osint'
  | 'web-intel';

export const OSINT_CATEGORIES: Record<OsintCategory, { label: string; icon: string }> = {
  'italia': { label: 'Italia', icon: '🇮🇹' },
  'social-media': { label: 'Social Media', icon: '📱' },
  'search-engines': { label: 'Motori di Ricerca', icon: '🔍' },
  'identity': { label: 'Identità & Persone', icon: '👤' },
  'recon': { label: 'Ricognizione', icon: '🎯' },
  'threat-intel': { label: 'Threat Intelligence', icon: '🛡️' },
  'geoint': { label: 'Geolocalizzazione', icon: '🗺️' },
  'network': { label: 'Rete & IP', icon: '🌐' },
  'shodan-dorks': { label: 'Shodan Dorks IT', icon: '📡' },
  'dark-web': { label: 'Dark Web', icon: '🕶️' },
  'documents': { label: 'Documenti & Leak', icon: '📄' },
  'multimedia': { label: 'Immagini & Video', icon: '🖼️' },
  'webcam': { label: 'Webcam Italia', icon: '📹' },
  'frameworks': { label: 'Framework & Toolkit', icon: '🧰' },
  'surveillance': { label: 'Sorveglianza & CCTV', icon: '📡' },
  'vehicle': { label: 'Veicoli & Trasporti', icon: '🚗' },
  'mobile': { label: 'Mobile & Forensics', icon: '📲' },
  'ai-osint': { label: 'AI & OSINT', icon: '🤖' },
  'web-intel': { label: 'Web Intelligence', icon: '🕸️' },
};

export const OSINT_TOOLS: OsintTool[] = [
  // === ITALIA ===
  { name: 'ISTAT Dati', url: 'https://dati.istat.it/', description: 'Istituto Nazionale di Statistica — dati demografici, economici, sociali italiani', category: 'italia', tags: ['statistiche', 'dati', 'governo'], italyRelevant: true, workflow: 'analyze' },
  { name: 'OpenData Italia', url: 'https://dati.gov.it/', description: 'Portale open data della Pubblica Amministrazione italiana', category: 'italia', tags: ['opendata', 'governo', 'PA'], italyRelevant: true, workflow: 'analyze' },
  { name: 'Italia Domani (PNRR)', url: 'https://italiadomani.gov.it/', description: 'Monitoraggio Piano Nazionale Ripresa e Resilienza', category: 'italia', tags: ['PNRR', 'fondi', 'governo'], italyRelevant: true, workflow: 'analyze' },
  { name: 'Camera dei Deputati', url: 'https://www.camera.it/leg19/1', description: 'Atti parlamentari, proposte di legge, votazioni Camera', category: 'italia', tags: ['parlamento', 'leggi', 'politica'], italyRelevant: true, workflow: 'analyze' },
  { name: 'Senato della Repubblica', url: 'https://www.senato.it/', description: 'Disegni di legge, sedute, commissioni Senato', category: 'italia', tags: ['parlamento', 'leggi', 'politica'], italyRelevant: true, workflow: 'analyze' },
  { name: 'Pagine Gialle', url: 'https://www.paginegialle.it/', description: 'Directory aziende e professionisti italiani', category: 'italia', tags: ['aziende', 'telefono', 'indirizzi'], italyRelevant: true, workflow: 'identify' },
  { name: 'Registro Imprese', url: 'https://www.registroimprese.it/', description: 'Visure camerali, bilanci e informazioni su imprese italiane', category: 'italia', tags: ['aziende', 'bilanci', 'PEC'], italyRelevant: true, workflow: 'identify' },
  { name: 'ANSA', url: 'https://www.ansa.it/', description: 'Agenzia di stampa italiana — breaking news in tempo reale', category: 'italia', tags: ['news', 'agenzia'], italyRelevant: true, workflow: 'verify' },
  { name: 'Banca d\'Italia', url: 'https://www.bancaditalia.it/', description: 'Dati economici, tassi, statistiche bancarie italiane', category: 'italia', tags: ['economia', 'banca', 'tassi'], italyRelevant: true, workflow: 'analyze' },
  { name: 'AGCOM', url: 'https://www.agcom.it/', description: 'Autorità Garanzia Comunicazioni — dati telecomunicazioni e media', category: 'italia', tags: ['telecomunicazioni', 'regolamentazione'], italyRelevant: true, workflow: 'analyze' },
  { name: 'Agenzia delle Entrate', url: 'https://www.agenziaentrate.gov.it/', description: 'Catasto, visure, codici fiscali, partite IVA', category: 'italia', tags: ['fisco', 'catasto', 'IVA'], italyRelevant: true, workflow: 'identify' },
  { name: 'ANAC', url: 'https://www.anticorruzione.it/', description: 'Autorità Anticorruzione — bandi di gara, appalti pubblici', category: 'italia', tags: ['appalti', 'corruzione', 'trasparenza'], italyRelevant: true, workflow: 'analyze' },
  { name: 'OpenPolis', url: 'https://www.openpolis.it/', description: 'Monitoraggio attività politica, parlamento, enti locali', category: 'italia', tags: ['politica', 'trasparenza', 'dati'], italyRelevant: true, workflow: 'analyze' },
  { name: 'Confini ISTAT (GeoJSON)', url: 'https://github.com/ondata/confini-amministrativi-istat', description: 'Confini regioni, province, comuni italiani in formato GeoJSON', category: 'italia', tags: ['mappe', 'geojson', 'confini'], italyRelevant: true, workflow: 'analyze' },
  { name: 'ANAC Contratti', url: 'https://dati.anticorruzione.it/', description: 'Autorità Nazionale Anticorruzione — bandi, contratti pubblici, appalti', category: 'italia', tags: ['appalti', 'governo', 'trasparenza'], italyRelevant: true, workflow: 'analyze' },
  { name: 'Consob', url: 'https://www.consob.it/', description: 'Commissione Nazionale per le Società e la Borsa — vigilanza mercati', category: 'italia', tags: ['finanza', 'borsa', 'vigilanza'], italyRelevant: true, workflow: 'analyze' },
  { name: 'InfoCamere', url: 'https://www.infocamere.it/', description: 'Registro Imprese — visure camerali, bilanci aziendali', category: 'italia', tags: ['aziende', 'bilanci', 'visure'], italyRelevant: true, workflow: 'identify' },
  { name: 'ATOKA', url: 'https://atoka.io/', description: 'Business intelligence italiana — dati aziendali, bilanci, connessioni societarie', category: 'italia', tags: ['aziende', 'intelligence', 'bilanci'], italyRelevant: true, workflow: 'footprint' },
  { name: 'OpenBDAP', url: 'https://openbdap.mef.gov.it/', description: 'MEF Bilanci PA — spesa pubblica, bilanci enti locali', category: 'italia', tags: ['finanza', 'PA', 'bilanci'], italyRelevant: true, workflow: 'analyze' },
  { name: 'Albo Pretorio Online', url: 'https://www.albopretorioonline.it/', description: 'Atti amministrativi pubblicati dagli enti locali italiani', category: 'italia', tags: ['PA', 'atti', 'trasparenza'], italyRelevant: true, workflow: 'analyze' },
  { name: 'PEC Lookup (INI-PEC)', url: 'https://www.inipec.gov.it/', description: 'Indice Nazionale PEC — ricerca indirizzi PEC professionisti e imprese', category: 'italia', tags: ['email', 'PEC', 'professionisti'], italyRelevant: true, workflow: 'identify' },
  { name: 'Agenzia Entrate', url: 'https://sister.agenziaentrate.gov.it/', description: 'Visure catastali, ipotecarie, registro atti', category: 'italia', tags: ['immobili', 'catasto', 'proprietà'], italyRelevant: true, workflow: 'analyze' },
  { name: 'INPS Servizi', url: 'https://www.inps.it/', description: 'Dati previdenziali e contributivi (con accesso autenticato)', category: 'italia', tags: ['previdenza', 'contributi', 'lavoro'], italyRelevant: true, workflow: 'analyze' },
  { name: 'Protezione Civile', url: 'https://www.protezionecivile.gov.it/', description: 'Allerte meteo, rischio sismico, emergenze nazionali', category: 'italia', tags: ['emergenze', 'meteo', 'rischio'], italyRelevant: true, workflow: 'verify' },

  // === SOCIAL MEDIA ===
  { name: 'Sherlock', url: 'https://github.com/sherlock-project/sherlock', description: 'Trova username su 400+ siti social', category: 'social-media', tags: ['username', 'profili'], workflow: 'identify' },
  { name: 'Social Searcher', url: 'https://www.social-searcher.com/', description: 'Ricerca in tempo reale su social media pubblici', category: 'social-media', tags: ['ricerca', 'monitoraggio'], workflow: 'footprint' },
  { name: 'IntelX', url: 'https://intelx.io/', description: 'Motore di ricerca per intelligence — email, URL, Bitcoin, IBAN', category: 'social-media', tags: ['ricerca', 'email', 'leak'], workflow: 'identify' },
  { name: 'Twint', url: 'https://github.com/twintproject/twint', description: 'Scraping avanzato X/Twitter senza API', category: 'social-media', tags: ['twitter', 'scraping'], workflow: 'footprint' },
  { name: 'Instaloader', url: 'https://instaloader.github.io/', description: 'Download profili, post, storie Instagram', category: 'social-media', tags: ['instagram', 'download'], workflow: 'footprint' },
  { name: 'TikTok Creative Center', url: 'https://ads.tiktok.com/business/creativecenter/', description: 'Trend, hashtag e creatività TikTok', category: 'social-media', tags: ['tiktok', 'trend'], workflow: 'analyze' },
  { name: 'Facebook Graph Search', url: 'https://graph.tips/', description: 'Interfaccia per ricerche avanzate Facebook Graph', category: 'social-media', tags: ['facebook', 'graph'], workflow: 'footprint' },
  { name: 'Telegram Analytics', url: 'https://tgstat.com/', description: 'Statistiche e ricerca canali/gruppi Telegram', category: 'social-media', tags: ['telegram', 'statistiche'], workflow: 'analyze' },
  { name: 'Reddit Search', url: 'https://redditsearch.io/', description: 'Ricerca avanzata post e commenti Reddit', category: 'social-media', tags: ['reddit', 'ricerca'], workflow: 'footprint' },

  // === SEARCH ENGINES ===
  { name: 'Google Dorks (GHDB)', url: 'https://www.exploit-db.com/google-hacking-database', description: 'Database di Google Dorks per ricerche avanzate', category: 'search-engines', tags: ['google', 'dorks', 'hacking'], workflow: 'footprint' },
  { name: 'DuckDuckGo', url: 'https://duckduckgo.com/', description: 'Motore di ricerca privacy-first con bang shortcuts', category: 'search-engines', tags: ['privacy', 'ricerca'], workflow: 'footprint' },
  { name: 'Yandex Images', url: 'https://yandex.com/images/', description: 'Ricerca inversa immagini — spesso migliore di Google', category: 'search-engines', tags: ['immagini', 'reverse'], workflow: 'verify' },
  { name: 'Carrot2', url: 'https://search.carrot2.org/', description: 'Motore di ricerca con clustering automatico risultati', category: 'search-engines', tags: ['clustering', 'organizzazione'], workflow: 'analyze' },
  { name: 'Searx', url: 'https://searx.space/', description: 'Meta-motore di ricerca open source e privacy-focused', category: 'search-engines', tags: ['privacy', 'meta'], workflow: 'footprint' },
  { name: 'Wayback Machine', url: 'https://web.archive.org/', description: 'Archivio storico di pagine web — trova contenuti rimossi', category: 'search-engines', tags: ['archivio', 'storico'], workflow: 'verify' },
  { name: 'CachedView', url: 'https://cachedview.nl/', description: 'Visualizza versioni cache di pagine web', category: 'search-engines', tags: ['cache', 'storico'], workflow: 'verify' },

  // === IDENTITY ===
  { name: 'Have I Been Pwned', url: 'https://haveibeenpwned.com/', description: 'Verifica se email/password sono in data breach', category: 'identity', tags: ['email', 'breach', 'password'], workflow: 'verify' },
  { name: 'Hunter.io', url: 'https://hunter.io/', description: 'Trova email aziendali a partire dal dominio', category: 'identity', tags: ['email', 'aziende'], workflow: 'identify' },
  { name: 'Epieos', url: 'https://epieos.com/', description: 'Informazioni da email/telefono — Google account, social', category: 'identity', tags: ['email', 'telefono', 'profili'], workflow: 'identify' },
  { name: 'That\'s Them', url: 'https://thatsthem.com/', description: 'Ricerca persone per nome, email, telefono, indirizzo', category: 'identity', tags: ['persone', 'ricerca'], workflow: 'identify' },
  { name: 'Namechk', url: 'https://namechk.com/', description: 'Verifica disponibilità username su domini e social', category: 'identity', tags: ['username', 'disponibilità'], workflow: 'identify' },
  { name: 'Pipl', url: 'https://pipl.com/', description: 'People search engine — profili aggregati da più fonti', category: 'identity', tags: ['persone', 'profili'], workflow: 'identify' },
  { name: 'WhatsMyName', url: 'https://whatsmyname.app/', description: 'Enumera username su centinaia di siti web', category: 'identity', tags: ['username', 'enumerazione'], workflow: 'footprint' },
  { name: 'Dehashed', url: 'https://dehashed.com/', description: 'Ricerca in database di credenziali compromesse', category: 'identity', tags: ['breach', 'credenziali'], workflow: 'identify' },
  { name: 'Pagine Bianche', url: 'https://www.paginebianche.it/', description: 'Elenco telefonico italiano — ricerca persone e aziende', category: 'identity', tags: ['telefono', 'persone', 'aziende'], italyRelevant: true, workflow: 'identify' },
  { name: 'Tuttocittà', url: 'https://www.tuttocitta.it/', description: 'Ricerca indirizzi e mappe stradali italiane', category: 'identity', tags: ['indirizzi', 'mappe'], italyRelevant: true, workflow: 'identify' },

  // === RECON ===
  { name: 'Shodan', url: 'https://www.shodan.io/', description: 'Motore di ricerca per dispositivi connessi a Internet', category: 'recon', tags: ['iot', 'dispositivi', 'scansione'], workflow: 'footprint' },
  { name: 'Censys', url: 'https://search.censys.io/', description: 'Scansione Internet — certificati, host, servizi', category: 'recon', tags: ['certificati', 'host'], workflow: 'footprint' },
  { name: 'ZoomEye', url: 'https://www.zoomeye.org/', description: 'Motore di ricerca cyberspace cinese — dispositivi e servizi', category: 'recon', tags: ['dispositivi', 'servizi'], workflow: 'footprint' },
  { name: 'BuiltWith', url: 'https://builtwith.com/', description: 'Identifica tecnologie usate da un sito web', category: 'recon', tags: ['tecnologie', 'web'], workflow: 'footprint' },
  { name: 'Wappalyzer', url: 'https://www.wappalyzer.com/', description: 'Rileva framework, CMS, librerie di un sito web', category: 'recon', tags: ['tecnologie', 'CMS'], workflow: 'footprint' },
  { name: 'SecurityTrails', url: 'https://securitytrails.com/', description: 'DNS storico, sottodomini, record WHOIS', category: 'recon', tags: ['DNS', 'sottodomini', 'WHOIS'], workflow: 'footprint' },
  { name: 'crt.sh', url: 'https://crt.sh/', description: 'Certificate Transparency log — scopri sottodomini via certificati SSL', category: 'recon', tags: ['certificati', 'sottodomini'], workflow: 'footprint' },
  { name: 'Amass', url: 'https://github.com/owasp-amass/amass', description: 'Enumerazione sottodomini e mapping superfici d\'attacco', category: 'recon', tags: ['sottodomini', 'OWASP'], workflow: 'footprint' },
  { name: 'SpiderFoot', url: 'https://www.spiderfoot.net/', description: 'Automazione OSINT — raccoglie dati da 200+ fonti', category: 'recon', tags: ['automazione', 'raccolta'], workflow: 'footprint' },
  { name: 'theHarvester', url: 'https://github.com/laramies/theHarvester', description: 'Raccolta email, sottodomini, host e nomi da fonti pubbliche', category: 'recon', tags: ['email', 'sottodomini', 'raccolta'], workflow: 'footprint' },

  // === THREAT INTELLIGENCE ===
  { name: 'VirusTotal', url: 'https://www.virustotal.com/', description: 'Analisi malware — file, URL, IP, domini', category: 'threat-intel', tags: ['malware', 'analisi'], workflow: 'analyze' },
  { name: 'OTX AlienVault', url: 'https://otx.alienvault.com/', description: 'Open Threat Exchange — IOC condivisi dalla community', category: 'threat-intel', tags: ['IOC', 'community'], workflow: 'analyze' },
  { name: 'MITRE ATT&CK', url: 'https://attack.mitre.org/', description: 'Knowledge base di tattiche e tecniche avversarie', category: 'threat-intel', tags: ['tattiche', 'APT'], workflow: 'analyze' },
  { name: 'Abuse.ch', url: 'https://abuse.ch/', description: 'Tracking malware, botnet, ransomware', category: 'threat-intel', tags: ['malware', 'botnet'], workflow: 'analyze' },
  { name: 'GreyNoise', url: 'https://viz.greynoise.io/', description: 'Classifica IP per rumore Internet vs attacchi mirati', category: 'threat-intel', tags: ['IP', 'rumore', 'scansione'], workflow: 'analyze' },
  { name: 'URLhaus', url: 'https://urlhaus.abuse.ch/', description: 'Database URL usati per distribuzione malware', category: 'threat-intel', tags: ['URL', 'malware'], workflow: 'verify' },
  { name: 'Pulsedive', url: 'https://pulsedive.com/', description: 'Threat intelligence — IOC, feed, scan risultati', category: 'threat-intel', tags: ['IOC', 'feed'], workflow: 'analyze' },
  { name: 'ThreatFox', url: 'https://threatfox.abuse.ch/', description: 'Database IOC — hash, IP, domini associati a malware', category: 'threat-intel', tags: ['IOC', 'hash'], workflow: 'analyze' },

  // === GEOINT ===
  { name: 'Google Earth', url: 'https://earth.google.com/', description: 'Immagini satellitari ad alta risoluzione con timeline storica', category: 'geoint', tags: ['satellite', 'mappe'], workflow: 'analyze' },
  { name: 'Sentinel Hub', url: 'https://www.sentinel-hub.com/', description: 'Immagini satellitari Copernicus ESA — analisi multispettrale', category: 'geoint', tags: ['satellite', 'ESA', 'Copernicus'], workflow: 'analyze' },
  { name: 'GeoGuessr', url: 'https://www.geoguessr.com/', description: 'Tool per geolocalizzazione da immagini Street View', category: 'geoint', tags: ['geolocalizzazione', 'streetview'], workflow: 'verify' },
  { name: 'SunCalc', url: 'https://www.suncalc.org/', description: 'Calcola posizione sole — utile per datare foto da ombre', category: 'geoint', tags: ['sole', 'ombre', 'datazione'], workflow: 'verify' },
  { name: 'Overpass Turbo', url: 'https://overpass-turbo.eu/', description: 'Query OpenStreetMap — trova strutture, strade, POI', category: 'geoint', tags: ['OSM', 'mappe', 'query'], workflow: 'analyze' },
  { name: 'Mapillary', url: 'https://www.mapillary.com/', description: 'Street-level imagery crowdsourced — alternativa a Google Street View', category: 'geoint', tags: ['streetview', 'foto'], workflow: 'verify' },
  { name: 'Flightradar24', url: 'https://www.flightradar24.com/', description: 'Tracking voli in tempo reale — ADS-B', category: 'geoint', tags: ['voli', 'tracking', 'aviazione'], workflow: 'verify' },
  { name: 'MarineTraffic', url: 'https://www.marinetraffic.com/', description: 'Tracking navi in tempo reale — AIS', category: 'geoint', tags: ['navi', 'tracking', 'marittimo'], workflow: 'verify' },
  { name: 'Geoportale Nazionale', url: 'https://www.pcn.minambiente.it/mattm/', description: 'Portale Cartografico Nazionale — mappe, ortofoto, DTM Italia', category: 'geoint', tags: ['mappe', 'cartografia', 'ortofoto'], italyRelevant: true, workflow: 'analyze' },
  { name: 'INGV Terremoti', url: 'https://terremoti.ingv.it/', description: 'Istituto Nazionale di Geofisica — mappa sismica real-time', category: 'geoint', tags: ['terremoti', 'sismica', 'real-time'], italyRelevant: true, workflow: 'verify' },
  { name: 'Copernicus EMS', url: 'https://emergency.copernicus.eu/', description: 'Servizio di emergenza Copernicus — mappe satellitari eventi catastrofici', category: 'geoint', tags: ['satelliti', 'emergenze', 'EU'], italyRelevant: true, workflow: 'verify' },

  // === NETWORK & IP ===
  { name: 'Shodan', url: 'https://www.shodan.io/', description: 'Motore di ricerca IoT e dispositivi connessi', category: 'network', tags: ['IoT', 'scansione'], workflow: 'footprint' },
  { name: 'BGPView', url: 'https://bgpview.io/', description: 'Informazioni BGP — ASN, prefissi, peering', category: 'network', tags: ['BGP', 'ASN'], workflow: 'analyze' },
  { name: 'IPinfo', url: 'https://ipinfo.io/', description: 'Geolocalizzazione IP, ASN, company lookup', category: 'network', tags: ['IP', 'geolocalizzazione'], workflow: 'identify' },
  { name: 'DNSDumpster', url: 'https://dnsdumpster.com/', description: 'Ricognizione DNS — sottodomini, record MX/TXT', category: 'network', tags: ['DNS', 'sottodomini'], workflow: 'footprint' },
  { name: 'Wigle', url: 'https://wigle.net/', description: 'Database mondiale reti Wi-Fi con mappa', category: 'network', tags: ['WiFi', 'SSID', 'mappa'], workflow: 'footprint' },
  { name: 'ViewDNS', url: 'https://viewdns.info/', description: 'Suite tool DNS — reverse IP, WHOIS, propagation', category: 'network', tags: ['DNS', 'WHOIS'], workflow: 'footprint' },

  // === SHODAN DORKS ITALIA ===
  { name: 'Webcam Italia', url: 'https://www.shodan.io/search?query=country%3AIT+webcam', description: 'Shodan: webcam pubbliche in Italia', category: 'shodan-dorks', tags: ['webcam', 'italia', 'shodan'], italyRelevant: true, workflow: 'analyze' },
  { name: 'SCADA Italia', url: 'https://www.shodan.io/search?query=country%3AIT+port%3A502+modbus', description: 'Shodan: sistemi SCADA/Modbus in Italia', category: 'shodan-dorks', tags: ['SCADA', 'industriale', 'shodan'], italyRelevant: true, workflow: 'analyze' },
  { name: 'MongoDB Italia', url: 'https://www.shodan.io/search?query=country%3AIT+port%3A27017+%22MongoDB%22', description: 'Shodan: istanze MongoDB esposte in Italia', category: 'shodan-dorks', tags: ['MongoDB', 'database', 'shodan'], italyRelevant: true, workflow: 'analyze' },
  { name: 'Elasticsearch Italia', url: 'https://www.shodan.io/search?query=country%3AIT+port%3A9200+%22elasticsearch%22', description: 'Shodan: istanze Elasticsearch esposte in Italia', category: 'shodan-dorks', tags: ['Elasticsearch', 'database', 'shodan'], italyRelevant: true, workflow: 'analyze' },
  { name: 'VNC Italia', url: 'https://www.shodan.io/search?query=country%3AIT+%22authentication+disabled%22+%22RFB+003%22', description: 'Shodan: server VNC senza autenticazione in Italia', category: 'shodan-dorks', tags: ['VNC', 'accesso', 'shodan'], italyRelevant: true, workflow: 'analyze' },
  { name: 'FTP Anonimo Italia', url: 'https://www.shodan.io/search?query=country%3AIT+%22230+Login+successful%22+port%3A21', description: 'Shodan: FTP con accesso anonimo in Italia', category: 'shodan-dorks', tags: ['FTP', 'anonimo', 'shodan'], italyRelevant: true, workflow: 'analyze' },
  { name: 'RTSP Italia', url: 'https://www.shodan.io/search?query=country%3AIT+port%3A554+%22RTSP%22', description: 'Shodan: stream RTSP (telecamere IP) in Italia', category: 'shodan-dorks', tags: ['RTSP', 'telecamere', 'shodan'], italyRelevant: true, workflow: 'analyze' },
  { name: 'Jenkins Italia', url: 'https://www.shodan.io/search?query=country%3AIT+%22X-Jenkins%22+port%3A8080', description: 'Shodan: istanze Jenkins esposte in Italia', category: 'shodan-dorks', tags: ['Jenkins', 'CI/CD', 'shodan'], italyRelevant: true, workflow: 'analyze' },
  { name: 'RDP Italia', url: 'https://www.shodan.io/search?query=country%3AIT+port%3A3389+%22Remote+Desktop%22', description: 'Shodan: desktop remoti RDP esposti in Italia', category: 'shodan-dorks', tags: ['RDP', 'desktop', 'shodan'], italyRelevant: true, workflow: 'analyze' },
  { name: 'IT Gov Servers', url: 'https://www.shodan.io/search?query=org%3A%22Governo+Italiano%22', description: 'Server della PA italiana su Shodan', category: 'shodan-dorks', tags: ['PA', 'infrastruttura'], italyRelevant: true, workflow: 'analyze' },
  { name: 'IT .gov.it', url: 'https://www.shodan.io/search?query=hostname%3A.gov.it', description: 'Tutti i domini .gov.it indicizzati su Shodan', category: 'shodan-dorks', tags: ['governo', 'domini'], italyRelevant: true, workflow: 'footprint' },
  { name: 'IT Telecamere', url: 'https://www.shodan.io/search?query=country%3AIT+port%3A554', description: 'Stream RTSP in Italia — telecamere IP esposte', category: 'shodan-dorks', tags: ['telecamere', 'RTSP', 'sorveglianza'], italyRelevant: true, workflow: 'analyze' },
  { name: 'IT SCADA/ICS', url: 'https://www.shodan.io/search?query=country%3AIT+tag%3Aics', description: 'Sistemi SCADA/ICS esposti in Italia', category: 'shodan-dorks', tags: ['SCADA', 'ICS', 'infrastruttura critica'], italyRelevant: true, workflow: 'analyze' },
  { name: 'IT Industrial', url: 'https://www.shodan.io/search?query=country%3AIT+port%3A102', description: 'Siemens S7 PLC esposti in Italia (port 102)', category: 'shodan-dorks', tags: ['PLC', 'Siemens', 'automazione'], italyRelevant: true, workflow: 'analyze' },
  { name: 'IT Modbus', url: 'https://www.shodan.io/search?query=country%3AIT+port%3A502', description: 'Dispositivi Modbus esposti in Italia', category: 'shodan-dorks', tags: ['Modbus', 'industriale'], italyRelevant: true, workflow: 'analyze' },
  { name: 'IT Webcam Hikvision', url: 'https://www.shodan.io/search?query=country%3AIT+product%3A%22Hikvision%22', description: 'Telecamere Hikvision in Italia', category: 'shodan-dorks', tags: ['Hikvision', 'telecamere'], italyRelevant: true, workflow: 'analyze' },
  { name: 'IT ASN Telecom', url: 'https://www.shodan.io/search?query=asn%3AAS3269', description: 'Rete Telecom Italia (ASN 3269) su Shodan', category: 'shodan-dorks', tags: ['telecom', 'ISP', 'rete'], italyRelevant: true, workflow: 'footprint' },
  { name: 'IT ASN Fastweb', url: 'https://www.shodan.io/search?query=asn%3AAS12874', description: 'Rete Fastweb (ASN 12874) su Shodan', category: 'shodan-dorks', tags: ['fastweb', 'ISP', 'rete'], italyRelevant: true, workflow: 'footprint' },
  { name: 'IT MQTT', url: 'https://www.shodan.io/search?query=country%3AIT+port%3A1883', description: 'Broker MQTT esposti in Italia (IoT)', category: 'shodan-dorks', tags: ['MQTT', 'IoT'], italyRelevant: true, workflow: 'analyze' },
  { name: 'IT BACnet', url: 'https://www.shodan.io/search?query=country%3AIT+port%3A47808', description: 'Sistemi BACnet building automation in Italia', category: 'shodan-dorks', tags: ['BACnet', 'building', 'automazione'], italyRelevant: true, workflow: 'analyze' },

  // === WEBCAM ITALIA ===
  { name: 'Skyline Webcams IT', url: 'https://www.skylinewebcams.com/it.html', description: 'Webcam live in tutta Italia — spiagge, città, montagne', category: 'webcam', tags: ['webcam', 'live', 'panorami'], italyRelevant: true, workflow: 'verify' },
  { name: 'Webcam Italia', url: 'https://www.webcamitalia.com/', description: 'Directory webcam italiane per regione', category: 'webcam', tags: ['webcam', 'regioni'], italyRelevant: true, workflow: 'verify' },
  { name: 'MeteoAM Webcam', url: 'https://www.meteoam.it/it/webcam', description: 'Webcam Aeronautica Militare — stazioni meteo', category: 'webcam', tags: ['meteo', 'aeronautica', 'webcam'], italyRelevant: true, workflow: 'verify' },
  { name: 'Insecam IT', url: 'https://www.insecam.org/en/bycountry/IT/', description: 'Telecamere IP pubbliche non protette in Italia', category: 'webcam', tags: ['telecamere', 'OSINT', 'sorveglianza'], italyRelevant: true, workflow: 'analyze' },

  // === DARK WEB ===
  { name: 'Ahmia', url: 'https://ahmia.fi/', description: 'Motore di ricerca clearnet per servizi .onion', category: 'dark-web', tags: ['onion', 'ricerca'], workflow: 'footprint' },
  { name: 'DarkSearch', url: 'https://darksearch.io/', description: 'Ricerca indicizzata del dark web via clearnet', category: 'dark-web', tags: ['ricerca', 'indicizzazione'], workflow: 'footprint' },
  { name: 'Onion.live', url: 'https://onion.live/', description: 'Directory e monitoraggio siti .onion attivi', category: 'dark-web', tags: ['directory', 'monitoraggio'], workflow: 'footprint' },

  // === DOCUMENTS & LEAKS ===
  { name: 'OCCRP Aleph', url: 'https://aleph.occrp.org/', description: 'Ricerca in milioni di documenti — leak, registri aziendali, court records', category: 'documents', tags: ['documenti', 'leak', 'aziende'], workflow: 'analyze' },
  { name: 'OpenCorporates', url: 'https://opencorporates.com/', description: 'Database aperto di aziende mondiali — 200M+ entità', category: 'documents', tags: ['aziende', 'registri'], workflow: 'identify' },
  { name: 'WikiLeaks', url: 'https://wikileaks.org/', description: 'Archivio di documenti classificati e leak governativi', category: 'documents', tags: ['leak', 'governo'], workflow: 'analyze' },
  { name: 'DocumentCloud', url: 'https://www.documentcloud.org/', description: 'Piattaforma per analisi e pubblicazione documenti', category: 'documents', tags: ['documenti', 'analisi'], workflow: 'analyze' },
  { name: 'ICIJ Offshore Leaks', url: 'https://offshoreleaks.icij.org/', description: 'Database Panama Papers, Pandora Papers — entità offshore', category: 'documents', tags: ['offshore', 'panama', 'evasione'], workflow: 'analyze' },
  { name: 'Normattiva', url: 'https://www.normattiva.it/', description: 'Banca dati della legislazione italiana vigente', category: 'documents', tags: ['leggi', 'normativa', 'legislazione'], italyRelevant: true, workflow: 'analyze' },
  { name: 'Camera Atti', url: 'https://www.camera.it/leg19/207', description: 'Atti parlamentari Camera dei Deputati — DDL, interrogazioni, mozioni', category: 'documents', tags: ['parlamento', 'DDL', 'atti'], italyRelevant: true, workflow: 'analyze' },

  // === MULTIMEDIA ===
  { name: 'TinEye', url: 'https://tineye.com/', description: 'Ricerca inversa immagini — trova dove è stata pubblicata', category: 'multimedia', tags: ['immagini', 'reverse'], workflow: 'verify' },
  { name: 'FotoForensics', url: 'https://fotoforensics.com/', description: 'Analisi forense immagini — ELA, metadati EXIF', category: 'multimedia', tags: ['forense', 'EXIF', 'manipolazione'], workflow: 'verify' },
  { name: 'InVID', url: 'https://www.invid-project.eu/', description: 'Verifica autenticità video — estrae frame chiave', category: 'multimedia', tags: ['video', 'verifica'], workflow: 'verify' },
  { name: 'ExifTool', url: 'https://exiftool.org/', description: 'Lettura/scrittura metadati EXIF di immagini e video', category: 'multimedia', tags: ['EXIF', 'metadati'], workflow: 'analyze' },
  { name: 'Jeffrey EXIF Viewer', url: 'https://exif.regex.info/', description: 'Visualizzatore EXIF online — GPS, camera, timestamp', category: 'multimedia', tags: ['EXIF', 'GPS'], workflow: 'analyze' },

  // === FRAMEWORKS ===
  { name: 'Maltego', url: 'https://www.maltego.com/', description: 'Piattaforma di link analysis e investigazione grafica', category: 'frameworks', tags: ['grafi', 'analisi', 'relazioni'], workflow: 'analyze' },
  { name: 'Recon-ng', url: 'https://github.com/lanmaster53/recon-ng', description: 'Framework di ricognizione web modulare (Python)', category: 'frameworks', tags: ['framework', 'moduli', 'Python'], workflow: 'footprint' },
  { name: 'OSINT Framework', url: 'https://osintframework.com/', description: 'Mappa interattiva di tool OSINT organizzati per categoria', category: 'frameworks', tags: ['directory', 'mappa'], workflow: 'identify' },
  { name: 'Buscador', url: 'https://inteltechniques.com/tools/', description: 'Collezione tool OSINT di Michael Bazzell', category: 'frameworks', tags: ['tools', 'collezione'], workflow: 'footprint' },
  { name: 'Hunchly', url: 'https://hunch.ly/', description: 'Cattura automatica pagine web durante investigazioni OSINT', category: 'frameworks', tags: ['cattura', 'prove', 'investigazione'], workflow: 'analyze' },

  // === SURVEILLANCE & CCTV (from CScorza/OSINTSurveillance) ===
  { name: 'Censys Search', url: 'https://search.censys.io/', description: 'Ricerca dispositivi connessi — webcam, server, IoT esposti', category: 'surveillance', tags: ['dispositivi', 'IoT', 'scansione'], workflow: 'footprint' },
  { name: 'OpenTopia', url: 'http://www.opentopia.com/', description: 'Directory webcam pubbliche aperte nel mondo', category: 'surveillance', tags: ['webcam', 'pubbliche'], workflow: 'analyze' },
  { name: 'EarthCam', url: 'https://www.earthcam.com/', description: 'Network globale di webcam in alta qualità', category: 'surveillance', tags: ['webcam', 'HD', 'mondo'], workflow: 'verify' },
  { name: 'Webcamtaxi', url: 'https://www.webcamtaxi.com/en/', description: 'Webcam live da tutto il mondo organizzate per paese', category: 'surveillance', tags: ['webcam', 'live', 'paesi'], workflow: 'verify' },
  { name: 'Airport Webcams', url: 'https://airportwebcams.net/', description: 'Webcam aeroporti mondiali — monitoraggio aviazione', category: 'surveillance', tags: ['aeroporti', 'aviazione', 'webcam'], workflow: 'verify' },
  { name: 'Windy Webcams', url: 'https://www.windy.com/webcams', description: 'Migliaia di webcam integrate con dati meteo Windy', category: 'surveillance', tags: ['meteo', 'webcam', 'windy'], workflow: 'verify' },
  { name: 'IPTV Cat', url: 'https://iptvcat.com/', description: 'Aggregatore stream IPTV mondiali', category: 'surveillance', tags: ['IPTV', 'stream', 'TV'], workflow: 'analyze' },
  { name: 'The Webcam Network', url: 'https://www.the-webcam-network.com/', description: 'Network europeo webcam live con archivio storico', category: 'surveillance', tags: ['webcam', 'archivio', 'europa'], workflow: 'verify' },

  // === VEHICLE & TRANSPORT (from CScorza/Tool-VATINT) ===
  { name: 'VINDecoder', url: 'https://www.vindecoderz.com/', description: 'Decodifica VIN — marca, modello, anno, specifiche veicolo', category: 'vehicle', tags: ['VIN', 'auto', 'identificazione'], workflow: 'identify' },
  { name: 'CarVertical', url: 'https://www.carvertical.com/', description: 'Storia veicolo da VIN — incidenti, km, proprietari', category: 'vehicle', tags: ['storia', 'veicolo', 'VIN'], workflow: 'identify' },
  { name: 'Ship Finder', url: 'https://shipfinder.co/', description: 'Tracking navi in tempo reale via AIS', category: 'vehicle', tags: ['navi', 'AIS', 'tracking'], workflow: 'verify' },
  { name: 'FlightAware', url: 'https://flightaware.com/', description: 'Tracking voli globale con dati storici e rotte', category: 'vehicle', tags: ['voli', 'aerei', 'rotte'], workflow: 'verify' },
  { name: 'ADS-B Exchange', url: 'https://globe.adsbexchange.com/', description: 'Tracking aeromobili non filtrato — inclusi militari', category: 'vehicle', tags: ['ADS-B', 'militari', 'aviazione'], workflow: 'verify' },
  { name: 'Vessel Finder', url: 'https://www.vesselfinder.com/', description: 'Tracking navi AIS con dettagli porto e carico', category: 'vehicle', tags: ['navi', 'porti', 'AIS'], workflow: 'verify' },
  { name: 'Targa Decoder IT', url: 'https://www.targheitaliane.com/', description: 'Decodifica targhe italiane — provincia, anno immatricolazione', category: 'vehicle', tags: ['targhe', 'auto', 'italia'], italyRelevant: true, workflow: 'identify' },
  { name: 'PRA Verifica', url: 'https://www.aci.it/i-servizi/servizi-online/verifica-copertura-rc-auto.html', description: 'ACI — Verifica copertura RC Auto e dati veicolo', category: 'vehicle', tags: ['assicurazione', 'RC', 'auto'], italyRelevant: true, workflow: 'verify' },

  // === MOBILE & FORENSICS (from CScorza/OSINT-FORENSICS-MOBILE) ===
  { name: 'PhoneInfoga', url: 'https://github.com/sundowndev/PhoneInfoga', description: 'Framework OSINT per numeri di telefono — carrier, linea, posizione', category: 'mobile', tags: ['telefono', 'carrier', 'geolocalizzazione'], workflow: 'identify' },
  { name: 'NumVerify', url: 'https://numverify.com/', description: 'API validazione numeri di telefono — carrier, tipo, paese', category: 'mobile', tags: ['telefono', 'validazione', 'API'], workflow: 'identify' },
  { name: 'Truecaller', url: 'https://www.truecaller.com/', description: 'Identificazione chiamante — nome, spam score, operatore', category: 'mobile', tags: ['telefono', 'identificazione', 'spam'], workflow: 'identify' },
  { name: 'Sync.me', url: 'https://sync.me/', description: 'Ricerca inversa numeri di telefono e identificazione chiamanti', category: 'mobile', tags: ['telefono', 'ricerca inversa'], workflow: 'identify' },
  { name: 'IMEI Check', url: 'https://www.imei.info/', description: 'Verifica IMEI — modello dispositivo, stato blocco, specifiche', category: 'mobile', tags: ['IMEI', 'dispositivo', 'blocco'], workflow: 'verify' },
  { name: 'CallerID Test', url: 'https://calleridtest.com/', description: 'Test e lookup caller ID per numeri telefonici', category: 'mobile', tags: ['caller', 'lookup', 'telefono'], workflow: 'identify' },

  // === AI & OSINT (from CScorza/OSINT-IA) ===
  { name: 'ChatGPT OSINT', url: 'https://chatgpt.com/', description: 'AI generativa per analisi, correlazione dati e redazione report OSINT', category: 'ai-osint', tags: ['AI', 'analisi', 'report'], workflow: 'analyze' },
  { name: 'Perplexity AI', url: 'https://www.perplexity.ai/', description: 'Ricerca AI con citazioni — ottimo per verification OSINT', category: 'ai-osint', tags: ['ricerca', 'AI', 'citazioni'], workflow: 'verify' },
  { name: 'Claude AI', url: 'https://claude.ai/', description: 'AI Anthropic per analisi complesse e ragionamento strutturato', category: 'ai-osint', tags: ['AI', 'analisi', 'ragionamento'], workflow: 'analyze' },
  { name: 'PimEyes', url: 'https://pimeyes.com/', description: 'Riconoscimento facciale AI — trova volti sul web da foto', category: 'ai-osint', tags: ['face', 'riconoscimento', 'AI'], workflow: 'identify' },
  { name: 'Deepware Scanner', url: 'https://scanner.deepware.ai/', description: 'Rilevamento deepfake in video tramite AI', category: 'ai-osint', tags: ['deepfake', 'video', 'AI'], workflow: 'verify' },
  { name: 'AI Image Detector', url: 'https://aiornot.com/', description: 'Determina se un\'immagine è generata da AI o reale', category: 'ai-osint', tags: ['AI', 'immagini', 'verifica'], workflow: 'verify' },
  { name: 'Hive Moderation', url: 'https://hivemoderation.com/', description: 'Rilevamento contenuti AI-generated — testo e immagini', category: 'ai-osint', tags: ['AI', 'moderazione', 'rilevamento'], workflow: 'verify' },

  // === WEB INTELLIGENCE (from CScorza/WEBIntelligence) ===
  { name: 'Netcraft', url: 'https://www.netcraft.com/', description: 'Analisi hosting, tecnologie, certificati e phishing detection', category: 'web-intel', tags: ['hosting', 'phishing', 'tecnologie'], workflow: 'footprint' },
  { name: 'URLScan.io', url: 'https://urlscan.io/', description: 'Scansione e analisi URL — screenshot, DOM, connessioni di rete', category: 'web-intel', tags: ['URL', 'scansione', 'screenshot'], workflow: 'analyze' },
  { name: 'SpyOnWeb', url: 'https://spyonweb.com/', description: 'Trova siti collegati tramite Google Analytics ID, IP, Adsense', category: 'web-intel', tags: ['analytics', 'collegamento', 'siti'], workflow: 'footprint' },
  { name: 'PublicWWW', url: 'https://publicwww.com/', description: 'Ricerca nel codice sorgente di milioni di siti web', category: 'web-intel', tags: ['codice', 'ricerca', 'HTML'], workflow: 'footprint' },
  { name: 'SimilarWeb', url: 'https://www.similarweb.com/', description: 'Analisi traffico web — visite, sorgenti, competitor', category: 'web-intel', tags: ['traffico', 'analytics', 'competitor'], workflow: 'analyze' },
  { name: 'Archive.today', url: 'https://archive.ph/', description: 'Cattura snapshot permanenti di pagine web', category: 'web-intel', tags: ['archivio', 'snapshot', 'prove'], workflow: 'verify' },
  { name: 'DomainTools', url: 'https://www.domaintools.com/', description: 'WHOIS storico, reverse WHOIS, DNS analytics', category: 'web-intel', tags: ['WHOIS', 'domini', 'storico'], workflow: 'footprint' },
  { name: 'Subdomain Finder', url: 'https://subdomainfinder.c99.nl/', description: 'Enumerazione sottodomini rapida e gratuita', category: 'web-intel', tags: ['sottodomini', 'DNS'], workflow: 'footprint' },
];
