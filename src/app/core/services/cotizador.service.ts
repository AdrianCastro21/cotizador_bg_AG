import { Injectable } from '@angular/core';
import { DB_CARTONES, DB_FLAUTAS, DB_FLETES, COSTOS_PROCESOS } from '../db-costos';
import { PartidaInput, PartidaIngenieria, DetalleCalculoCantidad, PartidaCotizacion, CotizacionProyecto } from '../models/cotizacion.model';

@Injectable({
  providedIn: 'root'
})
export class CotizadorService {

  constructor() { }

  /**
   * Genera los parámetros de ingeniería sugeridos (óptimos) para una partida de cotización
   */
  calcularIngenieriaSugerida(input: PartidaInput): PartidaIngenieria {
    // Estimación geométrica básica de caja desplegada
    // Plegadiza estándar: 
    // Ancho desplegado = (Frente + Fondo) * 2 + pestaña de pegado (aprox 3cm)
    // Largo desplegado = Alto + Fondo + pestañas superiores/inferiores (aprox 4cm)
    let anchoDesplegada = 0;
    let largoDesplegada = 0;
    let anchoPlegada = 0;
    let altoPlegada = 0;

    if (input.tipoCaja === 'Plegadiza') {
      anchoDesplegada = (input.frente + input.fondo) * 2 + 3;
      largoDesplegada = input.alto + input.fondo + 4;
      anchoPlegada = input.frente + input.fondo + 1.5;
      altoPlegada = input.alto;
    } else if (input.tipoCaja === 'Tarjeta') {
      anchoDesplegada = input.frente;
      largoDesplegada = input.alto;
      anchoPlegada = input.frente;
      altoPlegada = input.alto;
    } else {
      // Por defecto para microcorrugados
      anchoDesplegada = (input.frente + input.fondo) * 2 + 4;
      largoDesplegada = input.alto + input.fondo + 5;
      anchoPlegada = input.frente + input.fondo + 2;
      altoPlegada = input.alto;
    }

    // Piezas por hoja de impresión sugeridas (aprovechamiento)
    // Asumiendo una hoja estándar de 70x100 cm (aprox)
    const anchoHojaStd = 70.0;
    const largoHojaStd = 100.0;
    const piezasAncho = Math.floor(anchoHojaStd / (anchoDesplegada || 1)) || 1;
    const piezasLargo = Math.floor(largoHojaStd / (largoDesplegada || 1)) || 1;
    const piezasPorHoja = Math.max(1, piezasAncho * piezasLargo);

    // Ancho de bobina e hilo sugeridos
    const anchoBobina = Math.ceil(anchoDesplegada * piezasAncho + 2); // 2cm de refile
    const hilo = Math.ceil(largoDesplegada * piezasLargo + 2);

    // Embalaje sugerido
    const embalajeNiveles = 4;
    const embalajeColumnas = 5;
    const fondoEmbalaje = 20;

    // Buscar proveedor y datos del cartón
    const carton = DB_CARTONES.find(c => c.tipo === input.sustrato && c.calibre === input.calibre);
    const proveedor = carton ? (carton.proveedor as 'CMPC' | 'PONDEROSA') : 'PONDEROSA';

    return {
      anchoBobina,
      hilo,
      piezasPorHoja,
      anchoCajaDesplegada: anchoDesplegada,
      largoCajaDesplegada: largoDesplegada,
      corte: 1, // Por defecto 1 corte
      doblez: 1,
      anchoCajaPlegada: anchoPlegada,
      altoCajaPlegada: altoPlegada,
      embalajeNiveles,
      embalajeColumnas,
      fondoEmbalaje,
      opcion120Ok: true,
      opcion100Ok: false,
      proveedor,
      bgCompraCarton: true,
      mermaHojeado: 0.003 // 0.3%
    };
  }

