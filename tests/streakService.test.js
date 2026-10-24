// tests/streakService.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { calculateStreakMetrics } = require('../src/streakService');

describe('Motor de Cálculo de Rachas (Streak Service)', () => {
    const REFERENCE_TODAY = new Date('2026-10-24T12:00:00');

    it('Caso 1: Usuario nuevo sin ningún registro debe tener racha 0', () => {
        const logs = [];
        const result = calculateStreakMetrics(logs, REFERENCE_TODAY);

        assert.equal(result.currentStreak, 0);
        assert.equal(result.bestStreak, 0);
        assert.equal(result.todayCompleted, false);
        assert.equal(result.totalDaysCompleted, 0);
    });

    it('Caso 2: Racha activa completada hoy (3 días consecutivos)', () => {
        const logs = [
            { habitId: 'prog', date: '2026-10-22', completed: true },
            { habitId: 'prog', date: '2026-10-23', completed: true },
            { habitId: 'prog', date: '2026-10-24', completed: true },
        ];
        const result = calculateStreakMetrics(logs, REFERENCE_TODAY);

        assert.equal(result.currentStreak, 3);
        assert.equal(result.bestStreak, 3);
        assert.equal(result.todayCompleted, true);
        assert.equal(result.totalDaysCompleted, 3);
    });

    it('Caso 3: Racha activa pero pendiente de hoy (completó ayer, no hoy)', () => {
        // Ayer fue 2026-10-23. El usuario aún tiene hasta las 23:59 de hoy para cumplir.
        const logs = [
            { habitId: 'prog', date: '2026-10-22', completed: true },
            { habitId: 'prog', date: '2026-10-23', completed: true },
        ];
        const result = calculateStreakMetrics(logs, REFERENCE_TODAY);

        assert.equal(result.currentStreak, 2, 'La racha debe conservarse activa');
        assert.equal(result.todayCompleted, false, 'Hoy aún no se marca como completado');
    });

    it('Caso 4: Racha rota (completó hace 2 días, pero no ayer)', () => {
        // Saltó el día 2026-10-23
        const logs = [
            { habitId: 'prog', date: '2026-10-21', completed: true },
            { habitId: 'prog', date: '2026-10-22', completed: true },
        ];
        const result = calculateStreakMetrics(logs, REFERENCE_TODAY);

        assert.equal(result.currentStreak, 0, 'La racha actual debe ser 0 porque ayer no se cumplió');
        assert.equal(result.bestStreak, 2, 'El récord histórico debe conservar los 2 días');
    });

    it('Caso 5: Idempotencia y duplicados en el mismo día', () => {
        // Dos logs el mismo día no deben duplicar el conteo
        const logs = [
            { habitId: 'prog', date: '2026-10-24', completed: true },
            { habitId: 'prog', date: '2026-10-24', completed: true },
        ];
        const result = calculateStreakMetrics(logs, REFERENCE_TODAY);

        assert.equal(result.currentStreak, 1);
        assert.equal(result.totalDaysCompleted, 1);
    });

    it('Caso 6: Cruce de fin de mes (31 de Octubre a 1 de Noviembre)', () => {
        const REF_NOV_1 = new Date('2026-11-01T12:00:00');
        const logs = [
            { habitId: 'prog', date: '2026-10-31', completed: true },
            { habitId: 'prog', date: '2026-11-01', completed: true },
        ];
        const result = calculateStreakMetrics(logs, REF_NOV_1);

        assert.equal(result.currentStreak, 2, 'Debe conectar el último día del mes con el primero');
        assert.equal(result.todayCompleted, true);
    });

    it('Caso 7: Récord histórico mayor a la racha actual', () => {
        // En el pasado tuvo 4 días seguidos, luego paró, y ahora lleva 1
        const logs = [
            { habitId: 'prog', date: '2026-10-01', completed: true },
            { habitId: 'prog', date: '2026-10-02', completed: true },
            { habitId: 'prog', date: '2026-10-03', completed: true },
            { habitId: 'prog', date: '2026-10-04', completed: true },
            // Brecha de varios días
            { habitId: 'prog', date: '2026-10-24', completed: true },
        ];
        const result = calculateStreakMetrics(logs, REFERENCE_TODAY);

        assert.equal(result.currentStreak, 1, 'Racha actual reiniciada en 1');
        assert.equal(result.bestStreak, 4, 'Mejor racha debe ser 4');
        assert.equal(result.totalDaysCompleted, 5);
    });
});
