// All buyers and companies in the mock data are fictional.
import type { BuyerProfile } from '@/api/types'
import { mdl } from './helpers'

export const buyers: BuyerProfile[] = [
  {
    buyer_id: 'buyer-orizont',
    name: 'IP Liceul Teoretic «Orizont Nou»',
    total_tenders: 46,
    single_bidder_rate: 0.17,
    repeat_winner_concentration: 0.13,
    top_winners: [
      {
        name: 'Nexus Birotică SRL',
        idno: '1012600044518',
        contracts_won: 6,
        total_value: mdl(1240000),
        share: 0.13,
      },
      {
        name: 'Rapid Byte SRL',
        idno: '1015600027731',
        contracts_won: 4,
        total_value: mdl(610000),
        share: 0.09,
      },
      {
        name: 'TehnoServ Grup SRL',
        idno: '1009600012346',
        contracts_won: 3,
        total_value: mdl(455000),
        share: 0.07,
      },
    ],
  },
  {
    buyer_id: 'buyer-bugeac',
    name: 'МУ «Центр социальных услуг Буджак»',
    total_tenders: 31,
    single_bidder_rate: 0.23,
    repeat_winner_concentration: 0.16,
    top_winners: [
      {
        name: 'TehnoServ Grup SRL',
        idno: '1009600012346',
        contracts_won: 5,
        total_value: mdl(410000),
        share: 0.16,
      },
      {
        name: 'Delta Office Tech SRL',
        idno: '1017600039902',
        contracts_won: 4,
        total_value: mdl(520000),
        share: 0.13,
      },
      {
        name: 'InfoPlus Service SRL',
        idno: '1011600051270',
        contracts_won: 3,
        total_value: mdl(230000),
        share: 0.1,
      },
    ],
  },
  {
    buyer_id: 'buyer-ard-nord',
    name: 'Agenția Regională pentru Digitalizare Nord',
    total_tenders: 58,
    single_bidder_rate: 0.12,
    repeat_winner_concentration: 0.12,
    top_winners: [
      {
        name: 'InfoPlus Service SRL',
        idno: '1011600051270',
        contracts_won: 7,
        total_value: mdl(2900000),
        share: 0.12,
      },
      {
        name: 'Nexus Birotică SRL',
        idno: '1012600044518',
        contracts_won: 5,
        total_value: mdl(1800000),
        share: 0.09,
      },
      {
        name: 'Delta Office Tech SRL',
        idno: '1017600039902',
        contracts_won: 4,
        total_value: mdl(1100000),
        share: 0.07,
      },
    ],
  },
  {
    buyer_id: 'buyer-aurora',
    name: 'IMSP Centrul de Diagnostic «Aurora Medica»',
    total_tenders: 73,
    single_bidder_rate: 0.21,
    repeat_winner_concentration: 0.12,
    top_winners: [
      {
        name: 'Delta Office Tech SRL',
        idno: '1017600039902',
        contracts_won: 9,
        total_value: mdl(3400000),
        share: 0.12,
      },
      {
        name: 'Rapid Byte SRL',
        idno: '1015600027731',
        contracts_won: 6,
        total_value: mdl(1750000),
        share: 0.08,
      },
      {
        name: 'Nexus Birotică SRL',
        idno: '1012600044518',
        contracts_won: 4,
        total_value: mdl(980000),
        share: 0.05,
      },
    ],
  },
  {
    buyer_id: 'buyer-valea-stelelor',
    name: 'ÎM «Gospodăria Comunală Valea Stelelor»',
    total_tenders: 39,
    single_bidder_rate: 0.64,
    repeat_winner_concentration: 0.56,
    top_winners: [
      {
        name: 'Alfa Sistem Distribuție SRL',
        idno: '1014600063385',
        contracts_won: 22,
        total_value: mdl(6900000),
        share: 0.56,
      },
      {
        name: 'Rapid Byte SRL',
        idno: '1015600027731',
        contracts_won: 3,
        total_value: mdl(410000),
        share: 0.08,
      },
      {
        name: 'InfoPlus Service SRL',
        idno: '1011600051270',
        contracts_won: 2,
        total_value: mdl(260000),
        share: 0.05,
      },
    ],
  },
]
