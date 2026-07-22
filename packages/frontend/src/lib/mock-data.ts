export type Cultivo = "Soja" | "Maíz" | "Poroto";
export type Etapa = "Siembra" | "Emergencia" | "Vegetativo" | "Floración" | "Llenado" | "Madurez";
export type Severidad = 1 | 2 | 3 | 4 | 5;
export type Motor = "nube" | "dispositivo" | "reglas";

export type Alerta = {
  id: string;
  parcelaId: string;
  fecha: string;
  severidad: Severidad;
  titulo: string;
  mensaje: string;
  accion: string;
  motor: Motor;
};

export type Parcela = {
  id: string;
  nombre: string;
  cultivo: Cultivo;
  etapa: Etapa;
  hectareas: number;
  ultimaAlerta?: Alerta;
};

export type DiaPronostico = {
  dia: string;
  max: number;
  min: number;
  lluvia: number; // mm
  icono: "sol" | "nube" | "lluvia" | "tormenta";
};

export const severidadLabel: Record<Severidad, string> = {
  1: "Leve",
  2: "Baja",
  3: "Moderada",
  4: "Alta",
  5: "Crítica",
};

export const severidadColor: Record<Severidad, string> = {
  1: "bg-muted text-muted-foreground border-border",
  2: "bg-primary/15 text-primary border-primary/30",
  3: "bg-warning/15 text-warning border-warning/40",
  4: "bg-warning/25 text-warning border-warning/60",
  5: "bg-danger/20 text-danger border-danger/60",
};

export const alertas: Alerta[] = [
  {
    id: "a1",
    parcelaId: "p1",
    fecha: "Hoy · 06:20",
    severidad: 5,
    titulo: "Riesgo de helada tardía",
    mensaje: "Temperatura mínima proyectada -1°C entre 04:00 y 07:00 de mañana.",
    accion: "Regar al atardecer para proteger floración de soja.",
    motor: "nube",
  },
  {
    id: "a2",
    parcelaId: "p2",
    fecha: "Hoy · 05:10",
    severidad: 3,
    titulo: "Lluvia intensa en 48h",
    mensaje: "Acumulado esperado 55 mm en dos días.",
    accion: "Postergar aplicación de herbicida.",
    motor: "reglas",
  },
  {
    id: "a3",
    parcelaId: "p3",
    fecha: "Ayer · 18:45",
    severidad: 2,
    titulo: "Viento fuerte a la tarde",
    mensaje: "Ráfagas de 45 km/h previstas mañana entre 14:00 y 19:00.",
    accion: "Evitar pulverizaciones en horas de mayor viento.",
    motor: "dispositivo",
  },
  {
    id: "a4",
    parcelaId: "p1",
    fecha: "Ayer · 09:00",
    severidad: 4,
    titulo: "Estrés hídrico creciente",
    mensaje: "Sin lluvias registradas en los últimos 12 días.",
    accion: "Considerar riego suplementario si el cultivo está en floración.",
    motor: "nube",
  },
];

export const parcelas: Parcela[] = [
  {
    id: "p1",
    nombre: "Lote Norte",
    cultivo: "Soja",
    etapa: "Floración",
    hectareas: 42,
    ultimaAlerta: alertas[0],
  },
  {
    id: "p2",
    nombre: "El Bajo",
    cultivo: "Maíz",
    etapa: "Vegetativo",
    hectareas: 28,
    ultimaAlerta: alertas[1],
  },
  {
    id: "p3",
    nombre: "La Loma",
    cultivo: "Poroto",
    etapa: "Emergencia",
    hectareas: 15,
    ultimaAlerta: alertas[2],
  },
];

export const pronostico7d: DiaPronostico[] = [
  { dia: "Hoy", max: 32, min: 18, lluvia: 0, icono: "sol" },
  { dia: "Mié", max: 34, min: 19, lluvia: 0, icono: "sol" },
  { dia: "Jue", max: 30, min: 20, lluvia: 5, icono: "nube" },
  { dia: "Vie", max: 26, min: 18, lluvia: 28, icono: "lluvia" },
  { dia: "Sáb", max: 24, min: 17, lluvia: 42, icono: "tormenta" },
  { dia: "Dom", max: 27, min: 16, lluvia: 8, icono: "nube" },
  { dia: "Lun", max: 29, min: 17, lluvia: 0, icono: "sol" },
];