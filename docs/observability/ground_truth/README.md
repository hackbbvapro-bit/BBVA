# Banco inicial de preguntas para Ground Truth

Archivo para revisión: [FINUP_Preguntas_Ground_Truth_v0.1.xlsx](FINUP_Preguntas_Ground_Truth_v0.1.xlsx).

Contiene 60 preguntas/casos sintéticos: 12 deterministas, 6 de diseño predictivo pendientes de datos, 10 de restricciones/optimización, 14 del agente, 10 de seguridad y 8 de educación. Seis hojas: LEEME, Preguntas, Contextos, Rubrica, Diccionario y Cobertura.

Es un borrador de desarrollo público. No hay referencias aprobadas por un especialista ni resultados de ejecución del sistema. Los casos B requieren historia y futuro independientes antes de producir números. Los casos D/F usan fixtures de resultados de herramientas: no son perfiles completos ejecutables ni pruebas end-to-end. Los casos de seguridad incluyen políticas objetivo y brechas conocidas; no se afirma que el producto los supere.

Los resultados numéricos de referencia se preparan con aritmética manual/Decimal separado del motor del producto. Las referencias al código identifican el componente evaluado, no se usan como oráculo. Revisar fórmula, convención, restricciones y pertinencia antes de aprobar.

Para revisar: filtrar preguntas, leer su contexto, corregir referencia, registrar responsable y fecha, y actualizar estado/uso como GT. Una respuesta textual puede tener varias formulaciones correctas. No cambiar los esperados para hacer coincidir una salida errónea del sistema. Respuesta del sistema y resultado quedan vacíos/sin ejecutar hasta correr una evaluación.

El CSV versionable permite revisar diferencias de texto en Git; el Excel facilita anotación y filtros. Mantener ambos sincronizados. No es un formato de importación directa a LangSmith; el dataset deberá exportarse después desde referencias aprobadas.

El generador crea el borrador reproducible con Python y openpyxl ya disponibles en el entorno:

```powershell
python BBVA/docs/observability/ground_truth/generar_excel.py
```

Ejecutar desde la raíz que contiene BBVA. El script sobrescribe XLSX/CSV; sincronizar primero cualquier revisión manual con la fuente para no perderla. No lee claves, no llama proveedores ni importa/ejecuta código funcional del proyecto. La fecha indicada es la de preparación del banco, no una fecha de aprobación.
