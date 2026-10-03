// All buyers, companies and tenders in the mock data are fictional.
//
// The ten tenders cover every case the UI has to handle:
//   T1  new            plain, fully eligible
//   T2  new            written in Russian (a keyword search in Romanian would miss it)
//   T3  questionable   unmet parameters (turnover, past contracts)
//   T4  questionable   gray zone (not sure we have the product), win chance unknown
//   T5  questionable   demo tender with five integrity signals
//   T6  not_interested moved by hand
//   T7  not_interested moved automatically after the last sync made it irrelevant
//   T8  lost           competitors analyzed, our bid rejected
//   T9  won            competitor files changed, re-analysis running
//   T10 new            changed in the last sync, still relevant
import type {
  CatalogueMatchCandidate,
  CompetitorAnalysis,
  QuestionableReason,
  TenderAnalysis,
  TenderDetail,
  WinChanceEstimate,
} from '@/api/types'
import { buyers } from './buyers'
import {
  checklist,
  cite,
  cited,
  daysAgo,
  daysFromNow,
  doc,
  hoursAgo,
  LAST_SYNC_AT,
  mdl,
  minutesAgo,
  record,
  redFlags,
  WIN_CHANCE_DISCLAIMER,
} from './helpers'
import { catalogue } from './profile'

export interface MockTender {
  detail: TenderDetail
  /** Shown on the card while the stage is "questionable". */
  questionable_reasons: QuestionableReason[]
  analysis: TenderAnalysis
  competitors: CompetitorAnalysis
}

function buyer(buyerId: string) {
  const found = buyers.find((b) => b.buyer_id === buyerId)
  if (!found) throw new Error(`Unknown mock buyer ${buyerId}`)
  return { buyer_id: found.buyer_id, buyer_name: found.name }
}

function candidate(itemId: number, similarity: number): CatalogueMatchCandidate {
  const item = catalogue.find((i) => i.id === itemId)
  if (!item) throw new Error(`Unknown mock catalogue item ${itemId}`)
  return { item_id: item.id, name: item.name, price: item.price, similarity }
}

function winChance(
  tender_id: string,
  estimated_probability: number | null,
  typical_bidder_count: number | null,
  typical_winning_ratio: number | null,
  buyer_concentration: number | null,
): WinChanceEstimate {
  return {
    tender_id,
    estimated_probability,
    typical_bidder_count,
    typical_winning_ratio,
    buyer_concentration,
    disclaimer: WIN_CHANCE_DISCLAIMER,
  }
}

const noCompetitorDocuments = (tender_id: string): CompetitorAnalysis => ({
  tender_id,
  state: 'no_documents',
  analyzed_at: null,
  participants: [],
  lessons: [],
})

const mtenderUrl = (ocid: string) => `https://mtender.gov.md/tenders/${ocid}`

// ---------------------------------------------------------------------------
// T1  new: laptops for a school lab
// ---------------------------------------------------------------------------

const t1 = (() => {
  const id = 'ocds-b3wdp1-MD-1759301000001'
  const spec = doc('t1-spec', 'Caiet de sarcini', {
    page_count: 12,
    published_at: daysAgo(3),
    analyzed_at: daysAgo(3),
  })
  const notice = doc('t1-notice', 'Anunț de participare', {
    page_count: 4,
    published_at: daysAgo(3),
    analyzed_at: daysAgo(3),
  })
  const espd = doc('t1-espd', 'Documentul unic de achiziții european (DUAE)', {
    page_count: 9,
    published_at: daysAgo(3),
    analyzed_at: daysAgo(3),
  })

  const tender: MockTender = {
    detail: {
      tender_id: id,
      ocid: id,
      title: 'Achiziționarea laptopurilor pentru laboratorul de informatică',
      description:
        'Livrarea a 18 laptopuri cu sistem de operare preinstalat pentru laboratorul de informatică ' +
        'al liceului, cu garanție de cel puțin 24 de luni și livrare în 30 de zile de la semnarea contractului.',
      language: 'ro',
      ...buyer('buyer-orizont'),
      estimated_value: mdl(340000),
      region: 'r. Ungheni',
      cpv_codes: ['30213100-6'],
      procedure_type: 'Licitație deschisă',
      mtender_status: 'active',
      mtender_url: mtenderUrl(id),
      published_at: daysAgo(3),
      modified_at: null,
      tender_start_at: daysAgo(3),
      deadline: daysFromNow(12),
      stage: 'new',
      stage_source: 'auto',
      stage_reason: null,
      summary: [
        cited(
          '18 laptopuri cu procesor Intel Core i5 sau echivalent, 16 GB RAM și SSD de 512 GB.',
          cite(spec, 3),
        ),
        cited(
          'Garanție de cel puțin 24 de luni și livrare în 30 de zile de la semnarea contractului.',
          cite(spec, 7),
        ),
        cited('Câștigă prețul cel mai mic. Ofertele se depun prin MTender.', cite(notice, 2)),
      ],
      tags: ['Laptopuri', 'Educație', 'IT'],
      documents: [spec, notice, espd],
      product_matches: [
        {
          tender_item: cited(
            'Laptop 14", Intel Core i5 sau echivalent, 16 GB RAM, SSD 512 GB — 18 buc.',
            cite(spec, 3),
          ),
          catalogue_item: candidate(1, 0.94),
          estimated_unit_price: mdl(18900),
        },
      ],
      changes: [],
    },
    questionable_reasons: [],
    analysis: {
      tender_id: id,
      fit_score: 0.91,
      red_flags: redFlags(),
      eligibility: checklist(id, [
        {
          requirement: 'Cifră de afaceri anuală de cel puțin 1 000 000 MDL',
          requirement_type: 'financial',
          threshold: '1 000 000 MDL',
          citation: cite(espd, 4),
          met: true,
          notes: 'Profil: 3 200 000 MDL',
        },
        {
          requirement: 'Cel puțin un contract similar de livrare a echipamentelor IT în ultimii 3 ani',
          requirement_type: 'technical',
          threshold: '1 contract',
          citation: cite(espd, 5),
          met: true,
          notes: null,
        },
        {
          requirement: 'Certificat de înregistrare a întreprinderii',
          requirement_type: 'legal',
          threshold: null,
          citation: cite(espd, 2),
          met: true,
          notes: null,
        },
        {
          requirement: 'Garanție pentru ofertă',
          requirement_type: 'administrative',
          threshold: '1% din valoarea ofertei',
          citation: cite(notice, 3),
          met: true,
          notes: null,
        },
        {
          requirement: 'Garanția producătorului',
          requirement_type: 'technical',
          threshold: '24 de luni',
          citation: cite(spec, 7),
          met: true,
          notes: null,
        },
        {
          requirement: 'Termen de livrare',
          requirement_type: 'technical',
          threshold: '30 de zile',
          citation: cite(spec, 7),
          met: true,
          notes: null,
        },
        {
          requirement: 'Oferta rămâne valabilă',
          requirement_type: 'administrative',
          threshold: '60 de zile',
          citation: cite(espd, 6),
          met: true,
          notes: null,
        },
      ]),
      win_chance: winChance(id, 0.42, 3.4, 0.88, 0.13),
    },
    competitors: noCompetitorDocuments(id),
  }
  return tender
})()

