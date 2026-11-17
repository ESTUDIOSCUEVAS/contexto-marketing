# Contexto & Objetivo — Marketing Lab

Sitio estático para realizar una actividad de análisis de contexto y objetivos de marketing.

## Qué incluye
- Formulario interactivo por 6 pasos.
- Selección de dimensiones de contexto.
- Hechos vs. suposiciones.
- Preguntas clave.
- Objetivo del negocio y objetivo de marketing.
- Cierre del análisis.
- Guardado automático en el navegador.
- Generación de PDF con jsPDF.
- Ejemplo precargable de "Reset Night".

## Publicar en GitHub Pages
1. Crea un repositorio nuevo en GitHub.
2. Sube `index.html`, `styles.css` y `app.js` a la raíz.
3. En GitHub ve a **Settings → Pages**.
4. En **Build and deployment**, elige **Deploy from a branch**.
5. Selecciona la rama `main` y la carpeta `/ (root)`.
6. Guarda. GitHub mostrará la URL pública del sitio.

## Nota
El generador de PDF usa jsPDF desde jsDelivr. Si no carga, el sitio ofrece como respaldo la impresión del navegador.
Los datos del usuario se guardan únicamente en `localStorage` del navegador.
