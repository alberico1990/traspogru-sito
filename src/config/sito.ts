// Dati aziendali in un solo punto (fonte: carta intestata Traspogru).

export const SITO = {
  ragioneSociale: 'Traspogru S.r.l.',
  marchio: 'Traspogru',
  indirizzo: {
    via: 'Via Schito, 177',
    cap: '80053',
    citta: 'Castellammare di Stabia',
    provincia: 'NA',
    // coordinate approssimate di Via Schito, usate per mappa e dati strutturati
    lat: 40.7054,
    lng: 14.4906,
  },
  telefono: '+39 349 050 0663',
  telefonoVisibile: '349 050 0663',
  whatsapp: '393490500663',
  email: 'traspogru@libero.it', // dalla carta intestata; si potra' passare a info@ col nuovo dominio
  facebook: 'https://www.facebook.com/p/Traspogru-SRL-100070900233815/',
  legale: {
    piva: '07933781218',
    sedeLegale: 'Via Schito, 177 – 80053 Castellammare di Stabia (NA)',
    rea: 'NA-920562',
    albo: 'NA/6616891/T', // iscrizione Albo nazionale degli autotrasportatori
    capitaleSociale: '', // facoltativo: se vuoto non viene mostrato
  },
  intro: true, // intro della Home con il logo che si disegna (false per toglierla)
  dominio: 'https://www.traspogru.it', // dominio previsto (anche in astro.config.mjs e public/robots.txt)
} as const;


export const whatsappLink = (testo: string) =>
  `https://wa.me/${SITO.whatsapp}?text=${encodeURIComponent(testo)}`;

export const TESTO_WHATSAPP_PREVENTIVO =
  'Buongiorno, vorrei un preventivo per un trasporto di lamiere. Carico: … Partenza: … Arrivo: … Data indicativa: …';
