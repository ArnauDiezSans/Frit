export const CASANDRA_STORAGE_KEY = 'protocolo-casandra:v1';

export interface CasandraState {
  totalMs: number;
  remainingMs: number;
  running: boolean;
  lastStartedAt: number | null;
  integrity: number;
  resonance: number;
  shownEvents: number[];
  muted: boolean;
  volume: number;
}

export const DEFAULT_CASANDRA_STATE: CasandraState = {
  totalMs: 90 * 60 * 1000,
  remainingMs: 90 * 60 * 1000,
  running: false,
  lastStartedAt: null,
  integrity: 0,
  resonance: 0,
  shownEvents: [],
  muted: false,
  volume: 0.55
};

export const SALVATIERRA_MESSAGES = [
  'Argos, han entrado en el perímetro de cuarentena. Identifíquense y transmitan un informe preliminar.',
  'Queda prohibida toda aproximación. Entreguen acceso completo a MNEMÓSINE.',
  'Hemos recibido parte de la transmisión de Varga. Entreguen la IA y todos sus registros.',
  'Las defensas han fijado la Argos como objetivo. Demuestren que la contaminación ha sido contenida.',
  'Último aviso. Ríndanse, aíslen la nave o procedan a su destrucción.',
  'La cuarentena ha sido vulnerada. Las defensas terrestres abren fuego.'
] as const;
