import { type Health, HealthSchema } from "@{{projectName}}/types";
import { useEffect, useState } from "react";

export function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((data) => setHealth(HealthSchema.parse(data)))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  return (
    <main>
      <h1>{{projectName}}</h1>
      {error && <p className="error">api error: {error}</p>}
      {health && <p>api ok — uptime {health.uptime?.toFixed(1)}s</p>}
    </main>
  );
}
