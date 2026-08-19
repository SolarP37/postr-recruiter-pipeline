export type WorkerEnvironment = Readonly<Record<string, string | undefined>>;

function boundedInteger(value: string | undefined, fallback: number, minimum: number, maximum: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
}

function agentEnvironmentKey(agentId: string, suffix: string) {
  return `AGENT_${agentId.replaceAll("-", "_").toUpperCase()}_${suffix}`;
}

export function getAgentExecutionPolicy(agentId: string, env: WorkerEnvironment = process.env) {
  return {
    maxPerWorkerRun: boundedInteger(env[agentEnvironmentKey(agentId, "MAX_PER_RUN")], 1, 1, 10),
    activeQueueLimit: boundedInteger(env[agentEnvironmentKey(agentId, "QUEUE_LIMIT")], 25, 1, 250),
  };
}

export function getPerAgentExecutionLimits(agentIds: readonly string[], env: WorkerEnvironment = process.env) {
  return Object.fromEntries(agentIds.map((agentId) => [agentId, getAgentExecutionPolicy(agentId, env).maxPerWorkerRun]));
}

export function getAgentWorkerConfig(env: WorkerEnvironment = process.env) {
  return {
    maxJobsPerRun: boundedInteger(env.AGENT_MAX_JOBS_PER_RUN, 3, 1, 10),
    staleLockMinutes: boundedInteger(env.AGENT_STALE_LOCK_MINUTES, 15, 5, 120),
    queueLimit: boundedInteger(env.AGENT_QUEUE_LIMIT, 100, 10, 1000),
  };
}