// ---------------------------------------------------------------------------
// T2  new: tender written in Russian
// ---------------------------------------------------------------------------

const t2 = (() => {
  const id = 'ocds-b3wdp1-MD-1759301000002'
  const spec = doc('t2-spec', 'Техническое задание', {
    language: 'ru',
    page_count: 8,
    published_at: daysAgo(2),
    analyzed_at: daysAgo(2),
  })
  const notice = doc('t2-notice', 'Объявление о закупке', {
    language: 'ru',
    page_count: 3,
    published_at: daysAgo(2),
    analyzed_at: daysAgo(2),
  })
  const espd = doc('t2-espd', 'Единый европейский документ закупок (ЕЕДЗ)', {
    language: 'ru',
    page_count: 9,
    published_at: daysAgo(2),
    analyzed_at: daysAgo(2),
  })

  const tender: MockTender = {
    detail: {
      tender_id: id,
      ocid: id,
      title: 'Поставка компьютерной техники и принтеров для центра социальных услуг',
      description:
        'Поставка 6 настольных компьютеров с мониторами и 2 лазерных многофункциональных ' +
        'устройств формата A4, включая установку и настройку на месте.',
      language: 'ru',
      ...buyer('buyer-bugeac'),
      estimated_value: mdl(185000),
      region: 'UTA Găgăuzia',
      cpv_codes: ['30213000-5', '30232110-8'],
      procedure_type: 'Licitație deschisă',
      mtender_status: 'active',
      mtender_url: mtenderUrl(id),
      published_at: daysAgo(2),
      modified_at: null,
      tender_start_at: daysAgo(2),
      deadline: daysFromNow(9),
      stage: 'new',
      stage_source: 'auto',
      stage_reason: null,
      summary: [
        cited(
          'Licitația e redactată în rusă: 6 calculatoare cu monitoare și 2 imprimante multifuncționale laser A4.',
          cite(spec, 2),
        ),
        cited('Instalarea și configurarea la sediul cumpărătorului sunt incluse în preț.', cite(spec, 5)),
        cited('Livrare în 20 de zile de la semnarea contractului.', cite(notice, 2)),
      ],
      tags: ['Calculatoare', 'Imprimante', 'Servicii sociale'],
      documents: [spec, notice, espd],
      product_matches: [
        {
          tender_item: cited(
            'Настольный компьютер: Intel Core i5 или эквивалент, 8 ГБ ОЗУ, SSD 256 ГБ — 6 шт.',
            cite(spec, 3),
          ),
          catalogue_item: candidate(2, 0.9),
          estimated_unit_price: mdl(13000),
        },
        {
          tender_item: cited('Монитор 23,8–24", не менее 1920×1080 — 6 шт.', cite(spec, 3)),
          catalogue_item: candidate(3, 0.88),
          estimated_unit_price: mdl(4500),
        },
        {
          tender_item: cited('Лазерное МФУ, A4, двусторонняя печать — 2 шт.', cite(spec, 4)),
          catalogue_item: candidate(4, 0.86),
          estimated_unit_price: mdl(9000),
        },
        {
          tender_item: cited('Установка и настройка рабочих мест — 6 шт.', cite(spec, 5)),
          catalogue_item: candidate(7, 0.83),
          estimated_unit_price: mdl(500),
        },
      ],
      changes: [],
    },
    questionable_reasons: [],
    analysis: {
      tender_id: id,
      fit_score: 0.87,
      red_flags: redFlags(),
      eligibility: checklist(id, [
        {
          requirement: 'Cifră de afaceri anuală de cel puțin 500 000 MDL',
          requirement_type: 'financial',
          threshold: '500 000 MDL',
          citation: cite(espd, 4),
          met: true,
          notes: 'Profil: 3 200 000 MDL',
        },
        {
          requirement: 'Service propriu în Republica Moldova',
          requirement_type: 'technical',
          threshold: null,
          citation: cite(spec, 6),
          met: true,
          notes: null,
        },
        {
          requirement: 'Garanție pentru echipamente',
          requirement_type: 'technical',
          threshold: '24 de luni',
          citation: cite(spec, 6),
          met: true,
          notes: null,
        },
        {
          requirement: 'Certificat de înregistrare a întreprinderii',
          requirement_type: 'legal',
          threshold: null,
          citation: cite(espd, 2),
          met: true,
          notes: null,
        },
        {
          requirement: 'Garanție pentru ofertă',
          requirement_type: 'administrative',
          threshold: '2% din valoarea ofertei',
          citation: cite(notice, 3),
          met: true,
          notes: null,
        },
        {
          requirement: 'Certificate de conformitate pentru echipamente',
          requirement_type: 'legal',
          threshold: null,
          citation: null,
          met: null,
          notes: 'Cerința nu a fost găsită în documentele publicate.',
        },
      ]),
      win_chance: winChance(id, 0.55, 2.1, 0.91, 0.16),
    },
    competitors: noCompetitorDocuments(id),
  }
  return tender
})()

// ---------------------------------------------------------------------------
// T3  questionable: unmet parameters
// ---------------------------------------------------------------------------

