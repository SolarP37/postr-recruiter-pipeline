import type { Agent } from "@/lib/agents/types";

export class AgentRegistry {
  private readonly agents = new Map<string, Agent>();

  register(agent: Agent): void {
    if (this.agents.has(agent.id)) throw new Error(`Agent ${agent.id} is already registered.`);
    this.agents.set(agent.id, agent);
  }

  get(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  list(): Agent[] {
    return [...this.agents.values()];
  }

  has(agentId: string): boolean {
    return this.agents.has(agentId);
  }
}
