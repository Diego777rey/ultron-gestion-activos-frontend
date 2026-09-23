import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import { OrdenTrabajoOutput } from '../../features/taller/orden-de-trabajo/interfaces/orden-trabajo.interface';

@Injectable({ providedIn: 'root' })
export class PdfPresupuestoService {
  generarPdfPresupuesto(orden: OrdenTrabajoOutput): void {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPos = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('PRESUPUESTO DE REPARACIÓN', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Orden de Trabajo N° ${orden.numero_orden || 'N/A'}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;

    const fechaCreacion = orden.fecha_creacion
      ? new Date(orden.fecha_creacion).toLocaleDateString('es-PY', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'N/A';
    doc.text(`Fecha: ${fechaCreacion}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('DATOS DEL CLIENTE', margin, yPos);
    yPos += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    const cliente = orden.cliente?.persona;
    const nombreCliente = cliente
      ? `${cliente.nombre ?? ''} ${cliente.apellido ?? ''}`.trim() || 'N/A'
      : 'N/A';
    const documentoCliente = cliente?.documento || 'N/A';

    doc.text(`Cliente: ${nombreCliente}`, margin, yPos);
    yPos += 6;
    doc.text(`Documento: ${documentoCliente}`, margin, yPos);
    yPos += 10;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('DATOS DEL VEHÍCULO', margin, yPos);
    yPos += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    const vehiculo = orden.vehiculo;
    const chapa = vehiculo?.chapa || 'N/A';
    const marca = vehiculo?.marca || 'N/A';
    const modelo = vehiculo?.modelo || 'N/A';
    const anio = vehiculo?.anio != null ? String(vehiculo.anio) : 'N/A';
    const kilometraje = orden.estado_vehiculo?.kilometraje != null
      ? `${orden.estado_vehiculo.kilometraje} km`
      : 'N/A';

    doc.text(`Chapa: ${chapa}`, margin, yPos);
    yPos += 6;
    doc.text(`Marca: ${marca}`, margin, yPos);
    yPos += 6;
    doc.text(`Modelo: ${modelo}`, margin, yPos);
    yPos += 6;
    doc.text(`Año: ${anio}`, margin, yPos);
    yPos += 6;
    doc.text(`Kilometraje: ${kilometraje}`, margin, yPos);
    yPos += 10;

    const fallaReportada = orden.recepcion?.descripcion_falla || 'No especificada';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('FALLA REPORTADA', margin, yPos);
    yPos += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const fallaLineas = doc.splitTextToSize(fallaReportada, pageWidth - 2 * margin);
    doc.text(fallaLineas, margin, yPos);
    yPos += fallaLineas.length * 6 + 4;

    if (orden.hallazgos && orden.hallazgos.length > 0) {
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = margin;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('DIAGNÓSTICO TÉCNICO', margin, yPos);
      yPos += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      for (const hallazgo of orden.hallazgos) {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = margin;
        }

        const tipo = hallazgo.tipo || 'N/A';
        const gravedad = hallazgo.gravedad || '';
        const sistema = hallazgo.sistema || '';
        const descripcion = hallazgo.descripcion || 'Sin descripción';

        const tipoGravedad = gravedad ? `${tipo} - ${gravedad}` : tipo;
        doc.setFont('helvetica', 'bold');
        doc.text(`• ${tipoGravedad}`, margin + 2, yPos);
        yPos += 5;

        doc.setFont('helvetica', 'normal');
        if (sistema) {
          doc.text(`  Sistema: ${sistema}`, margin + 4, yPos);
          yPos += 5;
        }

        const descLineas = doc.splitTextToSize(descripcion, pageWidth - 2 * margin - 8);
        doc.text(descLineas, margin + 4, yPos);
        yPos += descLineas.length * 5 + 5;
      }

      yPos += 5;
    }

    if (yPos > pageHeight - 80) {
      doc.addPage();
      yPos = margin;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('DETALLE DEL PRESUPUESTO', margin, yPos);
    yPos += 8;

    doc.setDrawColor(100, 100, 100);
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Descripción', margin + 2, yPos + 5);
    doc.text('Cant.', pageWidth - margin - 50, yPos + 5);
    doc.text('Precio Unit.', pageWidth - margin - 35, yPos + 5);
    doc.text('Subtotal', pageWidth - margin - 15, yPos + 5, { align: 'right' });
    yPos += 7;

    doc.setFont('helvetica', 'normal');
    const detalles = orden.detalles || [];
    let totalPresupuesto = 0;

    for (const detalle of detalles) {
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = margin;

        doc.setDrawColor(100, 100, 100);
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, yPos, pageWidth - 2 * margin, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Descripción', margin + 2, yPos + 5);
        doc.text('Cant.', pageWidth - margin - 50, yPos + 5);
        doc.text('Precio Unit.', pageWidth - margin - 35, yPos + 5);
        doc.text('Subtotal', pageWidth - margin - 15, yPos + 5, { align: 'right' });
        yPos += 7;
        doc.setFont('helvetica', 'normal');
      }

      const nombre =
        detalle.nombre_producto || detalle.nombre_servicio || detalle.descripcion || 'Sin nombre';
      const cantidad = detalle.cantidad || 0;
      const precioUnitario = detalle.precio_unitario || 0;
      const subtotal = detalle.subtotal || cantidad * precioUnitario;
      totalPresupuesto += subtotal;

      const nombreLineas = doc.splitTextToSize(nombre, pageWidth - 2 * margin - 60);
      const lineHeight = 5;
      const blockHeight = nombreLineas.length * lineHeight;

      doc.text(nombreLineas, margin + 2, yPos + 4);
      doc.text(String(cantidad), pageWidth - margin - 50, yPos + 4);
      doc.text(this.formatearMoneda(precioUnitario), pageWidth - margin - 35, yPos + 4);
      doc.text(this.formatearMoneda(subtotal), pageWidth - margin - 15, yPos + 4, { align: 'right' });

      yPos += Math.max(blockHeight, lineHeight) + 2;

      doc.setDrawColor(220, 220, 220);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 2;
    }

    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('TOTAL:', pageWidth - margin - 40, yPos);
    doc.text(this.formatearMoneda(totalPresupuesto), pageWidth - margin - 15, yPos, { align: 'right' });
    yPos += 10;

    if (orden.diagnostico?.fecha_inicio_estimada && orden.diagnostico?.fecha_fin_estimada) {
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = margin;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('PLAZOS ESTIMADOS', margin, yPos);
      yPos += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);

      const fechaInicio = new Date(orden.diagnostico.fecha_inicio_estimada).toLocaleDateString(
        'es-PY',
      );
      const fechaFin = new Date(orden.diagnostico.fecha_fin_estimada).toLocaleDateString('es-PY');
      const duracion = orden.diagnostico.duracion_estimada_dias || 0;

      doc.text(`Fecha de inicio estimada: ${fechaInicio}`, margin, yPos);
      yPos += 6;
      doc.text(`Fecha de finalización estimada: ${fechaFin}`, margin, yPos);
      yPos += 6;
      doc.text(
        `Duración estimada: ${duracion} ${duracion === 1 ? 'día' : 'días'}`,
        margin,
        yPos,
      );
      yPos += 10;
    }

    if (orden.diagnostico?.observaciones) {
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = margin;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('OBSERVACIONES', margin, yPos);
      yPos += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const obsLineas = doc.splitTextToSize(
        orden.diagnostico.observaciones,
        pageWidth - 2 * margin,
      );
      doc.text(obsLineas, margin, yPos);
      yPos += obsLineas.length * 6 + 10;
    }

    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = margin;
    } else {
      yPos = pageHeight - 50;
    }

    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth / 2 - 10, yPos);
    doc.line(pageWidth / 2 + 10, yPos, pageWidth - margin, yPos);
    yPos += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Firma del Cliente', pageWidth / 4, yPos, { align: 'center' });
    doc.text('Firma del Responsable', (3 * pageWidth) / 4, yPos, { align: 'center' });

    const filename = `Presupuesto_OT${orden.numero_orden || 'N-A'}.pdf`;
    doc.save(filename);
  }

  private formatearMoneda(valor: number): string {
    return valor.toLocaleString('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }
}
