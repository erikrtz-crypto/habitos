// server.js
const express = require('express');
const cors = require('cors');
const fs = require('node:fs');
const path = require('node:path');
const { calculateStreakMetrics, formatDate } = require('./src/streakService');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data', 'database.json');

// Middlewares globales
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Sirve index.html directamente en http://localhost:3000

// Helper para leer base de datos
function readDatabase() {
    try {
        const raw = fs.readFileSync(DB_PATH, 'utf-8');
        return JSON.parse(raw);
    } catch (err) {
        console.error('Error leyendo la base de datos:', err);
        return { habits: [], logs: [] };
    }
}

// Helper para guardar en base de datos
function writeDatabase(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// 1. Healthcheck
app.get('/api/health', (req, res) => {
    res.json({
        status: 'active',
        service: 'Habit Tracker Engine v1',
        timestamp: new Date().toISOString()
    });
});

// 2. Obtener todos los hábitos con sus métricas calculadas en tiempo real
app.get('/api/habits', (req, res) => {
    const db = readDatabase();
    const today = new Date();

    const enrichedHabits = db.habits.map(habit => {
        const logsForHabit = db.logs.filter(log => log.habitId === habit.id);
        const metrics = calculateStreakMetrics(logsForHabit, today);

        return {
            ...habit,
            metrics
        };
    });

    res.json({
        date: formatDate(today),
        count: enrichedHabits.length,
        data: enrichedHabits,
        startDate: db.startDate || '2026-10-16'
    });
});

// 2.1 Obtener todos los logs y configuración para la cuadrícula
app.get('/api/logs', (req, res) => {
    const db = readDatabase();
    res.json({
        logs: db.logs || [],
        startDate: db.startDate || '2026-10-16'
    });
});

// 2.2 Actualizar configuración (ej. fecha de inicio)
app.post('/api/settings', (req, res) => {
    const { startDate } = req.body;
    const db = readDatabase();
    if (startDate) {
        db.startDate = startDate;
        writeDatabase(db);
    }
    res.json({ success: true, startDate: db.startDate });
});

// 2.3 Guardar notas de reflexión diaria
app.post('/api/notes', (req, res) => {
    const { date, note } = req.body;
    if (!date) return res.status(400).json({ error: 'Fecha requerida' });
    const db = readDatabase();
    
    // Asignar o actualizar nota en un log existente de esa fecha o crear uno
    let log = db.logs.find(l => l.date === date);
    if (log) {
        log.note = note;
    } else {
        db.logs.push({
            id: `log-${Date.now()}`,
            habitId: 'note',
            date,
            completed: false,
            note
        });
    }
    writeDatabase(db);
    res.json({ success: true, date, note });
});

// 3. Conmutar (Toggle) el estado de cumplimiento de un hábito para hoy o una fecha específica
app.post('/api/habits/:id/toggle', (req, res) => {
    const { id } = req.params;
    const date = req.body.date || formatDate(new Date());
    const note = req.body.note || '';

    const db = readDatabase();
    const habit = db.habits.find(h => h.id === id);

    if (!habit) {
        return res.status(404).json({ error: `Hábito con id '${id}' no encontrado` });
    }

    // Buscar si ya existe un registro para esa fecha
    const existingIndex = db.logs.findIndex(log => log.habitId === id && log.date === date);

    let wasCompleted = false;
    if (existingIndex >= 0) {
        // Si ya existía y estaba completado, lo alternamos o eliminamos
        if (db.logs[existingIndex].completed) {
            db.logs.splice(existingIndex, 1);
            wasCompleted = false;
        } else {
            db.logs[existingIndex].completed = true;
            if (note) db.logs[existingIndex].note = note;
            wasCompleted = true;
        }
    } else {
        // Crear nuevo log del evento
        db.logs.push({
            id: `log-${Date.now()}`,
            habitId: id,
            date,
            completed: true,
            note
        });
        wasCompleted = true;
    }

    writeDatabase(db);

    // Recalcular métricas de racha inmediatamente
    const habitLogs = db.logs.filter(log => log.habitId === id);
    const updatedMetrics = calculateStreakMetrics(habitLogs, new Date(date + 'T12:00:00'));

    res.json({
        message: wasCompleted ? 'Hábito marcado como completado' : 'Hábito desmarcado',
        habitId: id,
        date,
        completed: wasCompleted,
        metrics: updatedMetrics
    });
});

// 4. Crear un nuevo hábito
app.post('/api/habits', (req, res) => {
    const { id, title, category, targetMinutes } = req.body;

    if (!id || !title) {
        return res.status(400).json({ error: 'Campos obligatorios faltantes: id y title' });
    }

    const db = readDatabase();
    if (db.habits.some(h => h.id === id)) {
        return res.status(409).json({ error: `Ya existe un hábito con el id '${id}'` });
    }

    const newHabit = {
        id,
        title,
        category: category || 'general',
        targetMinutes: targetMinutes || 15,
        createdAt: formatDate(new Date())
    };

    db.habits.push(newHabit);
    writeDatabase(db);

    res.status(201).json({
        message: 'Hábito creado exitosamente',
        data: newHabit
    });
});

// 5. Historial completo de un hábito
app.get('/api/habits/:id/history', (req, res) => {
    const { id } = req.params;
    const db = readDatabase();

    const habit = db.habits.find(h => h.id === id);
    if (!habit) {
        return res.status(404).json({ error: `Hábito con id '${id}' no encontrado` });
    }

    const history = db.logs
        .filter(l => l.habitId === id)
        .sort((a, b) => b.date.localeCompare(a.date));

    res.json({
        habitId: id,
        totalEvents: history.length,
        history
    });
});

// Manejo centralizado de 404
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint no encontrado', path: req.originalUrl });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Motor de Hábitos ejecutándose en: http://localhost:${PORT}`);
});
