/**
 * Exportar gastos a archivo Excel (.xlsx) usando SheetJS
 */
function exportToExcel(gastos) {
    // Preparar datos
    const rows = gastos.map((g, i) => ({
        'N°': i + 1,
        'Descripción': g.descripcion,
        'Valor ($)': parseFloat(g.valor),
        'Link Comprobante': g.link_drive || ''
    }));

    // Agregar fila de total
    const total = gastos.reduce((s, g) => s + parseFloat(g.valor), 0);
    rows.push({
        'N°': '',
        'Descripción': 'TOTAL',
        'Valor ($)': total,
        'Link Comprobante': ''
    });

    // Crear workbook
    const ws = XLSX.utils.json_to_sheet(rows);

    // Ajustar anchos de columna
    ws['!cols'] = [
        { wch: 5 },   // N°
        { wch: 40 },  // Descripción
        { wch: 15 },  // Valor
        { wch: 50 }   // Link
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rendición');

    // Generar nombre con fecha
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10);
    const filename = `Rendicion_Cuentas_${dateStr}.xlsx`;

    // Descargar
    XLSX.writeFile(wb, filename);
    toast('Excel descargado ✓');
}
