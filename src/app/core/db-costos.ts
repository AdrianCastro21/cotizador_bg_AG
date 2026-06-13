export interface CartonConfig {
  proveedor: string;
  tipo: string;
  calibre: number;
  gramaje: number;
  precioBaseUSD?: number;
  precioBaseMXN?: number;
  costoM2: number;
}

export interface FlautaConfig {
  proveedor: string;
  material: string;
  tipo: string;
  calidad: string;
  gramaje: number;
  costoKg: number;
  costoM2: number;
  costoFinalM2: number;
}

export interface FleteConfig {
  destino: string;
  costoCamionChico: number; // CS
  costoCamionGrande: number; // DE
  capacidadChico: number; // en tarimas
  capacidadGrande: number; // en tarimas
}

export interface ProcesoCostos {
  impresion: {
    preparacionFija: number; // BB9
    costoPlacaUnitario: number; // R9 en '$'
    costoTiroMillar: number;
  };
  suajado: {
    preparacionFija: number; // BB17
    costoSuajeFijo: number; // BB19
    costoTiroMillar: number;
  };
  pegado: {
    preparacionFija: number;
    costoTiroMillar: { [key: string]: number };
  };
  empaque: {
    costoCajaEmbalaje: number;
    costoTarimaMadera: number;
  };
}

export const TIPO_CAMBIO = 18.00;

export const DB_CARTONES: CartonConfig[] = [
  // CMPC - Importados (Precios base en USD/Ton convertidos a MXN)
  { proveedor: 'CMPC', tipo: 'R.C.', calibre: 11, gramaje: 180, precioBaseUSD: 1310.00, costoM2: 4.3069 },
  { proveedor: 'CMPC', tipo: 'R.C.', calibre: 12.4, gramaje: 200, precioBaseUSD: 1295.00, costoM2: 4.7245 },
  { proveedor: 'CMPC', tipo: 'R.C.', calibre: 14.4, gramaje: 225, precioBaseUSD: 1280.00, costoM2: 5.2465 },
  { proveedor: 'CMPC', tipo: 'R.C.', calibre: 15.7, gramaje: 225, precioBaseUSD: 1230.00, costoM2: 5.0440 },
  { proveedor: 'CMPC', tipo: 'R.C.', calibre: 17.7, gramaje: 250, precioBaseUSD: 1200.00, costoM2: 5.4625 },
  { proveedor: 'CMPC', tipo: 'R.C.', calibre: 20.1, gramaje: 275, precioBaseUSD: 1200.00, costoM2: 6.0025 },
  { proveedor: 'CMPC', tipo: 'R.C.', calibre: 22, gramaje: 300, precioBaseUSD: 1200.00, costoM2: 6.5425 },
  
  // Ponderosa - Nacionales (Precios en MXN)
  { proveedor: 'PONDEROSA', tipo: 'PRC', calibre: 12, gramaje: 240, precioBaseMXN: 22.8817, costoM2: 5.6387 },
  { proveedor: 'PONDEROSA', tipo: 'PRC', calibre: 14, gramaje: 280, precioBaseMXN: 20.6179, costoM2: 5.9447 },
  { proveedor: 'PONDEROSA', tipo: 'PRC', calibre: 16, gramaje: 320, precioBaseMXN: 19.3731, costoM2: 6.3956 },
  { proveedor: 'PONDEROSA', tipo: 'PRC', calibre: 18, gramaje: 320, precioBaseMXN: 20.7825, costoM2: 6.8466 },
  { proveedor: 'PONDEROSA', tipo: 'PRC', calibre: 20, gramaje: 355, precioBaseMXN: 20.4868, costoM2: 7.4904 },
  { proveedor: 'PONDEROSA', tipo: 'PRC', calibre: 22, gramaje: 390, precioBaseMXN: 20.5338, costoM2: 8.2473 },
  { proveedor: 'PONDEROSA', tipo: 'PRC', calibre: 24, gramaje: 425, precioBaseMXN: 20.2348, costoM2: 8.8603 },

  { proveedor: 'PONDEROSA', tipo: 'R.B.', calibre: 14, gramaje: 260, precioBaseMXN: 23.5760, costoM2: 6.2891 },
  { proveedor: 'PONDEROSA', tipo: 'R.B.', calibre: 16, gramaje: 290, precioBaseMXN: 22.5000, costoM2: 6.7028 },
  { proveedor: 'PONDEROSA', tipo: 'R.B.', calibre: 18, gramaje: 330, precioBaseMXN: 21.1170, costoM2: 7.1709 },
  { proveedor: 'PONDEROSA', tipo: 'R.B.', calibre: 20, gramaje: 370, precioBaseMXN: 20.1390, costoM2: 7.6782 },
  { proveedor: 'PONDEROSA', tipo: 'R.B.', calibre: 22, gramaje: 400, precioBaseMXN: 20.0170, costoM2: 8.2520 },
  { proveedor: 'PONDEROSA', tipo: 'R.B.', calibre: 24, gramaje: 430, precioBaseMXN: 19.8540, costoM2: 8.8008 }
];

