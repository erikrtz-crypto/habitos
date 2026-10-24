// src/streakService.js

/**
 * Normaliza una fecha a formato local YYYY-MM-DD
 */
function formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Devuelve la fecha de ayer en formato YYYY-MM-DD
 */
function getYesterdayDate(todayStr) {
    const d = new Date(todayStr + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    return formatDate(d);
}

/**
 * Calcula la diferencia en días entre dos fechas (YYYY-MM-DD)
 */
function diffInDays(dateStrA, dateStrB) {
    const a = new Date(dateStrA + 'T12:00:00');
    const b = new Date(dateStrB + 'T12:00:00');
    const diffTime = Math.abs(a - b);
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Motor de cálculo de rachas basado en eventos históricos
 */
function calculateStreakMetrics(logsForHabit, referenceDate = new Date()) {
    const todayStr = formatDate(referenceDate);
    const yesterdayStr = getYesterdayDate(todayStr);

    // 1. Filtrar solo los completados y obtener fechas únicas
    const completedDates = Array.from(
        new Set(
            logsForHabit
                .filter(l => l.completed)
                .map(l => l.date)
        )
    ).sort((a, b) => b.localeCompare(a)); // Orden descendente (más reciente primero)

    const dateSet = new Set(completedDates);
    const todayCompleted = dateSet.has(todayStr);
    const yesterdayCompleted = dateSet.has(yesterdayStr);

    // 2. Determinar la racha actual (Current Streak)
    let currentStreak = 0;

    if (todayCompleted || yesterdayCompleted) {
        // La racha está viva si se completó hoy o si se completó ayer (aún tiene el día de hoy para cumplir)
        let checkDate = todayCompleted ? todayStr : yesterdayStr;
        currentStreak = 1;

        while (true) {
            const prevDay = getYesterdayDate(checkDate);
            if (dateSet.has(prevDay)) {
                currentStreak++;
                checkDate = prevDay;
            } else {
                break;
            }
        }
    }

    // 3. Determinar la mejor racha histórica (Best Streak)
    let bestStreak = 0;
    if (completedDates.length > 0) {
        // Orden ascendente para medir rachas continuas
        const ascDates = [...completedDates].reverse();
        let runningCount = 1;
        bestStreak = 1;

        for (let i = 1; i < ascDates.length; i++) {
            if (diffInDays(ascDates[i], ascDates[i - 1]) === 1) {
                runningCount++;
                if (runningCount > bestStreak) {
                    bestStreak = runningCount;
                }
            } else {
                runningCount = 1;
            }
        }
    }

    return {
        todayCompleted,
        currentStreak,
        bestStreak,
        totalDaysCompleted: completedDates.length,
        lastCompletedDate: completedDates[0] || null
    };
}

module.exports = {
    formatDate,
    getYesterdayDate,
    calculateStreakMetrics
};
