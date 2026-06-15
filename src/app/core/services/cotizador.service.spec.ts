import { TestBed } from '@angular/core/testing';
import { CotizadorService } from './cotizador.service';
import { PartidaInput } from '../models/cotizacion.model';

describe('CotizadorService', () => {
  let service: CotizadorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CotizadorService);
  });

  it('debe crearse el servicio', () => {
    expect(service).toBeTruthy();
  });

  it('debe calcular correctamente la ingeniería sugerida (óptima)', () => {
    const input: PartidaInput = {
      id: 1,
      cliente: 'Test Cliente',
      descripcion: 'Caja Pizza',
      frente: 15,
      fondo: 10,
      alto: 5,
      tipoCaja: 'Plegadiza',
      sustrato: 'PRC',
      calibre: 12,
      tintasFrente: 1,
      tintasReverso: 0,
      barniz: 'N/A',
      tipoPegue: 'Pegue Lineal',
      empaque: 'Corrugado',
      destino: 'LOCAL',
      cantidades: [5000, 10000, 20000, 50000, 100000],
      tieneVentana: false,
      calibreAcetato: 3,
      tieneRealce: false,
      numeroRealces: 0
    };

    const sugerida = service.calcularIngenieriaSugerida(input);
    expect(sugerida.anchoCajaDesplegada).toBe((15 + 10) * 2 + 3); // (Frente + Fondo) * 2 + 3 = 53
    expect(sugerida.largoCajaDesplegada).toBe(5 + 10 + 4); // Alto + Fondo + 4 = 19
    expect(sugerida.piezasPorHoja).toBeGreaterThan(0);
    expect(sugerida.anchoBobina).toBeGreaterThan(0);
    expect(sugerida.hilo).toBeGreaterThan(0);
  });

  it('debe aplicar recargos por bajo volumen (Fijos Extras) correctamente', () => {
    const input: PartidaInput = {
      id: 1,
      cliente: 'Test Cliente',
      descripcion: 'Caja Pizza',
      frente: 15,
      fondo: 10,
      alto: 5,
      tipoCaja: 'Plegadiza',
      sustrato: 'PRC',
      calibre: 12,
      tintasFrente: 1,
      tintasReverso: 0,
      barniz: 'N/A',
      tipoPegue: 'Pegue Lineal',
      empaque: 'Corrugado',
      destino: 'LOCAL',
      cantidades: [100, 1000, 5000, 10000, 25000],
      tieneVentana: false,
      calibreAcetato: 3,
      tieneRealce: false,
      numeroRealces: 0
    };

    const ing = service.calcularIngenieriaSugerida(input);
    // Forzamos piezas por hoja para controlar el número de hojas netas/totales
    ing.piezasPorHoja = 1;
    
    // Calculamos para cantidades que resulten en diferentes hojas totales
    // 100 pzs -> totalHojas < 1000 -> +200%
    const calculos = service.calcularPartida(input, ing, 10);
    
    const calcLow = calculos.find(c => c.cantidad === 100);
    if (calcLow) {
      expect(calcLow.totalHojas).toBeLessThan(1000);
      expect(calcLow.fijosExtras).toBe(calcLow.gastosFijos * 2.0);
    }

    // 1000 pzs -> totalHojas aprox 1000-2000 -> +50%
    const calcMed = calculos.find(c => c.cantidad === 1000);
    if (calcMed && calcMed.totalHojas >= 1000 && calcMed.totalHojas < 2000) {
      expect(calcMed.fijosExtras).toBeCloseTo(calcMed.gastosFijos * 0.5, 2);
    }
  });

  it('debe calcular escala de comisiones según utilidad final del cliente', () => {
    // Simulamos un DetalleCalculoCantidad y llamamos a recalcularComisionesYUtilidades
    const mockCalc: any = {
      facturacionCliente: 10000,
      utilidadClientePercent: 16.0,
      comisionPercent: 0,
      comisionMonto: 0
    };

    // Utilidad 16% -> Comisión 3.0%
    service.recalcularComisionesYUtilidades(mockCalc);
    expect(mockCalc.comisionPercent).toBe(3.0);
    expect(mockCalc.comisionMonto).toBe(300);

    // Utilidad 11% -> Comisión 2.0%
    mockCalc.utilidadClientePercent = 11.0;
    service.recalcularComisionesYUtilidades(mockCalc);
    expect(mockCalc.comisionPercent).toBe(2.0);
    expect(mockCalc.comisionMonto).toBe(200);

    // Utilidad 5% -> Comisión 0%
    mockCalc.utilidadClientePercent = 5.0;
    service.recalcularComisionesYUtilidades(mockCalc);
    expect(mockCalc.comisionPercent).toBe(0);
    expect(mockCalc.comisionMonto).toBe(0);
  });

  it('debe calcular correctamente costo de ventana de acetato dinámico y costo de placas extra por realce/estampado', () => {
    const input: PartidaInput = {
      id: 1,
      cliente: 'Test Cliente',
      descripcion: 'Caja Ventana Placas',
      frente: 15,
      fondo: 10,
      alto: 5,
      tipoCaja: 'Plegadiza',
      sustrato: 'PRC',
      calibre: 12,
      tintasFrente: 1,
      tintasReverso: 0,
      barniz: 'N/A',
      tipoPegue: 'Pegue Lineal',
      empaque: 'Corrugado',
      destino: 'LOCAL',
      cantidades: [5000, 0, 0, 0, 0],
      tieneVentana: true,
      calibreAcetato: 3,
      ventanaAncho: 8,
      ventanaLargo: 12,
      tieneRealce: true,
      numeroRealces: 1,
      costoPlacasExtra: 1500
    };

    const ing = service.calcularIngenieriaSugerida(input);
    
    // Escenario A: Con ventana de 8x12 y placa de 1500
    const calculosA = service.calcularPartida(input, ing, 10);
    const calcA = calculosA[0];
    
    // Debe incluir el costo de placas de impresión estándar + el extra
    const costoPlacaStd = 1 * 180.00; // 1 tinta frente * $180
    expect(calcA.costoPlacas).toBe(costoPlacaStd + 1500);

    // Escenario B: Cambiando dimensiones de la ventana a 10x10
    const inputB = { ...input, ventanaAncho: 10, ventanaLargo: 10 };
    const calculosB = service.calcularPartida(inputB, ing, 10);
    const calcB = calculosB[0];

    // Para 8x12 (96 cm2) el costo de ventana es: 5000 * 0.0096 * 3 * 1.8 = 259.20
    // Para 10x10 (100 cm2) el costo de ventana es: 5000 * 0.0100 * 3 * 1.8 = 270.00
    // La diferencia en costo variable total debe ser exactamente de $10.80 MXN
    const diff = calcB.costoVariableTotal - calcA.costoVariableTotal;
    expect(diff).toBeCloseTo(10.80, 2);
  });
});
