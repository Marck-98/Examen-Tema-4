// Obtener elementos del DOM
const startBtn = document.getElementById('start');
const textarea = document.getElementById('texto');
const idiomasSelect = document.getElementById('idiomas');
const resultadosDiv = document.getElementById('resultados');

let recognition;

// Verificar compatibilidad con reconocimiento de voz
if ('webkitSpeechRecognition' in window) {
  recognition = new webkitSpeechRecognition();
  recognition.lang = 'es-ES';
  recognition.continuous = false;
  recognition.interimResults = false;

  // Cuando se detecta el resultado de voz
  recognition.onresult = function (event) {
    const texto = event.results[0][0].transcript;
    textarea.value = texto;
    enviarTexto(texto);
  };
}

// Iniciar reconocimiento de voz al hacer clic
startBtn.addEventListener('click', () => {
  recognition.start();
});

// Validar selección de idiomas (máximo 5)
idiomasSelect.addEventListener('change', () => {
  const selected = Array.from(idiomasSelect.selectedOptions);
  if (selected.length > 5) {
    selected[selected.length - 1].selected = false;
    alert('Solo puedes seleccionar hasta 5 idiomas.');
  }
});

// Enviar texto al backend para traducir
function enviarTexto(texto) {
  const idiomas = Array.from(idiomasSelect.selectedOptions).map(opt => opt.value);

  if (idiomas.length === 0) {
    alert('Selecciona al menos un idioma.');
    return;
  }

  fetch('http://44.192.111.192/examen-2da/traducir.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texto, idiomas })
  })
    .then(res => res.json())
    .then(data => {
      console.log('Respuesta del backend:', data); // Depuración

      resultadosDiv.innerHTML = ''; // Limpiar resultados anteriores

      // Verificar si contiene el objeto traducciones
      const traducciones = data.traducciones;

      for (const idioma in traducciones) {
        resultadosDiv.innerHTML += `
          <div class="card mb-2">
            <div class="card-body">
              <h5 class="card-title">${idioma}</h5>
              <p class="card-text">${traducciones[idioma]}</p>
            </div>
          </div>`;
      }
    })
    .catch(err => {
      resultadosDiv.innerHTML = '<div class="alert alert-danger">Error en la traducción</div>';
      console.error('Error en fetch:', err);
    });
}
