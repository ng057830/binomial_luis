# Distribución Binomial — Control de Calidad en Lotes

Aplicativo web interactivo (HTML, CSS y JS) diseñado para Luis para comprender paso a paso la construcción de la distribución binomial \(X \sim B(n=20, p=0.05)\) a partir de variables de Bernoulli \(Y_i\), el cálculo de \(P(X \le 2) \approx 92.45\%\), la esperanza y varianza, y el contraste con los 100 lotes reales registrados (\(\hat{p} = 88/2000 = 0.044\)).

## Secciones
- **Simulador de Lotes:** Inspección pieza por pieza (\(Y_i \in \{0,1\}\)) o por lotes (10, 50, 100, 1000), con parámetros ajustables y gráfico comparativo en tiempo real.
- **Teoría Paso a Paso:** Desarrollo matemático completo renderizado con KaTeX y un explorador interactivo de \(P(X=k)\).
- **Datos Reales (100 Lotes):** Tabla de frecuencias observadas, cálculo de \(\hat{p} = 0.044\), gráfico comparativo y descarga del CSV.
- **Practica:** Cuestionario interactivo de 5 preguntas con retroalimentación inmediata.
