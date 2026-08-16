# Casino Research Lab

Estado: RESEARCH_ONLY
Dinero real: BLOQUEADO
Objetivo: investigación matemática, física, estadística y documental de juegos de casino regulados, sin afirmar ventaja predictiva sin evidencia prospectiva reproducible.

## Departamentos

1. **Ruleta en vivo**
   - rueda/mesa/proveedor por separado
   - resultados observables y timestamp
   - dirección de rueda/bola cuando sea observable
   - crupier/auto-roulette como categorías distintas
   - cambios de mesa, rueda y régimen
   - variantes con multiplicadores separan resultado físico de bonus/RNG cuando corresponda

2. **Ruleta RNG / no-live**
   - reglas, RTP, paytable, proveedor, certificación y versión
   - jamás inferir que el histórico permite predecir un RNG certificado
   - pruebas de uniformidad, independencia, autocorrelación y changepoints sólo como auditoría

3. **Ruletas especiales / multiplicadores**
   - Lightning, Quantum, Fireblaze, Red Door y variantes que se documenten
   - modelo dual cuando exista: rueda física + selección/multiplicador RNG
   - estudiar número ganador y bonus como procesos distintos

4. **Portfolio PokerStars España**
   - inventario versionado de juegos/proveedores/categorías
   - reglas, RTP, volatilidad cuando esté publicada, límites y cambios

5. **Portfolio PlayUZU España**
   - inventario versionado de juegos/proveedores/categorías
   - reglas, RTP, volatilidad cuando esté publicada, límites y cambios

6. **Biblioteca Casino Mundial**
   - papers, tesis, patentes, certificaciones, documentación de proveedores y reguladores
   - reproducir métodos publicados antes de inventar variantes

7. **Audición de Genios — Casino**
   - agentes pueden proponer hipótesis propias
   - Red Team obligatorio
   - multiplicidad estadística obligatoria
   - freeze antes de OOS
   - replicación independiente antes de cualquier etiqueta de descubrimiento

## Separación obligatoria

Nunca mezclar:
- ruleta física en vivo con ruleta RNG;
- número ganador con multiplicador RNG;
- mesas/proveedores distintos como si fueran una sola secuencia;
- datos demo con dinero real;
- resultados retrospectivos con evidencia prospectiva.

## Fuentes iniciales verificadas (2026-08-16)

PokerStars España publica ruleta en vivo, Auto Roulette y variantes como Lightning/Quantum, además de indicar que sus juegos muestran RTP en reglas/ayuda.
PlayUZU España publica ruleta online RNG y ruleta en vivo como procesos distintos, además de variantes con multiplicadores y licencias españolas de ruleta/blackjack/máquinas de azar.

## Gate económico

No se autoriza apuesta real desde este laboratorio. Una hipótesis debe superar: preregistro -> selección -> freeze -> OOS -> replicación -> prospectivo -> evaluación de EV neto incluyendo ventaja de la casa y costes. Incluso entonces cualquier uso real requeriría decisión humana separada.
