"use client";

import { Flex, Select, Text, TextField } from "@radix-ui/themes";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { RunButton } from "./run-button";
import { ResultCallout, type RunResult } from "./result-callout";
import type { Scenario, Transport, TriggerParams } from "@/lib/scenarios";

export function ScenarioRow({ scenario, transport }: { scenario: Scenario; transport: Transport }) {
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [result, setResult] = useState<RunResult | null>(null);
  const [count, setCount] = useState("1");
  const [userId, setUserId] = useState("user-0001");
  const [forceVariant, setForceVariant] = useState<"control" | "challenger">("control");

  // Reset-to-idle timer for the success state. Held in a ref so a fresh run (or
  // unmount) can cancel it — otherwise a stale timer could clear the status of a
  // run started within the 1.2s window.
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  async function run() {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    setStatus("loading");
    setResult(null);
    const params: TriggerParams = { count: Number(count) || 1, transport };
    if (scenario.params.includes("userId")) params.userId = userId;
    if (scenario.params.includes("forceVariant")) params.forceVariant = forceVariant;

    try {
      const res = await fetch("/api/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: scenario.key, params }),
      });
      const data = (await res.json()) as RunResult;
      setResult(data);
      setStatus(data.ok ? "success" : "idle");
      if (data.ok) resetTimer.current = setTimeout(() => setStatus("idle"), 1200);
    } catch (err) {
      setResult({ ok: false, error: err instanceof Error ? err.message : "Request failed" });
      setStatus("idle");
    }
  }

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      style={{ padding: "12px 0", borderTop: "1px solid var(--gray-a4)" }}
    >
      <Flex direction="column" gap="2">
        <Flex justify="between" align="center" gap="3" wrap="wrap">
          <Flex direction="column" gap="1" style={{ minWidth: 0 }}>
            <Text weight="medium">{scenario.label}</Text>
            <Text size="1" color="gray">{scenario.description}</Text>
          </Flex>
          <Flex align="center" gap="2">
            {scenario.params.includes("userId") && (
              <TextField.Root
                size="1"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                style={{ width: 110 }}
                aria-label="User ID"
              />
            )}
            {scenario.params.includes("forceVariant") && (
              <Select.Root value={forceVariant} onValueChange={(v) => setForceVariant(v as "control" | "challenger")}>
                <Select.Trigger aria-label="Variant" />
                <Select.Content>
                  <Select.Item value="control">control</Select.Item>
                  <Select.Item value="challenger">challenger</Select.Item>
                </Select.Content>
              </Select.Root>
            )}
            <TextField.Root
              size="1"
              type="number"
              min="1"
              max="100"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              style={{ width: 64 }}
              aria-label="Event count"
            />
            <RunButton status={status} onRun={run} />
          </Flex>
        </Flex>
        <ResultCallout result={result} />
      </Flex>
    </motion.div>
  );
}
