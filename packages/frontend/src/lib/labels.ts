export const CROP_LABELS: Record<string, string> = {
  soja: 'Soja',
  maiz: 'Maíz',
  poroto: 'Poroto',
};

export const STAGE_LABELS: Record<string, string> = {
  siembra: 'Siembra',
  emergencia: 'Emergencia',
  vegetativo: 'Vegetativo',
  floracion: 'Floración',
  llenado: 'Llenado',
  madurez: 'Madurez',
};

export function cropLabel(crop: string): string {
  return CROP_LABELS[crop] ?? crop;
}

export function stageLabel(stage: string): string {
  return STAGE_LABELS[stage] ?? stage;
}
