"use client";

import { Card, Heading } from "@radix-ui/themes";

import { ScenarioRow } from "./scenario-row";
import type { Scenario, Transport } from "@/lib/scenarios";

export function ScenarioCard({
  title,
  scenarios,
  transport,
}: {
  title: string;
  scenarios: Scenario[];
  transport: Transport;
}) {
  return (
    <Card size="3">
      <Heading size="4" mb="2">{title}</Heading>
      {scenarios.map((s) => (
        <ScenarioRow key={s.key} scenario={s} transport={transport} />
      ))}
    </Card>
  );
}