export const DB_FLAUTAS: FlautaConfig[] = [
  { proveedor: 'PRONAL', material: 'LINNER', tipo: 'LISO', calidad: 'KRAFT', gramaje: 110, costoKg: 11.00, costoM2: 1.2100, costoFinalM2: 1.2100 },
  { proveedor: 'PRONAL', material: 'MEDIUM', tipo: 'CORRUGADO', calidad: 'KRAFT', gramaje: 110, costoKg: 11.00, costoM2: 1.2100, costoFinalM2: 1.6335 },
  { proveedor: 'BIOPAPEL', material: 'LINNER', tipo: 'LISO', calidad: 'KRAFT', gramaje: 127, costoKg: 12.80, costoM2: 1.6256, costoFinalM2: 1.6256 },
  { proveedor: 'BIOPAPEL', material: 'MEDIUM', tipo: 'CORRUGADO', calidad: 'KRAFT', gramaje: 127, costoKg: 12.80, costoM2: 1.6256, costoFinalM2: 2.1946 },
  { proveedor: 'BIOPAPEL', material: 'LINNER', tipo: 'LISO', calidad: 'KRAFT', gramaje: 140, costoKg: 13.00, costoM2: 1.8200, costoFinalM2: 1.8200 },
  { proveedor: 'PAPELSA', material: 'LINNER', tipo: 'BOND', calidad: 'BOND', gramaje: 90, costoKg: 23.10, costoM2: 2.0790, costoFinalM2: 2.0790 },
  { proveedor: 'DIMSA', material: 'LINNER', tipo: 'FOIL/LINNER', calidad: 'FOIL', gramaje: 190, costoKg: 33.26, costoM2: 6.3194, costoFinalM2: 6.3194 }
];

export const DB_FLETES: FleteConfig[] = [
  { destino: 'LAB PLANTA', costoCamionChico: 0, costoCamionGrande: 0, capacidadChico: 14, capacidadGrande: 28 },
  { destino: 'LOCAL', costoCamionChico: 3500.00, costoCamionGrande: 5000.00, capacidadChico: 14, capacidadGrande: 28 },
  { destino: 'CELAYA', costoCamionChico: 10000.00, costoCamionGrande: 12000.00, capacidadChico: 14, capacidadGrande: 28 },
  { destino: 'MONTERREY', costoCamionChico: 16500.00, costoCamionGrande: 21000.00, capacidadChico: 14, capacidadGrande: 28 },
  { destino: 'CDMX', costoCamionChico: 18000.00, costoCamionGrande: 22000.00, capacidadChico: 14, capacidadGrande: 28 },
  { destino: 'SANTA ROSA', costoCamionChico: 9000.00, costoCamionGrande: 13000.00, capacidadChico: 14, capacidadGrande: 28 },
  { destino: 'SAN JOSE ITURBIDE', costoCamionChico: 15000.00, costoCamionGrande: 16000.00, capacidadChico: 14, capacidadGrande: 28 },
  { destino: 'PUEBLA', costoCamionChico: 18000.00, costoCamionGrande: 21000.00, capacidadChico: 14, capacidadGrande: 28 },
  { destino: 'QUERETARO', costoCamionChico: 14000.00, costoCamionGrande: 15000.00, capacidadChico: 14, capacidadGrande: 28 },
  { destino: 'GUADALAJARA', costoCamionChico: 9500.00, costoCamionGrande: 11500.00, capacidadChico: 14, capacidadGrande: 28 },
  { destino: 'TOLUCA', costoCamionChico: 11000.00, costoCamionGrande: 13500.00, capacidadChico: 14, capacidadGrande: 28 },
  { destino: 'VERACRUZ', costoCamionChico: 22000.00, costoCamionGrande: 26000.00, capacidadChico: 14, capacidadGrande: 28 },
  { destino: 'MORELIA', costoCamionChico: 10500.00, costoCamionGrande: 13000.00, capacidadChico: 14, capacidadGrande: 28 }
];

export const COSTOS_PROCESOS: ProcesoCostos = {
  impresion: {
    preparacionFija: 450.00, // Costo base preparación
    costoPlacaUnitario: 180.00, // Aprox. $10 USD x 18 TC
    costoTiroMillar: 35.00
  },
  suajado: {
    preparacionFija: 300.00,
    costoSuajeFijo: 1500.00,
    costoTiroMillar: 25.00
  },
  pegado: {
    preparacionFija: 250.00,
    costoTiroMillar: {
      'Pegue Lineal': 12.00,
      'Lineal Jabon': 15.00,
      'F. Aut. CH': 22.00,
      'F. Aut. GDE': 28.00,
      'F. Aut. EXG': 35.00,
      'F. Semiautomático': 40.00,
      'Hexagonal': 45.00,
      'Doble Pared': 30.00,
      '4 esquinas': 50.00,
      '6 esquinas': 65.00,
      'Tarjeta': 8.00,
      'No lleva': 0.00
    }
  },
  empaque: {
    costoCajaEmbalaje: 15.00, // costo promedio de caja corrugada secundaria
    costoTarimaMadera: 150.00
  }
};