const t3 = (() => {
  const id = 'ocds-b3wdp1-MD-1759301000003'
  const spec = doc('t3-spec', 'Caiet de sarcini', {
    page_count: 18,
    published_at: daysAgo(5),
    analyzed_at: daysAgo(5),
  })
  const notice = doc('t3-notice', 'Anunț de participare', {
    page_count: 5,
    published_at: daysAgo(5),
    analyzed_at: daysAgo(5),
  })
  const espd = doc('t3-espd', 'Documentul unic de achiziții european (DUAE)', {
    page_count: 10,
    published_at: daysAgo(5),
    analyzed_at: daysAgo(5),
  })

  const tender: MockTender = {
    detail: {
      tender_id: id,
      ocid: id,
      title: 'Achiziționarea echipamentelor de rețea pentru centrele comunitare de acces la internet',
      description:
        'Livrarea, instalarea și configurarea a 40 de switch-uri administrabile și 40 de puncte de acces ' +
        'Wi-Fi în centrele comunitare din regiunea de Nord.',
      language: 'ro',
      ...buyer('buyer-ard-nord'),
      estimated_value: mdl(1450000),
      region: 'mun. Bălți',
      cpv_codes: ['32420000-3'],
      procedure_type: 'Licitație deschisă',
      mtender_status: 'active',
      mtender_url: mtenderUrl(id),
      published_at: daysAgo(5),
      modified_at: null,
      tender_start_at: daysAgo(5),
      deadline: daysFromNow(15),
      stage: 'questionable',
      stage_source: 'auto',
      stage_reason: null,
      summary: [
        cited(
          '40 de switch-uri administrabile cu 24 de porturi și 40 de puncte de acces Wi-Fi 6, cu instalare.',
          cite(spec, 4),
        ),
        cited(
          'Cere cifră de afaceri anuală de cel puțin 5 000 000 MDL și 3 contracte similare.',
          cite(espd, 4),
          cite(espd, 5),
        ),
        cited('Echipamentele se instalează în 12 centre din 6 raioane.', cite(spec, 9)),
      ],
      tags: ['Rețele', 'Wi-Fi', 'Instalare'],
      documents: [spec, notice, espd],
      product_matches: [
        {
          tender_item: cited('Switch administrabil, 24 de porturi Gigabit, 4 SFP — 40 buc.', cite(spec, 4)),
          catalogue_item: candidate(6, 0.92),
          estimated_unit_price: mdl(7200),
        },
        {
          tender_item: cited('Punct de acces Wi-Fi 6, montare pe tavan — 40 buc.', cite(spec, 5)),
          catalogue_item: null,
          estimated_unit_price: mdl(3100),
        },
      ],
      changes: [],
    },
    questionable_reasons: [
      {
        kind: 'unmet_parameter',
        parameter: 'Cifra de afaceri anuală',
        required: 'cel puțin 5 000 000 MDL',
        ours: '3 200 000 MDL',
        citation: cite(espd, 4),
      },
      {
        kind: 'unmet_parameter',
        parameter: 'Contracte similare în ultimii 3 ani',
        required: 'cel puțin 3 contracte de minimum 500 000 MDL fiecare',
        ours: null,
        citation: cite(espd, 5),
      },
    ],
    analysis: {
      tender_id: id,
      fit_score: 0.74,
      red_flags: redFlags(),
      eligibility: checklist(id, [
        {
          requirement: 'Cifră de afaceri anuală de cel puțin 5 000 000 MDL',
          requirement_type: 'financial',
          threshold: '5 000 000 MDL',
          citation: cite(espd, 4),
          met: false,
          notes: 'Profil: 3 200 000 MDL',
        },
        {
          requirement: 'Cel puțin 3 contracte similare de minimum 500 000 MDL în ultimii 3 ani',
          requirement_type: 'technical',
          threshold: '3 contracte',
          citation: cite(espd, 5),
          met: false,
          notes: 'Profilul nu conține contracte anterioare.',
        },
        {
          requirement: 'Certificat de înregistrare a întreprinderii',
          requirement_type: 'legal',
          threshold: null,
          citation: cite(espd, 2),
          met: true,
          notes: null,
        },
        {
          requirement: 'Garanție pentru ofertă',
          requirement_type: 'administrative',
          threshold: '1% din valoarea ofertei',
          citation: cite(notice, 3),
          met: true,
          notes: null,
        },
        {
          requirement: 'Garanție pentru echipamente',
          requirement_type: 'technical',
          threshold: '36 de luni',
          citation: cite(spec, 12),
          met: true,
          notes: null,
        },
        {
          requirement: 'Cel puțin 2 ingineri de rețea în echipă',
          requirement_type: 'technical',
          threshold: '2 persoane',
          citation: cite(spec, 14),
          met: true,
          notes: 'Profil: 18 angajați',
        },
        {
          requirement: 'Termen de livrare și instalare',
          requirement_type: 'technical',
          threshold: '45 de zile',
          citation: cite(spec, 9),
          met: true,
          notes: null,
        },
        {
          requirement: 'Declarație privind neîncadrarea în situațiile de excludere',
          requirement_type: 'administrative',
          threshold: null,
          citation: cite(espd, 7),
          met: true,
          notes: null,
        },
      ]),
      win_chance: winChance(id, 0.18, 4.2, 0.84, 0.12),
    },
    competitors: noCompetitorDocuments(id),
  }
  return tender
})()

// ---------------------------------------------------------------------------
// T4  questionable: gray zone
// ---------------------------------------------------------------------------

const t4 = (() => {
  const id = 'ocds-b3wdp1-MD-1759301000004'
  const spec = doc('t4-spec', 'Caiet de sarcini', {
    page_count: 9,
    published_at: daysAgo(4),
    analyzed_at: daysAgo(4),
  })
  const notice = doc('t4-notice', 'Anunț de participare', {
    page_count: 3,
    published_at: daysAgo(4),
    analyzed_at: daysAgo(4),
  })
  const printer = cited(
    'Imprimantă multifuncțională color, format A3, cel puțin 30 de pagini pe minut — 10 buc.',
    cite(spec, 3),
  )

  const tender: MockTender = {
    detail: {
      tender_id: id,
      ocid: id,
      title: 'Achiziționarea imprimantelor multifuncționale color A3',
      description:
        'Livrarea a 10 imprimante multifuncționale color, format A3, pentru secțiile de diagnostic, ' +
        'cu instruirea personalului.',
      language: 'ro',
      ...buyer('buyer-aurora'),
      estimated_value: mdl(260000),
      region: 'mun. Chișinău',
      cpv_codes: ['30232110-8'],
      procedure_type: 'Licitație deschisă',
      mtender_status: 'active',
      mtender_url: mtenderUrl(id),
      published_at: daysAgo(4),
      modified_at: null,
      tender_start_at: daysAgo(4),
      deadline: daysFromNow(7),
      stage: 'questionable',
      stage_source: 'auto',
      stage_reason: null,
      summary: [
        cited('10 imprimante multifuncționale color A3, de cel puțin 30 de pagini pe minut.', cite(spec, 3)),
        cited('Furnizorul instruiește personalul celor 4 secții de diagnostic.', cite(spec, 6)),
      ],
      tags: ['Imprimante', 'Medicină'],
      documents: [spec, notice],
      product_matches: [
        { tender_item: printer, catalogue_item: candidate(4, 0.71), estimated_unit_price: mdl(24000) },
      ],
      changes: [],
    },
    questionable_reasons: [
      {
        kind: 'gray_zone',
        tender_item: printer,
        explanation:
          'Lista de prețuri are doar o imprimantă laser monocrom A4. Profilul spune că puteți aduce ' +
          'și alte modele la comandă, deci nu e clar dacă puteți livra imprimante color A3.',
        closest_items: [candidate(4, 0.71)],
      },
    ],
    analysis: {
      tender_id: id,
      fit_score: 0.68,
      red_flags: redFlags(),
      eligibility: checklist(id, [
        {
          requirement: 'Cifră de afaceri anuală de cel puțin 800 000 MDL',
          requirement_type: 'financial',
          threshold: '800 000 MDL',
          citation: cite(notice, 2),
          met: true,
          notes: 'Profil: 3 200 000 MDL',
        },
        {
          requirement: 'Certificat de înregistrare a întreprinderii',
          requirement_type: 'legal',
          threshold: null,
          citation: cite(notice, 2),
          met: true,
          notes: null,
        },
        {
          requirement: 'Garanție pentru echipamente',
          requirement_type: 'technical',
          threshold: '24 de luni',
          citation: cite(spec, 5),
          met: true,
          notes: null,
        },
        {
          requirement: 'Instruirea personalului la sediul cumpărătorului',
          requirement_type: 'technical',
          threshold: null,
          citation: cite(spec, 6),
          met: true,
          notes: null,
        },
        {
          requirement: 'Garanție pentru ofertă',
          requirement_type: 'administrative',
          threshold: '1% din valoarea ofertei',
          citation: cite(notice, 3),
          met: true,
          notes: null,
        },
        {
          requirement: 'Autorizație de distribuitor oficial al producătorului',
          requirement_type: 'legal',
          threshold: null,
          citation: cite(spec, 7),
          met: null,
          notes: 'Profilul nu spune dacă sunteți distribuitor autorizat.',
        },
      ]),
      win_chance: winChance(id, null, null, null, 0.12),
    },
    competitors: noCompetitorDocuments(id),
  }
  return tender
})()

