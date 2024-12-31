import * as monaco from 'https://cdn.jsdelivr.net/npm/monaco-editor@0.50.0/+esm';
import { parse } from './parser/gramatica.js';
import Tokenizer from './parser/visitor/Tokenizador.js';

import { ErrorReglas } from './parser/error.js';

import {generateParser} from './compilador/utilidades.js';
/** @typedef {import('./parser/visitor/CST.js').Grammar} Grammar*/
/** @typedef {import('./parser/visitor/Visitor.js').default<string>} Visitor*/

export let ids = [];
export let usos = [];
export let errores = [];

// Crear el editor principal
const editor = monaco.editor.create(document.getElementById('editor'), {
    value: '',
    language: 'java',
    theme: 'tema',
    automaticLayout: true,
});

// Crear el editor para la salida
const salida = monaco.editor.create(document.getElementById('salida'), {
    value: '',
    language: 'java',
    readOnly: true,
    automaticLayout: true,
});

let decorations = [];

// Analizar contenido del editor
/** @type {Produccion[]} */
let cst;
const analizar = () => {
    const entrada = editor.getValue();
    ids.length = 0;
    usos.length = 0;
    errores.length = 0;
    try {
        cst = parse(entrada);

        if (errores.length > 0) {
            salida.setValue(`Error: ${errores[0].message}`);
            cst = null;
            return;
        } else {
            salida.setValue('Análisis Exitoso');
        }

        // salida.setValue("Análisis Exitoso");
        // Limpiar decoraciones previas si la validación es exitosa
        decorations = editor.deltaDecorations(decorations, []);
    } catch (e) {
        cst = null;
        if (e.location === undefined) {
            salida.setValue(`Error: ${e.message}`);
        } else {
            // Mostrar mensaje de error en el editor de salida
            salida.setValue(
                `Error: ${e.message}\nEn línea ${e.location.start.line} columna ${e.location.start.column}`
            );

            // Resaltar el error en el editor de entrada
            decorations = editor.deltaDecorations(decorations, [
                {
                    range: new monaco.Range(
                        e.location.start.line,
                        e.location.start.column,
                        e.location.start.line,
                        e.location.start.column + 1
                    ),
                    options: {
                        inlineClassName: 'errorHighlight', // Clase CSS personalizada para cambiar color de letra
                    },
                },
                {
                    range: new monaco.Range(
                        e.location.start.line,
                        e.location.start.column,
                        e.location.start.line,
                        e.location.start.column
                    ),
                    options: {
                        glyphMarginClassName: 'warningGlyph', // Clase CSS para mostrar un warning en el margen
                    },
                },
            ]);
        }
    }
};

// Escuchar cambios en el contenido del editor
editor.onDidChangeModelContent(() => {
    analizar();
});

let downloadHappening = false;
const button = document.getElementById('ButtomDownload');
button.addEventListener('click', async (event) => {
    if (downloadHappening) {
        event.preventDefault(); // Previene la descarga duplicada
        return;
    }
    if (!cst) {
        alert('Escribe una gramatica valida');
        event.preventDefault(); // Previene la acción del clic si hay error
        return;
    }
    
    downloadHappening = true;
    let url;
    try {
        const fileContents = await generateParser(cst);
        const blob = new Blob([fileContents], { type: 'text/plain' });
        url = URL.createObjectURL(blob);
        button.href = url;
        button.download = 'parser.f90'; // Cambia 'parser.txt' por el nombre deseado del archivo
    } catch (error) {
        console.error('Error al generar el archivo:', error);
    } finally {
        downloadHappening = false;
        if (url) {
            // Retrasa la revocación para garantizar la descarga
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
    }
});

// CSS personalizado para resaltar el error y agregar un warning
const style = document.createElement('style');
style.innerHTML = `
    .errorHighlight {
        color: red !important;
        font-weight: bold;
    }
    .warningGlyph {
        background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill="orange" d="M8 1l7 14H1L8 1z"/></svg>') no-repeat center center;
        background-size: contain;
    }
`;
document.head.appendChild(style);