  /**
   * Ejecuta el costeo y genera el cálculo de las 5 cantidades en paralelo
   */
  calcularPartida(input: PartidaInput, ing: PartidaIngenieria, margenUtilidadGlobal: number): DetalleCalculoCantidad[] {
    const calculos: DetalleCalculoCantidad[] = [];
    const carton = DB_CARTONES.find(c => c.tipo === input.sustrato && c.calibre === input.calibre);
    const costoM2Carton = carton ? carton.costoM2 : 0;
    const gramajeCarton = carton ? carton.gramaje : 0;

    // Buscar costo de flauta si aplica
    const flauta = DB_FLAUTAS.find(f => f.tipo === input.tipoCaja);
    const costoM2Flauta = flauta ? flauta.costoFinalM2 : 0;

    // Buscar flete por destino
    const flete = DB_FLETES.find(f => f.destino === input.destino) || DB_FLETES[0];

    // Iterar sobre las 5 cantidades
    input.cantidades.forEach((qty: number) => {
      if (qty <= 0) return;

      // 1. Hojas requeridas
      const hojasRequeridas = Math.ceil(qty / ing.piezasPorHoja);

      // 2. Mermas de proceso
      // Formula del Excel: =(IF(BA4>0,((($G$13*50)+(BA4*0.025))/BA4),0)*$Q$13)+(IF($AI3="Tarjeta",BA4*0.01/BA4,0))
      // G13 es cantidad de tintas frente, Q13 es entradas a impresión (usualmente 1)
      const tieneImpresion = input.tintasFrente > 0 || input.tintasReverso > 0;
      const factorImpresion = tieneImpresion ? 1 : 0;
      const factorEntradas = 1; // Equivale a Q13 en Excel

      let pctMermaProceso = 0;
      if (hojasRequeridas > 0) {
        const mermaFija = input.tintasFrente * 50;
        const mermaVariable = hojasRequeridas * 0.025;
        pctMermaProceso = ((mermaFija + mermaVariable) / hojasRequeridas) * factorEntradas * factorImpresion;
      }
      if (input.tipoCaja === 'Tarjeta') {
        pctMermaProceso += 0.01;
      }

      const hojasProceso = Math.ceil(hojasRequeridas * pctMermaProceso);
      const hojasHojeado = Math.ceil(hojasRequeridas * ing.mermaHojeado);
      const totalHojas = hojasRequeridas + hojasHojeado + hojasProceso;

      // 3. Peso de cartón (Kg)
      const pesoCartonKg = totalHojas * (ing.anchoBobina / 100) * (ing.hilo / 100) * (gramajeCarton / 1000);

      // 4. Costo de Cartón
      const costoCarton = totalHojas * (ing.anchoBobina / 100) * (ing.hilo / 100) * costoM2Carton;

      // 5. Costo de Flauta (si aplica)
      const costoFlauta = input.tipoCaja.toLowerCase().includes('micro') ? 
        totalHojas * (ing.anchoBobina / 100) * (ing.hilo / 100) * costoM2Flauta : 0;

      // 6. Costo de Impresión y Placas
      // Fijo
      const costoImpresionFijo = tieneImpresion ? COSTOS_PROCESOS.impresion.preparacionFija : 0;
      const totalTintas = input.tintasFrente + input.tintasReverso;
      const costoPlacas = tieneImpresion ? (totalTintas * COSTOS_PROCESOS.impresion.costoPlacaUnitario) : 0;
      // Variable (Barniz y Tintas)
      const areaImpresionM2 = totalHojas * (ing.anchoBobina / 100) * (ing.hilo / 100);
      const costoTiroImpresion = totalHojas * (COSTOS_PROCESOS.impresion.costoTiroMillar / 1000);
      
      let costoBarniz = 0;
      if (input.barniz && input.barniz !== 'Ninguno') {
        // En un caso real, el costo de barniz por M2 se busca en base de datos.
        // Asignamos una tarifa de $1.50 MXN/m² para barnices estándar, y $3.50 MXN/m² para UV
        const tarifaBarniz = input.barniz.toLowerCase().includes('uv') ? 3.50 : 1.50;
        costoBarniz = areaImpresionM2 * tarifaBarniz;
      }

      // 7. Costo de Suajado (Troquelado)
      const costoSuajeFijo = COSTOS_PROCESOS.suajado.costoSuajeFijo; // Costo físico del molde
      const costoSuajadoTiro = totalHojas * (COSTOS_PROCESOS.suajado.costoTiroMillar / 1000) + COSTOS_PROCESOS.suajado.preparacionFija;

      // 8. Costo de Pegado
      const costoPegadoFijo = COSTOS_PROCESOS.pegado.preparacionFija;
      const tarifaPegadoUnitario = COSTOS_PROCESOS.pegado.costoTiroMillar[input.tipoPegue] || 0;
      const costoPegadoTiro = qty * (tarifaPegadoUnitario / 1000);

      // 9. Costo de Ventana (Acetato)
      let costoVentana = 0;
      if (input.tieneVentana) {
        // El costo de ventana se calcula en base al área de acetato (estimamos 10x10 cm por caja)
        const areaAcetatoM2 = qty * 0.01; // 100 cm2 por pieza
        const costoAcetatoM2 = input.calibreAcetato * 1.80; // Tarifa basada en el calibre
        costoVentana = areaAcetatoM2 * costoAcetatoM2;
      }

      // 10. Embalaje y Tarimas
      // Cantidad de cajas de embalaje necesarias
      // En el excel, el embalaje contiene N niveles y C columnas
      const piezasPorCajaEmbalaje = ing.embalajeNiveles * ing.embalajeColumnas * 10; // Ejemplo: 10 cajas por columna/nivel
      const cajasEmbalajeRequeridas = Math.ceil(qty / (piezasPorCajaEmbalaje || 1));
      const costoCajaEmbalaje = cajasEmbalajeRequeridas * COSTOS_PROCESOS.empaque.costoCajaEmbalaje;

      // Tarimas requeridas
      // Altura de caja embalaje estimada: altoCajaPlegada * niveles
      const altoCajaEmbalaje = (ing.altoCajaPlegada * ing.embalajeNiveles) || 20;
      const camasPorTarima = Math.max(1, Math.floor(160 / (altoCajaEmbalaje || 1)));
      const piezasPorTarima = (piezasPorCajaEmbalaje * 6 * camasPorTarima) || 1000; // 6 cajas por cama
      const tarimasRequeridas = Math.ceil(qty / piezasPorTarima);
      const costoTarima = tarimasRequeridas * COSTOS_PROCESOS.empaque.costoTarimaMadera;

      // 11. Fletes (Logística de entrega)
      // Capacidad de camiones
      const costoFletePorTarima = flete.costoCamionGrande / flete.capacidadGrande; // Costo por tarima
      const costoFlete = tarimasRequeridas * costoFletePorTarima;

      // 12. Consolidación de Costo Variable y Fijo
      const costoVariableTotal = costoCarton + costoFlauta + costoTiroImpresion + costoBarniz + costoSuajadoTiro + costoPegadoTiro + costoVentana + costoCajaEmbalaje + costoTarima + costoFlete;
      
      const gastosFijos = costoImpresionFijo + costoPlacas + costoSuajeFijo + costoPegadoFijo;

      // 13. Fijos Extras (Ajuste por bajo volumen)
      let pctFijosExtras = 0;
      if (totalHojas < 1000) {
        pctFijosExtras = 2.0; // +200%
      } else if (totalHojas < 2000) {
        pctFijosExtras = 0.5; // +50%
      } else if (totalHojas < 4000) {
        pctFijosExtras = 0.3; // +30%
      } else if (totalHojas < 6000) {
        pctFijosExtras = 0.1; // +10%
      }
      const fijosExtras = gastosFijos * pctFijosExtras;

      const costoTotal = costoVariableTotal + gastosFijos + fijosExtras;

      // 14. Precio Base (Márgenes)
      // Usando el margen global del proyecto
      const divisorMargen = 1 - (margenUtilidadGlobal / 100);
      const precioBaseUnitario = (costoTotal / qty) / (divisorMargen || 1);
      const precioBaseMillar = precioBaseUnitario * 1000;

      // Inicializar precios con el precio base sugerido
      const precioBG = precioBaseMillar;
      const precioCliente = precioBaseMillar;

      const facturacionBG = (precioBG * qty) / 1000;
      const facturacionCliente = (precioCliente * qty) / 1000;

      const utilidadBG = facturacionBG - costoTotal;
      const utilidadCliente = facturacionCliente - costoTotal;

      const index = calculos.length;
      calculos.push({
        cantidad: qty,
        hojasRequeridas,
        hojasHojeado,
        hojasProceso,
        totalHojas,
        pesoCartonKg,
        costoCarton,
        costoFlauta,
        costoImpresionFijo,
        costoPlacas,
        costoBarniz,
        costoSuajeFijo,
        costoSuajadoTiro,
        costoPegadoFijo,
        costoPegadoTiro,
        costoCajaEmbalaje,
        costoTarima,
        costoFlete,
        costoVariableTotal,
        gastosFijos,
        fijosExtras,
        costoTotal,
        precioBaseUnitario,
        precioBaseMillar,
        precioBG,
        precioCliente,
        facturacionBG,
        facturacionCliente,
        utilidadBG,
        utilidadCliente,
        utilidadBGPercent: facturacionBG > 0 ? (utilidadBG / facturacionBG) * 100 : 0,
        utilidadClientePercent: facturacionCliente > 0 ? (utilidadCliente / facturacionCliente) * 100 : 0,
        comisionPercent: 0,
        comisionMonto: 0
      });

      // Recalcular comisiones basadas en la utilidad
      this.recalcularComisionesYUtilidades(calculos[index]);
    });

    return calculos;
  }