// ---------------------------------------------------------------------------
// T5  questionable: demo tender with integrity signals
// ---------------------------------------------------------------------------

const t5 = (() => {
  const id = 'ocds-b3wdp1-MD-1759301000005'
  const spec = doc('t5-spec', 'Caiet de sarcini', {
    page_count: 7,
    published_at: daysAgo(2),
    analyzed_at: daysAgo(2),
  })
  const notice = doc('t5-notice', 'Anunț de participare', {
    page_count: 3,
    published_at: daysAgo(2),
    analyzed_at: daysAgo(2),
  })
  const buyerAwards = record(
    'mtender-awards-valea-stelelor',
    'MTender: contractele atribuite de cumpărător, 2023–2026',
  )
  const similarTenders = record(
    'mtender-similar-30213000',
    'MTender: licitații similare (CPV 30213000-5), 2024–2026',
  )

  const tender: MockTender = {
    detail: {
      tender_id: id,
      ocid: id,
      title: 'Achiziționarea calculatoarelor și monitoarelor pentru aparatul administrativ',
      description:
        'Livrarea a 25 de calculatoare și 25 de monitoare pentru aparatul administrativ al întreprinderii, ' +
        'cu instalare.',
      language: 'ro',
      ...buyer('buyer-valea-stelelor'),
      estimated_value: mdl(720000),
      region: 'r. Strășeni',
      cpv_codes: ['30213000-5'],
      procedure_type: 'Licitație deschisă',
      mtender_status: 'active',
      mtender_url: mtenderUrl(id),
      published_at: daysAgo(2),
      modified_at: null,
      tender_start_at: daysAgo(2),
      deadline: daysFromNow(4),
      stage: 'questionable',
      stage_source: 'auto',
      stage_reason: null,
      summary: [
        cited(
          '25 de calculatoare cu procesor Intel Core i7-14700 și 25 de monitoare de exact 23,8".',
          cite(spec, 3),
          cite(spec, 4),
        ),
        cited('Ofertele se depun în 6 zile de la publicare.', cite(notice, 1)),
        cited('Instalarea la sediul cumpărătorului e inclusă.', cite(spec, 5)),
      ],
      tags: ['Calculatoare', 'Monitoare', 'Administrație publică'],
      documents: [spec, notice],
      product_matches: [
        {
          tender_item: cited(
            'Calculator, procesor Intel Core i7-14700, 16 GB RAM, SSD 512 GB — 25 buc.',
            cite(spec, 3),
          ),
          catalogue_item: candidate(2, 0.68),
          estimated_unit_price: mdl(21000),
        },
        {
          tender_item: cited('Monitor cu diagonala de exact 23,8" — 25 buc.', cite(spec, 4)),
          catalogue_item: candidate(3, 0.8),
          estimated_unit_price: mdl(4000),
        },
      ],
      changes: [],
    },
    questionable_reasons: [
      {
        kind: 'unmet_parameter',
        parameter: 'Procesor',
        required: 'Intel Core i7-14700, fără „sau echivalent”',
        ours: 'Intel Core i5-13400 (HP Pro Tower 290 G9)',
        citation: cite(spec, 3),
      },
    ],
    analysis: {
      tender_id: id,
      fit_score: 0.72,
      red_flags: redFlags({
        short_submission_window: [
          cited('Ofertele se depun în 6 zile de la publicare.', cite(notice, 1)),
          cited(
            'La licitațiile similare din ultimii 2 ani, termenul median a fost de 21 de zile.',
            similarTenders,
          ),
        ],
        single_bidder_history: [
          cited(
            '25 din cele 39 de licitații ale cumpărătorului din 2023 încoace (64%) au primit o singură ofertă.',
            buyerAwards,
          ),
        ],
        repeat_winner: [
          cited(
            'Același furnizor a câștigat 7 din ultimele 9 contracte ale acestui cumpărător.',
            buyerAwards,
          ),
        ],
        brand_without_equivalent: [
          cited(
            'Caietul de sarcini cere „procesor Intel Core i7-14700” fără mențiunea „sau echivalent”.',
            cite(spec, 3),
          ),
        ],
        narrow_tolerances: [
          cited('Monitorul trebuie să aibă diagonala de exact 23,8", fără nicio toleranță.', cite(spec, 4)),
        ],
      }),
      eligibility: checklist(id, [
        {
          requirement: 'Cifră de afaceri anuală de cel puțin 1 000 000 MDL',
          requirement_type: 'financial',
          threshold: '1 000 000 MDL',
          citation: cite(notice, 2),
          met: true,
          notes: 'Profil: 3 200 000 MDL',
        },
        {
          requirement: 'Procesor Intel Core i7-14700',
          requirement_type: 'technical',
          threshold: 'Intel Core i7-14700',
          citation: cite(spec, 3),
          met: false,
          notes: 'Catalog: Intel Core i5-13400',
        },
        {
          requirement: 'Certificat de înregistrare a întreprinderii',
          requirement_type: 'legal',
          threshold: null,
          citation: cite(notice, 2),
          met: true,
          notes: null,
        },
        {
          requirement: 'Garanție pentru echipamente',
          requirement_type: 'technical',
          threshold: '36 de luni',
          citation: cite(spec, 6),
          met: true,
          notes: null,
        },
        {
          requirement: 'Garanție pentru ofertă',
          requirement_type: 'administrative',
          threshold: '2% din valoarea ofertei',
          citation: cite(notice, 3),
          met: true,
          notes: null,
        },
        {
          requirement: 'Experiență în livrări către întreprinderi municipale',
          requirement_type: 'technical',
          threshold: null,
          citation: null,
          met: null,
          notes: 'Cerința nu a fost găsită în documentele publicate.',
        },
      ]),
      win_chance: winChance(id, 0.09, 1.3, 0.98, 0.56),
    },
    competitors: noCompetitorDocuments(id),
  }
  return tender
})()

