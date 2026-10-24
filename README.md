# Habit Tracker & Event-Driven Engine

> Sistema Full Stack de seguimiento de hábitos y retos de 30 días impulsado por una API REST y un motor de cálculo de rachas (streaks) basado en registros de eventos inmutables.

---

## Arquitectura del Sistema

El proyecto evolucionó de una aplicación local basada en `localStorage` a una arquitectura desacoplada cliente-servidor:

```
habitos/
├── data/
│   └── database.json          # Persistencia en archivo (Colecciones: habits, logs)
├── src/
│   └── streakService.js       # Lógica pura de negocio: cálculo de rachas tipo Duolingo
├── tests/
│   ├── streakService.test.js  # Pruebas unitarias (casos borde: fin de mes, duplicados, etc.)
│   └── api.test.js            # Pruebas de integración HTTP
├── index.html                 # Frontend interactivo con modo oscuro y cuadrícula
├── server.js                  # Servidor Express, CORS y endpoints REST
└── package.json
```

---

## Características Principales

* **Motor de Rachas Basado en Eventos (Event Ledger):** En lugar de un simple contador volátil, cada sesión completada genera un evento inmutable con fecha y notas. La racha se computa en tiempo real analizando el calendario consecutivo.
* **Manejo del Día en Curso:** La racha no se reinicia a 0 si el usuario no ha completado el hábito hoy pero sí cumplió ayer; el sistema mantiene viva la racha en espera del cierre de la jornada.
* **Frontend Reactivo con Debounce:** Interfaz moderna en modo oscuro, barra de progreso animada, cuadrícula de 30 días y guardado automático con debounce de 600ms para notas.
* **Cubierto con Pruebas Nativas:** 11 pruebas automatizadas utilizando `node:test` y `node:assert`, sin dependencias pesadas.

---

## Endpoints de la API REST

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Estado del servicio y timestamp UTC |
| `GET` | `/api/habits` | Listado de hábitos con rachas y estados computados |
| `POST` | `/api/habits/:id/toggle` | Alterna cumplimiento de un hábito para una fecha (`{ date, note }`) |
| `POST` | `/api/habits` | Registra un nuevo hábito (`{ id, title, category, targetMinutes }`) |
| `GET` | `/api/habits/:id/history` | Historial completo de eventos de un hábito |
| `GET` | `/api/logs` | Registros y configuración de inicio de la cuadrícula |
| `POST` | `/api/notes` | Guarda la nota de reflexión diaria para una fecha |
| `POST` | `/api/settings` | Actualiza la fecha de inicio del reto |

---

## Instalación y Puesta en Marcha

### Prerrequisitos
* Node.js v20+ o v24 LTS
* Git

### 1. Clonar el repositorio
```bash
git clone https://github.com/erikrtz-crypto/habitos.git
cd habitos
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Ejecutar la suite de pruebas
```bash
npm test
```

### 4. Iniciar el servidor
```bash
npm start
```
Abre tu navegador en `http://localhost:3000`.
