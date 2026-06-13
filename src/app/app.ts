import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CotizadorService } from './core/services/cotizador.service';
import { DB_CARTONES, DB_FLAUTAS, DB_FLETES, COSTOS_PROCESOS } from './core/db-costos';
import { PartidaCotizacion, PartidaInput, PartidaIngenieria, DetalleCalculoCantidad, CotizacionProyecto } from './core/models/cotizacion.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  // Estado global
  activeTab = signal<string>('proyectos'); // 'proyectos' | 'solicitud' | 'ingenieria' | 'consolidado'
  proyectos = signal<CotizacionProyecto[]>([]);
  proyectoActivo = signal<CotizacionProyecto | null>(null);
  partidaSeleccionadaIdx = signal<number>(0); // Indice de la partida bajo inspección en ingeniería
  
  // Catálogos accesibles desde la vista
  dbCartones = DB_CARTONES;
  dbFlautas = DB_FLAUTAS;
  dbFletes = DB_FLETES;
  costosProcesos = COSTOS_PROCESOS;

  // Notificaciones
  toast = signal<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Formulario para nuevo proyecto
  nuevoProyectoNombre = '';

  // Formulario para editar/crear partida (Vendedor)
  formPartida: PartidaInput = this.inicializarFormPartida(1);

  constructor(private cotizadorService: CotizadorService) {}

  ngOnInit() {
    this.cargarProyectos();
    // Cargar el último proyecto si existe
    const list = this.proyectos();
    if (list.length > 0) {
      this.seleccionarProyecto(list[list.length - 1]);
    }
  }

  cargarProyectos() {
    const projs = this.cotizadorService.obtenerProyectos();
    this.proyectos.set(projs);
  }

  crearProyecto() {
    if (!this.nuevoProyectoNombre.trim()) {
      this.mostrarToast('Por favor ingrese un nombre para el proyecto', 'error');
      return;
    }
    const nuevo = this.cotizadorService.crearNuevoProyecto(this.nuevoProyectoNombre.trim());
    this.cargarProyectos();
    this.seleccionarProyecto(nuevo);
    this.nuevoProyectoNombre = '';
    this.activeTab.set('solicitud');
    this.mostrarToast('Proyecto creado exitosamente', 'success');
  }

  seleccionarProyecto(p: CotizacionProyecto) {
    this.proyectoActivo.set(p);
    this.partidaSeleccionadaIdx.set(0);
    // Cargar la primera partida del proyecto al formulario de edición o inicializar uno nuevo
    if (p.partidas.length > 0) {
      this.cargarPartidaAForm(p.partidas[0].input);
    } else {
      this.formPartida = this.inicializarFormPartida(1);
    }
  }

  eliminarProyecto(id: string) {
    if (confirm('¿Está seguro de eliminar este proyecto y todas sus cotizaciones?')) {
      this.cotizadorService.eliminarProyecto(id);
      this.cargarProyectos();
      if (this.proyectoActivo()?.id === id) {
        this.proyectoActivo.set(null);
      }
      this.mostrarToast('Proyecto eliminado', 'info');
    }
  }

  inicializarFormPartida(id: number): PartidaInput {
    return {
      id: id,
      cliente: this.proyectoActivo()?.nombreProyecto || '',
      descripcion: '',
      frente: 15,
      fondo: 10,
      alto: 5,
      tipoCaja: 'Plegadiza',
      sustrato: 'PRC',
      calibre: 12,
      tintasFrente: 1,
      tintasReverso: 0,
      barniz: 'Ninguno',
      tipoPegue: 'Pegue Lineal',
      empaque: 'Corrugado',
      destino: 'LOCAL',
      cantidades: [5000, 10000, 20000, 50000, 100000],
      tieneVentana: false,
      calibreAcetato: 3,
      tieneRealce: false,
      numeroRealces: 0
    };
  }

  cargarPartidaAForm(input: PartidaInput) {
    this.formPartida = JSON.parse(JSON.stringify(input));
  }

  guardarPartida() {
    const proyecto = this.proyectoActivo();
    if (!proyecto) {
      this.mostrarToast('Crea o selecciona un proyecto primero', 'error');
      return;
    }

    if (!this.formPartida.descripcion.trim()) {
      this.mostrarToast('Por favor ingrese una descripción del producto', 'error');
      return;
    }

    const index = proyecto.partidas.findIndex((p: PartidaCotizacion) => p.input.id === this.formPartida.id);
    
    // Si es nueva partida o actualización, calculamos su ingeniería sugerida
    let ing: PartidaIngenieria;
    if (index !== -1) {
      // Usamos la ingeniería existente para conservar modificaciones de gerente,
      // a menos que cambien dimensiones o materiales críticos.
      ing = proyecto.partidas[index].ingenieria;
      // Actualizar variables de ingeniería sugeridas básicas si cambiaron dimensiones críticas
      const sugerida = this.cotizadorService.calcularIngenieriaSugerida(this.formPartida);
      ing.anchoCajaDesplegada = sugerida.anchoCajaDesplegada;
      ing.largoCajaDesplegada = sugerida.largoCajaDesplegada;
      ing.anchoCajaPlegada = sugerida.anchoCajaPlegada;
      ing.altoCajaPlegada = sugerida.altoCajaPlegada;
    } else {
      ing = this.cotizadorService.calcularIngenieriaSugerida(this.formPartida);
    }

    const calculos = this.cotizadorService.calcularPartida(this.formPartida, ing, proyecto.margenUtilidadGlobal);

    const nuevaPartida: PartidaCotizacion = {
      input: JSON.parse(JSON.stringify(this.formPartida)),
      ingenieria: ing,
      calculos: calculos
    };

    if (index !== -1) {
      proyecto.partidas[index] = nuevaPartida;
      this.mostrarToast(`Partida ${this.formPartida.id} actualizada`, 'success');
    } else {
      proyecto.partidas.push(nuevaPartida);
      this.mostrarToast(`Partida ${this.formPartida.id} agregada exitosamente`, 'success');
    }

    this.cotizadorService.guardarProyecto(proyecto);
    this.cargarProyectos();
    
    // Preparar para la siguiente partida
    const proximaId = proyecto.partidas.length + 1;
    if (proximaId <= 20) {
      this.formPartida = this.inicializarFormPartida(proximaId);
    }
  }

  eliminarPartida(idx: number) {
    const proyecto = this.proyectoActivo();
    if (!proyecto) return;

    if (confirm(`¿Eliminar partida ${proyecto.partidas[idx].input.id}?`)) {
      proyecto.partidas.splice(idx, 1);
      // Re-indexar ids
      proyecto.partidas.forEach((p: PartidaCotizacion, i: number) => {
        p.input.id = i + 1;
      });
      this.cotizadorService.guardarProyecto(proyecto);
      this.cargarProyectos();
      this.partidaSeleccionadaIdx.set(0);
      this.mostrarToast('Partida eliminada', 'info');
      
      if (proyecto.partidas.length > 0) {
        this.cargarPartidaAForm(proyecto.partidas[0].input);
      } else {
        this.formPartida = this.inicializarFormPartida(1);
      }
    }
  }

  // Métodos de la vista de Ingeniería (Gerente)
  actualizarIngenieria() {
    const proyecto = this.proyectoActivo();
    if (!proyecto || proyecto.partidas.length === 0) return;

    const partida = proyecto.partidas[this.partidaSeleccionadaIdx()];
    
    // Recalcular con los datos modificados
    partida.calculos = this.cotizadorService.calcularPartida(partida.input, partida.ingenieria, proyecto.margenUtilidadGlobal);
    
    this.cotizadorService.guardarProyecto(proyecto);
    this.cargarProyectos();
    this.mostrarToast('Parámetros de ingeniería actualizados', 'success');
  }

  copiarOptimosAPegar(partida: PartidaCotizacion) {
    // Emula la acción de copiar la fila 58 (óptimos sugeridos) a la fila 59 (valores editados)
    const sugerido = this.cotizadorService.calcularIngenieriaSugerida(partida.input);
    partida.ingenieria.anchoBobina = sugerido.anchoBobina;
    partida.ingenieria.hilo = sugerido.hilo;
    partida.ingenieria.piezasPorHoja = sugerido.piezasPorHoja;
    partida.ingenieria.embalajeNiveles = sugerido.embalajeNiveles;
    partida.ingenieria.embalajeColumnas = sugerido.embalajeColumnas;
    partida.ingenieria.fondoEmbalaje = sugerido.fondoEmbalaje;
    
    this.actualizarIngenieria();
    this.mostrarToast('Valores óptimos aplicados (simulación Pegar Valores)', 'info');
  }

  // Métodos del Consolidado (Ventas)
  actualizarMargenGlobal(nuevoMargen: number) {
    const proyecto = this.proyectoActivo();
    if (!proyecto) return;

    proyecto.margenUtilidadGlobal = nuevoMargen;
    // Recalcular todas las partidas
    proyecto.partidas.forEach((partida: PartidaCotizacion) => {
      partida.calculos = this.cotizadorService.calcularPartida(partida.input, partida.ingenieria, nuevoMargen);
    });

    this.cotizadorService.guardarProyecto(proyecto);
    this.cargarProyectos();
    this.mostrarToast('Margen de utilidad global actualizado', 'success');
  }

  actualizarPrecioManual(partidaIdx: number, calcIdx: number, campo: 'precioBG' | 'precioCliente', valorStr: string) {
    const proyecto = this.proyectoActivo();
    if (!proyecto) return;

    const valor = parseFloat(valorStr) || 0;
    const calc = proyecto.partidas[partidaIdx].calculos[calcIdx];
    
    if (campo === 'precioBG') {
      calc.precioBG = valor;
      calc.facturacionBG = (valor * calc.cantidad) / 1000;
      calc.utilidadBG = calc.facturacionBG - calc.costoTotal;
      calc.utilidadBGPercent = calc.facturacionBG > 0 ? (calc.utilidadBG / calc.facturacionBG) * 100 : 0;
    } else {
      calc.precioCliente = valor;
      calc.facturacionCliente = (valor * calc.cantidad) / 1000;
      calc.utilidadCliente = calc.facturacionCliente - calc.costoTotal;
      calc.utilidadClientePercent = calc.facturacionCliente > 0 ? (calc.utilidadCliente / calc.facturacionCliente) * 100 : 0;
      // Recalcular comisiones
      this.cotizadorService.recalcularComisionesYUtilidades(calc);
    }

    this.cotizadorService.guardarProyecto(proyecto);
    this.cargarProyectos();
  }

  // Helpers generales
  getTotalPartidasCompletadas(): number {
    const proj = this.proyectoActivo();
    if (!proj) return 0;
    // Consideramos completa una partida si tiene un precio cliente mayor a 0
    return proj.partidas.filter((p: PartidaCotizacion) => p.calculos.some((c: DetalleCalculoCantidad) => c.precioCliente > 0)).length;
  }

  getPorcentajeAvance(): number {
    const proj = this.proyectoActivo();
    if (!proj || proj.partidas.length === 0) return 0;
    return Math.round((this.getTotalPartidasCompletadas() / proj.partidas.length) * 100);
  }

  mostrarToast(message: string, type: 'success' | 'info' | 'error' = 'info') {
    this.toast.set({ message, type });
    setTimeout(() => {
      this.toast.set(null);
    }, 3500);
  }
}