// ---------------------------------------------------------------------------
// T6  not_interested: moved by hand
// ---------------------------------------------------------------------------

const t6 = (() => {
  const id = 'ocds-b3wdp1-MD-1759301000006'
  const spec = doc('t6-spec', 'Caiet de sarcini', {
    page_count: 6,
    published_at: daysAgo(8),
    analyzed_at: daysAgo(8),
  })

  const tender: MockTender = {
    detail: {
      tender_id: id,
      ocid: id,
      title: 'Servicii de mentenanță a sistemului de supraveghere video',
      description:
        'Mentenanța preventivă și corectivă a 64 de camere video și a serverului de înregistrare, timp de 12 luni.',
      language: 'ro',
      ...buyer('buyer-ard-nord'),
      estimated_value: mdl(95000),
      region: 'mun. Bălți',
      cpv_codes: ['50343000-1'],
      procedure_type: 'Licitație deschisă',
      mtender_status: 'active',
      mtender_url: mtenderUrl(id),
      published_at: daysAgo(8),
      modified_at: null,
      tender_start_at: daysAgo(8),
      deadline: daysFromNow(6),
      stage: 'not_interested',
      stage_source: 'manual',
      stage_reason: null,
      summary: [
        cited(
          'Mentenanță lunară pentru 64 de camere video și serverul de înregistrare, timp de 12 luni.',
          cite(spec, 2),
        ),
        cited('Cere licență pentru montarea sistemelor de securitate.', cite(spec, 5)),
      ],
      tags: ['Supraveghere video', 'Mentenanță'],
      documents: [spec],
      product_matches: [
        {
          tender_item: cited('Mentenanță cameră video (lunar, per dispozitiv) — 64 buc.', cite(spec, 2)),
          catalogue_item: null,
          estimated_unit_price: mdl(120),
        },
      ],
      changes: [],
    },
    questionable_reasons: [],
    analysis: {
      tender_id: id,
      fit_score: 0.41,
      red_flags: redFlags(),
      eligibility: checklist(id, [
        {
          requirement: 'Licență pentru proiectarea și montarea sistemelor de securitate',
          requirement_type: 'legal',
          threshold: null,
          citation: cite(spec, 5),
          met: false,
          notes: 'Profilul nu are licențe.',
        },
        {
          requirement: 'Tehnician certificat pentru sisteme de supraveghere video',
          requirement_type: 'technical',
          threshold: '1 persoană',
          citation: cite(spec, 5),
          met: false,
          notes: null,
        },
        {
          requirement: 'Certificat de înregistrare a întreprinderii',
          requirement_type: 'legal',
          threshold: null,
          citation: cite(spec, 4),
          met: true,
          notes: null,
        },
        {
          requirement: 'Intervenție în cel mult 24 de ore',
          requirement_type: 'technical',
          threshold: '24 de ore',
          citation: cite(spec, 3),
          met: true,
          notes: null,
        },
        {
          requirement: 'Garanție pentru ofertă',
          requirement_type: 'administrative',
          threshold: '1% din valoarea ofertei',
          citation: cite(spec, 6),
          met: true,
          notes: null,
        },
      ]),
      win_chance: winChance(id, 0.2, 2.8, 0.9, 0.12),
    },
    competitors: noCompetitorDocuments(id),
  }
  return tender
})()

// ---------------------------------------------------------------------------
// T7  not_interested: became irrelevant in the last sync
// ---------------------------------------------------------------------------

const t7 = (() => {
  const id = 'ocds-b3wdp1-MD-1759301000007'
  const spec = doc('t7-spec', 'Caiet de sarcini', {
    page_count: 7,
    published_at: daysAgo(10),
    analyzed_at: daysAgo(10),
  })
  const amendment = doc('t7-amendment', 'Modificarea nr. 1 a documentației de atribuire', {
    page_count: 2,
    published_at: minutesAgo(40),
    analyzed_at: LAST_SYNC_AT,
  })

  const tender: MockTender = {
    detail: {
      tender_id: id,
      ocid: id,
      title: 'Achiziționarea calculatoarelor și licențelor software pentru bibliotecă',
      description:
        'Lotul 1: 8 calculatoare pentru sala de lectură (anulat). Lotul 2: licențe Microsoft 365 pentru 30 de ' +
        'utilizatori, pe 12 luni.',
      language: 'ro',
      ...buyer('buyer-orizont'),
      estimated_value: mdl(58000),
      region: 'r. Ungheni',
      cpv_codes: ['48000000-8'],
      procedure_type: 'Licitație deschisă',
      mtender_status: 'active',
      mtender_url: mtenderUrl(id),
      published_at: daysAgo(10),
      modified_at: minutesAgo(40),
      tender_start_at: daysAgo(10),
      deadline: daysFromNow(8),
      stage: 'not_interested',
      stage_source: 'auto',
      stage_reason:
        'A devenit irelevantă: lotul cu calculatoare a fost anulat și au rămas doar licențe software.',
      summary: [
        cited('Lotul 1, cu 8 calculatoare, a fost anulat prin modificarea nr. 1.', cite(amendment, 1)),
        cited('A rămas lotul 2: licențe Microsoft 365 pentru 30 de utilizatori, pe 12 luni.', cite(spec, 5)),
      ],
      tags: ['Licențe software', 'Educație'],
      documents: [spec, amendment],
      product_matches: [
        {
          tender_item: cited('Licență Microsoft 365 Business Standard, 12 luni — 30 buc.', cite(spec, 5)),
          catalogue_item: null,
          estimated_unit_price: mdl(1900),
        },
      ],
      changes: [
        {
          synced_at: LAST_SYNC_AT,
          changes: ['Lotul 1 „Calculatoare” a fost anulat', 'Valoarea estimată: 160 000 MDL → 58 000 MDL'],
          verdict: 'irrelevant',
          reason: cited(
            'Lotul rămas cere doar licențe Microsoft 365, care nu sunt în catalogul vostru.',
            cite(amendment, 1),
          ),
          stage_before: 'new',
          stage_after: 'not_interested',
        },
      ],
    },
    questionable_reasons: [],
    analysis: {
      tender_id: id,
      fit_score: 0.32,
      red_flags: redFlags(),
      eligibility: checklist(id, [
        {
          requirement: 'Statut de partener autorizat Microsoft',
          requirement_type: 'legal',
          threshold: null,
          citation: cite(spec, 6),
          met: false,
          notes: 'Profilul nu menționează acest statut.',
        },
        {
          requirement: 'Certificat de înregistrare a întreprinderii',
          requirement_type: 'legal',
          threshold: null,
          citation: cite(spec, 4),
          met: true,
          notes: null,
        },
        {
          requirement: 'Cifră de afaceri anuală de cel puțin 200 000 MDL',
          requirement_type: 'financial',
          threshold: '200 000 MDL',
          citation: cite(spec, 4),
          met: true,
          notes: 'Profil: 3 200 000 MDL',
        },
        {
          requirement: 'Activarea licențelor în 5 zile',
          requirement_type: 'technical',
          threshold: '5 zile',
          citation: cite(spec, 5),
          met: true,
          notes: null,
        },
        {
          requirement: 'Garanție pentru ofertă',
          requirement_type: 'administrative',
          threshold: '1% din valoarea ofertei',
          citation: cite(spec, 7),
          met: true,
          notes: null,
        },
      ]),
      win_chance: winChance(id, 0.15, 3, 0.93, 0.13),
    },
    competitors: noCompetitorDocuments(id),
  }
  return tender
})()

