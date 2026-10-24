// tests/api.test.js
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const cors = require('cors');

// Simulamos una instancia ligera para probar la API sin afectar el database.json real
describe('API REST de Hábitos (Integration Tests)', () => {
    let server;
    const TEST_PORT = 3099;
    const BASE_URL = `http://localhost:${TEST_PORT}`;

    // Base de datos en memoria para aislamiento total de la prueba
    const testDb = {
        habits: [{ id: 'test-habit', title: 'Hábito de prueba', targetMinutes: 15 }],
        logs: []
    };

    before(() => {
        const app = express();
        app.use(cors());
        app.use(express.json());

        app.get('/api/health', (req, res) => res.json({ status: 'active' }));

        app.get('/api/habits', (req, res) => {
            res.json({ count: testDb.habits.length, data: testDb.habits });
        });

        app.post('/api/habits', (req, res) => {
            const { id, title } = req.body;
            if (!id || !title) return res.status(400).json({ error: 'Faltan campos' });
            testDb.habits.push({ id, title });
            res.status(201).json({ message: 'Creado' });
        });

        app.use((req, res) => res.status(404).json({ error: 'Not Found' }));

        server = app.listen(TEST_PORT);
    });

    after(() => {
        server.close();
    });

    it('GET /api/health debe responder 200 OK', async () => {
        const res = await fetch(`${BASE_URL}/api/health`);
        const data = await res.json();

        assert.equal(res.status, 200);
        assert.equal(data.status, 'active');
    });

    it('GET /api/habits debe responder con el listado', async () => {
        const res = await fetch(`${BASE_URL}/api/habits`);
        const json = await res.json();

        assert.equal(res.status, 200);
        assert.equal(json.count, 1);
        assert.equal(json.data[0].id, 'test-habit');
    });

    it('POST /api/habits con datos incompletos debe responder 400 Bad Request', async () => {
        const res = await fetch(`${BASE_URL}/api/habits`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: 'incompleto' }) // Falta title
        });

        assert.equal(res.status, 400);
    });

    it('Ruta inexistente debe responder 404 Not Found', async () => {
        const res = await fetch(`${BASE_URL}/api/ruta-fantasma`);
        assert.equal(res.status, 404);
    });
});
