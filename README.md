# A la mesa · Buscador de recetas

Aplicación responsive con HTML, CSS y JavaScript vanilla para buscar recetas
con los ingredientes disponibles. Usa la API de Spoonacular y muestra imágenes,
ingredientes disponibles, ingredientes faltantes y enlaces a las recetas.

## Configuración local

1. Obtén una API Key en https://spoonacular.com/food-api/console.
2. Copia `js/config.example.js` como `js/config.js`:

   ```bash
   cp js/config.example.js js/config.js
   ```

3. En `js/config.js`, reemplaza `TU_API_KEY_AQUI` por tu clave.
4. Guarda el archivo y abre `index.html` usando Live Server en VS Code.

Alternativamente, si tienes Python instalado, inicia el servidor desde la
carpeta del proyecto:

```bash
python3 -m http.server 5500 --bind 127.0.0.1
```

Abre http://127.0.0.1:5500. Para detener el servidor, presiona Ctrl+C.

Prueba con `pollo, tomate, cebolla`. La traducción al inglés cubre ingredientes
comunes; otros se envían tal como se escriben. Los títulos e ingredientes de
las respuestas suelen estar en inglés.

## Subir el código a GitHub

Se incluyen `index.html`, `styles.css`, `js/app.js`, `js/config.example.js`,
este README y `.gitignore`. El archivo `js/config.js` contiene la clave local
y está excluido de Git, al igual que archivos `.env` y `.DS_Store`.

No uses `git add -f` para incluir archivos ignorados. Al arrastrar archivos al
sitio web de GitHub, `.gitignore` no impide que selecciones y subas una clave;
usa Git o selecciona únicamente los archivos públicos indicados arriba.

## Publicación de la aplicación

Excluir `config.js` protege la clave del repositorio, pero el navegador puede
leer cualquier clave usada por esta versión de la aplicación. Para ofrecerla
al público con una clave privada, crea un backend que consulte Spoonacular
y guarde la clave en variables de entorno del servidor. Un archivo `.env`
por sí solo no es leído por esta aplicación estática ni oculta una clave
enviada al navegador.

Si una clave ya se publicó, revócala y genera otra en Spoonacular. Borrarla de
un archivo no la elimina del historial de Git.

## Tecnologías

HTML5, CSS3, JavaScript vanilla, Fetch API y Spoonacular API. No requiere npm
ni un proceso de compilación.