// ---------------------------------------------------------------------------
// T8  lost: competitors analyzed, our bid rejected
// ---------------------------------------------------------------------------

const t8 = (() => {
  const id = 'ocds-b3wdp1-MD-1759301000008'
  const spec = doc('t8-spec', 'Caiet de sarcini', {
    page_count: 10,
    published_at: daysAgo(70),
    analyzed_at: daysAgo(70),
  })
  const report = doc('t8-report', 'Darea de seamă privind procedura de achiziție', {
    page_count: 6,
    published_at: daysAgo(30),
    analyzed_at: daysAgo(30),
  })
  const nexusTech = doc('t8-nexus-tech', 'Oferta tehnică — Nexus Birotică SRL', {
    participant_id: 'nexus',
    page_count: 14,
    published_at: daysAgo(47),
    analyzed_at: daysAgo(30),
  })
  const nexusPrice = doc('t8-nexus-price', 'Oferta financiară — Nexus Birotică SRL', {
    participant_id: 'nexus',
    page_count: 2,
    published_at: daysAgo(47),
    analyzed_at: daysAgo(30),
  })
  const rapidTech = doc('t8-rapid-tech', 'Oferta tehnică — Rapid Byte SRL', {
    participant_id: 'rapid',
    page_count: 9,
    published_at: daysAgo(47),
    analyzed_at: daysAgo(30),
  })
  const ourTech = doc('t8-us-tech', 'Oferta tehnică — TehnoServ Grup SRL', {
    participant_id: 'us',
    page_count: 11,
    published_at: daysAgo(47),
    analyzed_at: daysAgo(30),
  })

  const tender: MockTender = {
    detail: {
      tender_id: id,
      ocid: id,
      title: 'Achiziționarea tablelor interactive și a proiectoarelor',
      description:
        'Livrarea și instalarea a 12 table interactive și 12 proiectoare cu distanță ultrascurtă pentru sălile de clasă.',
      language: 'ro',
      ...buyer('buyer-orizont'),
      estimated_value: mdl(410000),
      region: 'r. Ungheni',
      cpv_codes: ['32322000-6', '38652120-7'],
      procedure_type: 'Licitație deschisă',
      mtender_status: 'complete',
      mtender_url: mtenderUrl(id),
      published_at: daysAgo(70),
      modified_at: daysAgo(30),
      tender_start_at: daysAgo(70),
      deadline: daysAgo(48),
      stage: 'lost',
      stage_source: 'auto',
      stage_reason: 'Contractul a fost atribuit altui ofertant.',
      summary: [
        cited(
          '12 table interactive de cel puțin 75" și 12 proiectoare cu distanță ultrascurtă, cu instalare.',
          cite(spec, 3),
        ),
        cited('Contractul a fost atribuit către Nexus Birotică SRL pentru 352 600 MDL.', cite(report, 5)),
      ],
      tags: ['Table interactive', 'Proiectoare', 'Educație'],
      documents: [spec, report, nexusTech, nexusPrice, rapidTech, ourTech],
      product_matches: [
        {
          tender_item: cited('Tablă interactivă 75", 4K — 12 buc.', cite(spec, 3)),
          catalogue_item: null,
          estimated_unit_price: mdl(22000),
        },
        {
          tender_item: cited('Proiector cu distanță ultrascurtă — 12 buc.', cite(spec, 4)),
          catalogue_item: null,
          estimated_unit_price: mdl(11000),
        },
      ],
      changes: [],
    },
    questionable_reasons: [],
    analysis: {
      tender_id: id,
      fit_score: 0.66,
      red_flags: redFlags(),
      eligibility: checklist(id, [
        {
          requirement: 'Cifră de afaceri anuală de cel puțin 1 000 000 MDL',
          requirement_type: 'financial',
          threshold: '1 000 000 MDL',
          citation: cite(spec, 8),
          met: true,
          notes: 'Profil: 3 200 000 MDL',
        },
        {
          requirement: 'Certificat de garanție pentru 36 de luni',
          requirement_type: 'technical',
          threshold: '36 de luni',
          citation: cite(spec, 6),
          met: true,
          notes: null,
        },
        {
          requirement: 'Certificat de înregistrare a întreprinderii',
          requirement_type: 'legal',
          threshold: null,
          citation: cite(spec, 8),
          met: true,
          notes: null,
        },
        {
          requirement: 'Garanție pentru ofertă',
          requirement_type: 'administrative',
          threshold: '1% din valoarea ofertei',
          citation: cite(spec, 9),
          met: true,
          notes: null,
        },
      ]),
      win_chance: winChance(id, 0.3, 3.4, 0.88, 0.13),
    },
    competitors: {
      tender_id: id,
      state: 'up_to_date',
      analyzed_at: daysAgo(30),
      participants: [
        {
          participant_id: 'nexus',
          name: 'Nexus Birotică SRL',
          idno: '1012600044518',
          is_us: false,
          status: 'winner',
          bid_price: mdl(352600),
          price_vs_estimate: 0.86,
          rejection_reason: null,
          strengths: [
            cited(
              'A atașat certificatul de garanție de 36 de luni cerut în caietul de sarcini.',
              cite(nexusTech, 8),
            ),
            cited('Preț cu 14% sub valoarea estimată.', cite(nexusPrice, 1)),
          ],
          weaknesses: [
            cited('Termen de livrare de 45 de zile, cel mai lung dintre oferte.', cite(nexusTech, 11)),
          ],
          document_ids: [nexusTech.document_id, nexusPrice.document_id],
        },
        {
          participant_id: 'us',
          name: 'TehnoServ Grup SRL',
          idno: '1009600012346',
          is_us: true,
          status: 'rejected',
          bid_price: mdl(338000),
          price_vs_estimate: 0.82,
          rejection_reason: cited(
            'Oferta nu a inclus certificatul de garanție de 36 de luni cerut la punctul 4.2.',
            cite(report, 4),
          ),
          strengths: [cited('Cel mai mic preț dintre oferte.', cite(report, 3))],
          weaknesses: [cited('Lipsea certificatul de garanție de 36 de luni.', cite(report, 4))],
          document_ids: [ourTech.document_id],
        },
        {
          participant_id: 'rapid',
          name: 'Rapid Byte SRL',
          idno: '1015600027731',
          is_us: false,
          status: 'disqualified',
          bid_price: mdl(395000),
          price_vs_estimate: 0.96,
          rejection_reason: cited('Garanția pentru ofertă nu a fost depusă.', cite(report, 4)),
          strengths: [cited('Livrare în 20 de zile, cea mai rapidă dintre oferte.', cite(rapidTech, 6))],
          weaknesses: [cited('Garanția pentru ofertă lipsea.', cite(report, 4))],
          document_ids: [rapidTech.document_id],
        },
      ],
      lessons: [
        cited(
          'La acest cumpărător, certificatul de garanție de 36 de luni e verificat strict. Atașați-l la oferta tehnică.',
          cite(report, 4),
        ),
        cited(
          'Oferta câștigătoare a fost la 86% din valoarea estimată, iar a voastră la 82%. Prețul nu a fost problema.',
          cite(report, 3),
        ),
      ],
    },
  }
  return tender
})()

