// All companies, people and IDNOs in the mock data are fictional.
import type { CatalogueItem, CompanyLookup, Pricelist, ProfileOut } from '@/api/types'
import { daysAgo, mdl } from './helpers'

export const profile: ProfileOut = {
  id: 1,
  created_at: daysAgo(20),
  idno: '1009600012346',
  name: 'TehnoServ Grup SRL',
  description:
    'Distribuitor de echipamente IT și de birou: calculatoare, laptopuri, monitoare, imprimante, ' +
    'consumabile și echipamente de rețea. Oferim instalare, configurare și mentenanță în toată ' +
    'Republica Moldova. Putem aduce la comandă și alte modele decât cele din lista de prețuri.',
  cpv_codes: ['30213000-5', '30213100-6', '30232110-8', '30125100-2', '32420000-3', '50312000-5'],
  regions: ['mun. Chișinău', 'mun. Bălți', 'r. Ungheni', 'UTA Găgăuzia'],
  budget_min: 50000,
  budget_max: 2000000,
  annual_turnover: mdl(3200000),
  employee_count: 18,
  licenses: [],
  certifications: ['ISO 9001:2015'],
}

export const companyLookups: CompanyLookup[] = [
  {
    idno: profile.idno!,
    name: profile.name,
    legal_form: 'Societate cu răspundere limitată',
    address: 'mun. Chișinău, sect. Botanica',
    region: 'mun. Chișinău',
    registered_at: '2009-03-17',
    activities: [
      '46.51 Comerț cu ridicata al calculatoarelor, echipamentelor periferice și software-ului',
      '95.11 Repararea calculatoarelor și a echipamentelor periferice',
    ],
    source: 'data2b.md',
  },
]

export const pricelists: Pricelist[] = [
  {
    id: 1,
    file_name: 'Lista_preturi_IT_2026.xlsx',
    uploaded_at: daysAgo(6),
    status: 'ready',
    item_count: 6,
  },
  {
    id: 2,
    file_name: 'Tarife_servicii_2026.pdf',
    uploaded_at: daysAgo(6),
    status: 'ready',
    item_count: 2,
  },
]

export const catalogue: CatalogueItem[] = [
  {
    id: 1,
    pricelist_id: 1,
    name: 'Laptop Lenovo ThinkPad E14 Gen 5',
    description: 'Intel Core i5-1335U, 16 GB RAM, SSD 512 GB, ecran 14" FHD, Windows 11 Pro',
    price: mdl(17900),
  },
  {
    id: 2,
    pricelist_id: 1,
    name: 'Calculator HP Pro Tower 290 G9',
    description: 'Intel Core i5-13400, 8 GB RAM, SSD 256 GB, Windows 11 Pro',
    price: mdl(12400),
  },
  {
    id: 3,
    pricelist_id: 1,
    name: 'Monitor Dell P2423',
    description: '24", 1920×1200, IPS, HDMI și DisplayPort',
    price: mdl(4300),
  },
  {
    id: 4,
    pricelist_id: 1,
    name: 'Imprimantă multifuncțională HP LaserJet Pro MFP M428fdw',
    description: 'Laser monocrom, A4, 38 pagini/minut, duplex, Wi-Fi',
    price: mdl(8600),
  },
  {
    id: 5,
    pricelist_id: 1,
    name: 'Cartuș toner HP 59A (CF259A)',
    description: 'Original, aproximativ 3 000 de pagini',
    price: mdl(2100),
  },
  {
    id: 6,
    pricelist_id: 1,
    name: 'Switch Cisco CBS250-24T-4G',
    description: '24 de porturi Gigabit, 4 SFP, administrabil',
    price: mdl(6900),
  },
  {
    id: 7,
    pricelist_id: 2,
    name: 'Instalare și configurare stație de lucru',
    description: 'Montare, instalarea sistemului de operare și a programelor, conectare la rețea',
    price: mdl(450),
  },
  {
    id: 8,
    pricelist_id: 2,
    name: 'Mentenanță imprimantă (lunar, per dispozitiv)',
    description: 'Curățare, verificare, înlocuirea consumabilelor la cerere',
    price: mdl(180),
  },
]