  /**
   * Recalcula comisiones y márgenes de utilidad para una cantidad de la partida
   */
  recalcularComisionesYUtilidades(calc: DetalleCalculoCantidad): void {
    const margin = calc.utilidadClientePercent;
    let comisionPercent = 0;

    // Escala de comisiones:
    // >= 15% -> 3%
    // >= 13% -> 2.5%
    // >= 10% -> 2.0%
    // >= 9%  -> 1.5%
    // >= 6%  -> 1.0%
    // < 6%   -> 0%
    if (margin >= 15) {
      comisionPercent = 3.0;
    } else if (margin >= 13) {
      comisionPercent = 2.5;
    } else if (margin >= 10) {
      comisionPercent = 2.0;
    } else if (margin >= 9) {
      comisionPercent = 1.5;
    } else if (margin >= 6) {
      comisionPercent = 1.0;
    }

    calc.comisionPercent = comisionPercent;
    calc.comisionMonto = (calc.facturacionCliente * comisionPercent) / 100;
  }

  // --- MÉTODOS DE PERSISTENCIA ---

  private readonly STORAGE_KEY = 'cotizador_proyectos';

  obtenerProyectos(): CotizacionProyecto[] {
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (!data) return [];
    try {
      const proyectos = JSON.parse(data);
      return proyectos.map((p: any) => ({
        ...p,
        fechaCreacion: new Date(p.fechaCreacion)
      }));
    } catch (e) {
      console.error("Error al leer proyectos de LocalStorage", e);
      return [];
    }
  }

  obtenerProyectoPorId(id: string): CotizacionProyecto | undefined {
    const proyectos = this.obtenerProyectos();
    return proyectos.find(p => p.id === id);
  }

  guardarProyecto(proyecto: CotizacionProyecto): void {
    const proyectos = this.obtenerProyectos();
    const index = proyectos.findIndex(p => p.id === proyecto.id);
    if (index !== -1) {
      proyectos[index] = proyecto;
    } else {
      proyectos.push(proyecto);
    }
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(proyectos));
  }

  eliminarProyecto(id: string): void {
    let proyectos = this.obtenerProyectos();
    proyectos = proyectos.filter(p => p.id !== id);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(proyectos));
  }

  crearNuevoProyecto(nombre: string): CotizacionProyecto {
    const nuevo: CotizacionProyecto = {
      id: Math.random().toString(36).substring(2, 9),
      nombreProyecto: nombre,
      fechaCreacion: new Date(),
      partidas: [],
      margenUtilidadGlobal: 10 // 10% por defecto
    };
    this.guardarProyecto(nuevo);
    return nuevo;
  }
}