// ---------------------------------------------------------------------------
// T9  won: competitor files changed, re-analysis running
// ---------------------------------------------------------------------------

const t9 = (() => {
  const id = 'ocds-b3wdp1-MD-1759301000009'
  const spec = doc('t9-spec', 'Техническое задание', {
    language: 'ru',
    page_count: 5,
    published_at: daysAgo(60),
    analyzed_at: daysAgo(60),
  })
  const report = doc('t9-report', 'Отчёт о процедуре закупки', {
    language: 'ru',
    page_count: 4,
    published_at: daysAgo(38),
    analyzed_at: daysAgo(38),
  })
  const ourTech = doc('t9-us-tech', 'Техническое предложение — TehnoServ Grup SRL', {
    language: 'ru',
    participant_id: 'us',
    page_count: 6,
    published_at: daysAgo(41),
    analyzed_at: daysAgo(38),
  })
  const deltaTech = doc('t9-delta-tech', 'Техническое предложение — Delta Office Tech SRL', {
    language: 'ru',
    participant_id: 'delta',
    page_count: 7,
    published_at: daysAgo(41),
    analyzed_at: daysAgo(38),
  })
  const deltaNew = doc('t9-delta-new', 'Дополнительные документы — Delta Office Tech SRL', {
    language: 'ru',
    participant_id: 'delta',
    page_count: 3,
    published_at: hoursAgo(3),
    analysis_status: 'analyzing',
  })

  const tender: MockTender = {
    detail: {
      tender_id: id,
      ocid: id,
      title: 'Поставка тонер-картриджей и обслуживание принтеров',
      description:
        'Поставка 20 тонер-картриджей и ежемесячное обслуживание 25 принтеров в течение 12 месяцев.',
      language: 'ru',
      ...buyer('buyer-bugeac'),
      estimated_value: mdl(120000),
      region: 'UTA Găgăuzia',
      cpv_codes: ['30125100-2', '50313200-4'],
      procedure_type: 'Licitație deschisă',
      mtender_status: 'complete',
      mtender_url: mtenderUrl(id),
      published_at: daysAgo(60),
      modified_at: hoursAgo(3),
      tender_start_at: daysAgo(60),
      deadline: daysAgo(40),
      stage: 'won',
      stage_source: 'auto',
      stage_reason: 'Contractul v-a fost atribuit.',
      summary: [
        cited('20 de cartușe toner și mentenanța lunară a 25 de imprimante timp de 12 luni.', cite(spec, 2)),
        cited('Contractul v-a fost atribuit pentru 98 400 MDL.', cite(report, 3)),
      ],
      tags: ['Consumabile', 'Mentenanță imprimante'],
      documents: [spec, report, ourTech, deltaTech, deltaNew],
      product_matches: [
        {
          tender_item: cited('Тонер-картридж HP 59A или эквивалент — 20 шт.', cite(spec, 2)),
          catalogue_item: candidate(5, 0.95),
          estimated_unit_price: mdl(2300),
        },
        {
          tender_item: cited('Ежемесячное обслуживание принтера — 25 шт. × 12 мес.', cite(spec, 4)),
          catalogue_item: candidate(8, 0.9),
          estimated_unit_price: mdl(200),
        },
      ],
      changes: [],
    },
    questionable_reasons: [],
    analysis: {
      tender_id: id,
      fit_score: 0.93,
      red_flags: redFlags(),
      eligibility: checklist(id, [
        {
          requirement: 'Cifră de afaceri anuală de cel puțin 300 000 MDL',
          requirement_type: 'financial',
          threshold: '300 000 MDL',
          citation: cite(spec, 3),
          met: true,
          notes: 'Profil: 3 200 000 MDL',
        },
        {
          requirement: 'Cartușe originale sau echivalente cu garanție',
          requirement_type: 'technical',
          threshold: null,
          citation: cite(spec, 2),
          met: true,
          notes: null,
        },
        {
          requirement: 'Intervenție în cel mult 48 de ore',
          requirement_type: 'technical',
          threshold: '48 de ore',
          citation: cite(spec, 4),
          met: true,
          notes: null,
        },
        {
          requirement: 'Certificat de înregistrare a întreprinderii',
          requirement_type: 'legal',
          threshold: null,
          citation: cite(spec, 3),
          met: true,
          notes: null,
        },
        {
          requirement: 'Garanție pentru ofertă',
          requirement_type: 'administrative',
          threshold: '1% din valoarea ofertei',
          citation: cite(spec, 5),
          met: true,
          notes: null,
        },
      ]),
      win_chance: winChance(id, 0.48, 2.1, 0.91, 0.16),
    },
    competitors: {
      tender_id: id,
      state: 'analyzing',
      analyzed_at: daysAgo(38),
      participants: [
        {
          participant_id: 'us',
          name: 'TehnoServ Grup SRL',
          idno: '1009600012346',
          is_us: true,
          status: 'winner',
          bid_price: mdl(98400),
          price_vs_estimate: 0.82,
          rejection_reason: null,
          strengths: [cited('Cel mai mic preț dintre ofertele conforme.', cite(report, 2))],
          weaknesses: [],
          document_ids: [ourTech.document_id],
        },
        {
          participant_id: 'delta',
          name: 'Delta Office Tech SRL',
          idno: '1017600039902',
          is_us: false,
          status: 'rejected',
          bid_price: mdl(126500),
          price_vs_estimate: 1.05,
          rejection_reason: cited(
            'Prețul ofertei depășea valoarea estimată a contractului.',
            cite(report, 3),
          ),
          strengths: [cited('Timp de intervenție de 24 de ore.', cite(deltaTech, 4))],
          weaknesses: [cited('Preț cu 5% peste valoarea estimată.', cite(report, 3))],
          document_ids: [deltaTech.document_id, deltaNew.document_id],
        },
      ],
      lessons: [
        cited(
          'Acest cumpărător respinge ofertele peste valoarea estimată. Păstrați prețul sub plafon.',
          cite(report, 3),
        ),
      ],
    },
  }
  return tender
})()

