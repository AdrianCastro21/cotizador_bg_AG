export interface PartidaInput {
  id: number;
  cliente: string;
  descripcion: string;
  frente: number;      // cm
  fondo: number;       // cm
  alto: number;        // cm
  tipoCaja: string;
  sustrato: string;
  calibre: number;
  tintasFrente: number;
  tintasReverso: number;
  barniz: string;
  tipoPegue: string;
  empaque: string;
  destino: string;
  cantidades: number[]; // Exactamente 5 cantidades
  tieneVentana: boolean;
  calibreAcetato: number;
  tieneRealce: boolean;
  numeroRealces: number;
}

export interface PartidaIngenieria {
  anchoBobina: number;
  hilo: number;
  piezasPorHoja: number;
  anchoCajaDesplegada: number;
  largoCajaDesplegada: number;
  corte: number;
  doblez: number;
  anchoCajaPlegada: number;
  altoCajaPlegada: number;
  embalajeNiveles: number;
  embalajeColumnas: number;
  fondoEmbalaje: number;
  opcion120Ok: boolean;
  opcion100Ok: boolean;
  proveedor: 'CMPC' | 'PONDEROSA';
  bgCompraCarton: boolean;
  mermaHojeado: number;
}

export interface DetalleCalculoCantidad {
  cantidad: number;
  hojasRequeridas: number;
  hojasHojeado: number;
  hojasProceso: number;
  totalHojas: number;
  pesoCartonKg: number;
  costoCarton: number;
  costoFlauta: number;
  costoImpresionFijo: number;
  costoPlacas: number;
  costoBarniz: number;
  costoSuajeFijo: number;
  costoSuajadoTiro: number;
  costoPegadoFijo: number;
  costoPegadoTiro: number;
  costoCajaEmbalaje: number;
  costoTarima: number;
  costoFlete: number;
  costoVariableTotal: number;
  gastosFijos: number;
  fijosExtras: number;
  costoTotal: number;
  precioBaseUnitario: number;
  precioBaseMillar: number;
  precioBG: number;       // Definido por gerente
  precioCliente: number;  // Definido por gerente
  facturacionBG: number;
  facturacionCliente: number;
  utilidadBG: number;
  utilidadCliente: number;
  utilidadBGPercent: number;
  utilidadClientePercent: number;
  comisionPercent: number;
  comisionMonto: number;
}

export interface PartidaCotizacion {
  input: PartidaInput;
  ingenieria: PartidaIngenieria;
  calculos: DetalleCalculoCantidad[];
}

export interface CotizacionProyecto {
  id: string;
  nombreProyecto: string;
  fechaCreacion: Date;
  partidas: PartidaCotizacion[];
  margenUtilidadGlobal: number; // Porcentaje global por defecto
}
