/**
 * Comparator encoding the QA queue priority rule: lower active load wins;
 * ties are broken by whoever has gone longest without an assignment (never
 * assigned — lastAssignedAt null — sorts first). This is the ONE place the
 * rule is expressed; pickReviewer (who actually gets assigned) and
 * qaRequestsService's member-queue ranking (what the dashboard displays as
 * "next in line") both sort with this exact function, so the displayed order
 * and the real assignment algorithm can never drift apart.
 *
 * Pure — no I/O. Safe to unit test in isolation.
 *
 * @param {{activeLoad: number, lastAssignedAt: Date|string|null}} a
 * @param {{activeLoad: number, lastAssignedAt: Date|string|null}} b
 * @returns {number}
 */
function compareByQueuePriority(a, b) {
  if (a.activeLoad !== b.activeLoad) {
    return a.activeLoad - b.activeLoad;
  }

  const aTime = a.lastAssignedAt ? new Date(a.lastAssignedAt).getTime() : 0;
  const bTime = b.lastAssignedAt ? new Date(b.lastAssignedAt).getTime() : 0;
  return aTime - bTime;
}

/**
 * Elige el revisor de QA para un ticket: excluye a quien no debe ser elegido
 * (típicamente el solicitante, y en una reasignación también a quien(es) ya
 * rechazaron la solicitud), prioriza menor carga activa y desempata por quien
 * lleva más tiempo sin recibir un QA (nunca asignado = máxima prioridad).
 *
 * Pure function — no I/O, no DB, no Express. Safe to unit test in isolation.
 *
 * @param {Array<{id: string, activeLoad: number, lastAssignedAt: Date|string|null}>} candidates
 * @param {string[]} excludeMemberIds
 * @returns {{id: string, activeLoad: number, lastAssignedAt: Date|string|null} | null}
 */
function pickReviewer(candidates, excludeMemberIds) {
  const excluded = new Set(excludeMemberIds || []);
  const eligible = (candidates || []).filter((c) => !excluded.has(c.id));

  if (eligible.length === 0) {
    return null;
  }

  return eligible.slice().sort(compareByQueuePriority)[0];
}

module.exports = { pickReviewer, compareByQueuePriority };