// ---------------------------------------------------------------------------
// T10  new: changed in the last sync, still relevant
// ---------------------------------------------------------------------------

const t10 = (() => {
  const id = 'ocds-b3wdp1-MD-1759301000010'
  const spec = doc('t10-spec', 'Caiet de sarcini', {
    page_count: 8,
    published_at: daysAgo(6),
    analyzed_at: daysAgo(6),
  })
  const notice = doc('t10-notice', 'Anunț de participare', {
    page_count: 3,
    published_at: daysAgo(6),
    analyzed_at: daysAgo(6),
  })
  const amendment = doc('t10-amendment', 'Modificarea nr. 1: prelungirea termenului limită', {
    page_count: 1,
    published_at: minutesAgo(50),
    analyzed_at: LAST_SYNC_AT,
  })

  const tender: MockTender = {
    detail: {
      tender_id: id,
      ocid: id,
      title: 'Achiziționarea calculatoarelor și monitoarelor pentru registratură',
      description: 'Livrarea a 8 calculatoare și 8 monitoare pentru registratura centrului, cu instalare.',
      language: 'ro',
      ...buyer('buyer-aurora'),
      estimated_value: mdl(140000),
      region: 'mun. Chișinău',
      cpv_codes: ['30213000-5'],
      procedure_type: 'Licitație deschisă',
      mtender_status: 'active',
      mtender_url: mtenderUrl(id),
      published_at: daysAgo(6),
      modified_at: minutesAgo(50),
      tender_start_at: daysAgo(6),
      deadline: daysFromNow(16),
      stage: 'new',
      stage_source: 'auto',
      stage_reason: null,
      summary: [
        cited(
          '8 calculatoare cu Intel Core i5 sau echivalent și 8 monitoare de 24", cu instalare.',
          cite(spec, 3),
        ),
        cited('Termenul limită a fost prelungit cu 7 zile prin modificarea nr. 1.', cite(amendment, 1)),
      ],
      tags: ['Calculatoare', 'Monitoare', 'Medicină'],
      documents: [spec, notice, amendment],
      product_matches: [
        {
          tender_item: cited(
            'Calculator, Intel Core i5 sau echivalent, 8 GB RAM, SSD 256 GB — 8 buc.',
            cite(spec, 3),
          ),
          catalogue_item: candidate(2, 0.91),
          estimated_unit_price: mdl(12800),
        },
        {
          tender_item: cited('Monitor 24", cel puțin 1920×1080 — 8 buc.', cite(spec, 3)),
          catalogue_item: candidate(3, 0.9),
          estimated_unit_price: mdl(4400),
        },
      ],
      changes: [
        {
          synced_at: LAST_SYNC_AT,
          changes: ['Termenul limită a fost prelungit cu 7 zile'],
          verdict: 'still_relevant',
          reason: cited(
            'S-a schimbat doar termenul-limită. Cerințele tehnice au rămas aceleași.',
            cite(amendment, 1),
          ),
          stage_before: 'new',
          stage_after: 'new',
        },
      ],
    },
    questionable_reasons: [],
    analysis: {
      tender_id: id,
      fit_score: 0.89,
      red_flags: redFlags(),
      eligibility: checklist(id, [
        {
          requirement: 'Cifră de afaceri anuală de cel puțin 400 000 MDL',
          requirement_type: 'financial',
          threshold: '400 000 MDL',
          citation: cite(notice, 2),
          met: true,
          notes: 'Profil: 3 200 000 MDL',
        },
        {
          requirement: 'Certificat de înregistrare a întreprinderii',
          requirement_type: 'legal',
          threshold: null,
          citation: cite(notice, 2),
          met: true,
          notes: null,
        },
        {
          requirement: 'Garanție pentru echipamente',
          requirement_type: 'technical',
          threshold: '24 de luni',
          citation: cite(spec, 6),
          met: true,
          notes: null,
        },
        {
          requirement: 'Instalare la sediul cumpărătorului',
          requirement_type: 'technical',
          threshold: null,
          citation: cite(spec, 5),
          met: true,
          notes: null,
        },
        {
          requirement: 'Termen de livrare',
          requirement_type: 'technical',
          threshold: '20 de zile',
          citation: cite(spec, 6),
          met: true,
          notes: null,
        },
        {
          requirement: 'Garanție pentru ofertă',
          requirement_type: 'administrative',
          threshold: '1% din valoarea ofertei',
          citation: cite(notice, 3),
          met: true,
          notes: null,
        },
      ]),
      win_chance: winChance(id, 0.38, 3.1, 0.89, 0.12),
    },
    competitors: noCompetitorDocuments(id),
  }
  return tender
})()

export const tenders: MockTender[] = [t1, t2, t3, t4, t5, t6, t7, t8, t9, t10]
