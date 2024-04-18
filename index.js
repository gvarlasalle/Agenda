const express = require('express');
const fs = require('fs');
const path = require('path');
const markdownit = require('markdown-it');
const bodyParser = require('body-parser');
const md = new markdownit();

const app = express();
const PORT = process.env.PORT || 3000;

// Configura body-parser para parsear JSON
app.use(bodyParser.json());

// Configura body-parser para parsear datos de formularios
app.use(bodyParser.urlencoded({ extended: false }));

// Middleware para analizar el cuerpo de las solicitudes POST
app.use(express.json());

// Middleware para servir archivos estáticos
app.use(express.static('pub'));

// Ruta para la página principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'pub', 'index.html'));
});

app.post('/crearEvento', (req, res) => {
    console.log("pruebacrear");
    const { titulo, descripcion, fecha, hora } = req.body;
    const eventoPath = path.join(__dirname, 'priv', 'agenda', fecha, `${hora}.txt`);

    // Verificar si la carpeta 'agenda' existe dentro de 'priv', si no, crearla
    const agendaDir = path.join(__dirname, 'priv', 'agenda');
    if (!fs.existsSync(agendaDir)) {
        fs.mkdirSync(agendaDir);
    }

    // Verificar si el directorio de la fecha existe, si no, lo crea
    const fechaDir = path.join(__dirname, 'priv', 'agenda', fecha);
    if (!fs.existsSync(fechaDir)) {
        fs.mkdirSync(fechaDir);
    }

    if (fs.existsSync(eventoPath)) {
        return res.status(400).json({ message: 'El evento ya existe' });
    }

    const contenidoEvento = `# ${titulo}\n\n - ${descripcion}`;
    fs.writeFileSync(eventoPath, contenidoEvento);
    res.json({ message: 'Evento creado exitosamente' });
});


// Ruta para obtener todos los eventos
app.get('/eventos', (req, res) => {
    const eventosDir = path.join(__dirname, 'priv', 'agenda');
    let eventos = [];

    if (fs.existsSync(eventosDir)) {
        const dates = fs.readdirSync(eventosDir);
        dates.forEach(fecha => {
            const dateDir = path.join(eventosDir, fecha);
            const times = fs.readdirSync(dateDir);
            times.forEach(hora => {
                const eventoPath = path.join(dateDir, hora);
                const contenidoEvento = fs.readFileSync(eventoPath, 'utf-8');
               
                // Dividir el contenido del evento en líneas
                const lineas = contenidoEvento.split('\n');
               
                // El primer elemento es el título del evento
                const titulo = lineas[0].replace('# ', '');
               
                // El resto de las líneas son la descripción
                const descripcion = lineas.slice(1).join('\n');
               
                eventos.push({ fecha, hora, titulo, descripcion });
            });
        });
    }

    res.json(eventos);
});

// Ruta para eliminar un evento
app.delete('/eliminarEvento', (req, res) => {
    const { fecha, hora } = req.body;

    // Eliminar la extensión ".txt" de la hora
    const horaSinExtension = hora.replace('.txt', '');

    const eventoPath = path.join(__dirname, 'priv', 'agenda', fecha, `${horaSinExtension}.txt`);

    if (fs.existsSync(eventoPath)) {
        fs.unlinkSync(eventoPath);

        // Verificar si la carpeta está vacía y eliminarla si es necesario
        const fechaDir = path.join(__dirname, 'priv', 'agenda', fecha);
        fs.readdir(fechaDir, (err, files) => {
            if (err) {
                console.error('Error al leer la carpeta:', err);
                res.status(500).json({ message: 'Error al verificar la carpeta' });
            } else {
                if (files.length === 0) {
                    // La carpeta está vacía, eliminarla
                    fs.rmdir(fechaDir, (err) => {
                        if (err) {
                            console.error('Error al eliminar la carpeta:', err);
                            res.status(500).json({ message: 'Error al eliminar la carpeta' });
                        } else {
                            res.json({ message: 'Evento y carpeta eliminados exitosamente' });
                        }
                    });
                } else {
                    // La carpeta no está vacía, simplemente responder
                    res.json({ message: 'Evento eliminado exitosamente' });
                }
            }
        });
    } else {
        res.status(404).json({ message: 'Evento no encontrado' });
    }
});


// Ruta para editar un evento
app.put('/editarEvento', (req, res) => {
    const { fecha, hora, nuevoTitulo, nuevaDescripcion } = req.body;

    // Eliminar la extensión ".txt" de la hora
    const horaSinExtension = hora.replace('.txt', '');

    const eventoPath = path.join(__dirname, 'priv', 'agenda', fecha, `${horaSinExtension}.txt`);

    if (fs.existsSync(eventoPath)) {
        // Leer el contenido actual del evento
        const contenidoActual = fs.readFileSync(eventoPath, 'utf-8');

        // Dividir el contenido en líneas
        const lineas = contenidoActual.split('\n');

        // Actualizar el título y la descripción
        lineas[0] = `# ${nuevoTitulo}`;
        lineas.splice(1); // Eliminar todas las líneas después de la primera

        // Añadir la nueva descripción
        lineas.push(nuevaDescripcion);

        // Reconstruir el contenido del evento con las modificaciones
        const nuevoContenidoEvento = lineas.join('\n');

        // Escribir el nuevo contenido en el archivo del evento
        fs.writeFileSync(eventoPath, nuevoContenidoEvento);
        res.json({ message: 'Evento editado exitosamente' });
    } else {
        res.status(404).json({ message: 'Evento no encontrado' });
    }
});



app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto: ${PORT}`);
});

