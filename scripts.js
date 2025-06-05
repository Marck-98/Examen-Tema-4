document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const recordBtn = document.getElementById('recordBtn');
    const clearBtn = document.getElementById('clearBtn');
    const translateBtn = document.getElementById('translateBtn');
    const sourceText = document.getElementById('sourceText');
    const translatedText = document.getElementById('translatedText');
    const targetLanguage = document.getElementById('targetLanguage');
    const historySection = document.getElementById('historySection');
    const historyTable = document.getElementById('historyTable').getElementsByTagName('tbody')[0];
    
    // Variables de estado
    let recognition;
    let isRecording = false;
    
    // ======================
    // Configuración de voz
    // ======================
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'es-ES';
        
        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            sourceText.value = transcript;
            isRecording = false;
            updateRecordButton(false);
        };
        
        recognition.onerror = function(event) {
            console.error('Error en reconocimiento de voz:', event.error);
            isRecording = false;
            updateRecordButton(false);
            alert('Error en el reconocimiento de voz. Por favor, inténtalo de nuevo.');
        };
    } else {
        recordBtn.disabled = true;
        recordBtn.title = 'El reconocimiento de voz no es compatible con tu navegador';
    }

    // Función para actualizar el botón de grabación
    function updateRecordButton(recording) {
        if (recording) {
            recordBtn.innerHTML = '<i class="bi bi-mic-mute"></i> Detener';
            recordBtn.classList.remove('btn-primary');
            recordBtn.classList.add('btn-danger');
        } else {
            recordBtn.innerHTML = '<i class="bi bi-mic"></i> Grabar Voz';
            recordBtn.classList.remove('btn-danger');
            recordBtn.classList.add('btn-primary');
        }
    }
    
    // ======================
    // Event Listeners
    // ======================
    recordBtn.addEventListener('click', function() {
        if (!recognition) return;
        
        if (isRecording) {
            recognition.stop();
        } else {
            recognition.start();
        }
        isRecording = !isRecording;
        updateRecordButton(isRecording);
    });
    
    clearBtn.addEventListener('click', function() {
        sourceText.value = '';
        translatedText.value = '';
    });
    
    translateBtn.addEventListener('click', async function() {
        await handleTranslation();
    });

    // ======================
    // Funciones principales
    // ======================
    async function handleTranslation() {
        const text = sourceText.value.trim();
        const language = targetLanguage.value;
        
        // Validación básica
        if (!text) {
            showAlert('Por favor, introduce o graba un texto para traducir');
            return;
        }

        // Mostrar estado de carga
        translateBtn.disabled = true;
        translateBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Traduciendo...';
        
        try {
            // 1. Realizar la solicitud de traducción
            const response = await fetch('http://44.192.111.192/backend-exa/translate.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: text,
                    target_lang: language
                }),
                mode: 'cors'
            });

            // 2. Procesar la respuesta
            const data = await processResponse(response);

            // 3. Mostrar resultado
            translatedText.value = data.translated_text;
            
            // 4. Actualizar historial
            await loadTranslationHistory();
            historySection.style.display = 'block';
            
        } catch (error) {
            handleTranslationError(error);
        } finally {
            // Restaurar estado normal del botón
            translateBtn.disabled = false;
            translateBtn.innerHTML = '<i class="bi bi-translate"></i> Traducir';
        }
    }

    async function processResponse(response) {
        // Verificar estado de la respuesta
        if (!response.ok) {
            const errorData = await tryParseError(response);
            const errorMessage = errorData?.error || `Error del servidor (${response.status})`;
            throw new Error(errorMessage);
        }

        // Parsear respuesta JSON
        const data = await response.json();
        
        // Validar estructura de la respuesta
        if (!data || !data.translated_text) {
            throw new Error('La respuesta del servidor no contiene la traducción');
        }

        return data;
    }

    async function tryParseError(response) {
        try {
            return await response.json();
        } catch {
            return null;
        }
    }

    function handleTranslationError(error) {
        console.error('Error en la traducción:', error);
        
        // Mensajes de error más amigables
        let userMessage = error.message;
        if (error.message.includes('Failed to fetch')) {
            userMessage = 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
        } else if (error.message.includes('502')) {
            userMessage = 'El servidor de traducción no está disponible temporalmente. Inténtalo más tarde.';
        }
        
        showAlert(`Error al traducir: ${userMessage}`);
    }

    function showAlert(message) {
        // Podrías reemplazar esto con un toast o modal más elegante
        alert(message);
    }

    // ======================
    // Manejo del historial
    // ======================
    async function loadTranslationHistory() {
        try {
            const response = await fetch('http://44.192.111.192/backend-exa/translate.php?action=get_history', {
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`Error al obtener historial: ${response.status}`);
            }
            
            const history = await response.json();
            
            // Validar estructura de los datos
            if (!Array.isArray(history)) {
                throw new Error('Formato de historial inválido');
            }
            
            renderHistoryTable(history);
            
        } catch (error) {
            console.error('Error al cargar historial:', error);
            // No mostramos alerta al usuario para no ser intrusivos
        }
    }

    function renderHistoryTable(history) {
        // Limpiar tabla
        historyTable.innerHTML = '';
        
        // Agregar registros
        history.forEach(item => {
            const row = historyTable.insertRow();
            
            // Usar valores por defecto si faltan datos
            const originalText = item.texto_original || 'Texto no disponible';
            const translatedText = item.texto_traducido || 'Traducción no disponible';
            const translationDate = item.fecha_hora 
                ? formatDate(new Date(item.fecha_hora)) 
                : 'Fecha no disponible';
            
            row.insertCell(0).textContent = originalText;
            row.insertCell(1).textContent = translatedText;
            row.insertCell(2).textContent = translationDate;
        });
    }

    function formatDate(date) {
        // Formatear fecha de manera legible
        return date.toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
});