"use client";

import { Box, Code, Container, Flex, Grid, Heading, SegmentedControl, Text } from "@radix-ui/themes";
import { useState } from "react";

import { ScenarioCard } from "@/components/scenario-card";
import { ThemeToggle } from "@/components/theme-toggle";
import { scenarios, type Transport } from "@/lib/scenarios";

export default function Home() {
  const [transport, setTransport] = useState<Transport>("http");

  const scoring = scenarios.filter((s) => s.group === "scoring");
  const experiments = scenarios.filter((s) => s.group === "experiments");

  return (
    <Container size="3" p="5">
      <Flex justify="between" align="center" mb="4">
        <Box>
          <Heading size="6">Scoring &amp; Experiments</Heading>
          <Text size="2" color="gray">Fire events that trigger Inngest runs, then inspect them in the dashboard.</Text>
        </Box>
        <ThemeToggle />
      </Flex>

      <Flex align="center" gap="3" mb="4" wrap="wrap">
        <Text size="2" color="gray">Transport</Text>
        <SegmentedControl.Root
          value={transport}
          onValueChange={(v) => setTransport(v as Transport)}
          size="1"
        >
          <SegmentedControl.Item value="http">HTTP</SegmentedControl.Item>
          <SegmentedControl.Item value="connect">Connect</SegmentedControl.Item>
        </SegmentedControl.Root>
        {transport === "connect" && (
          <Text size="1" color="gray">
            Worker required — run <Code>pnpm connect</Code>
          </Text>
        )}
      </Flex>

      <Grid columns={{ initial: "1", md: "2" }} gap="4">
        <ScenarioCard title="Scoring primitives" scenarios={scoring} transport={transport} />
        <ScenarioCard title="Experiments" scenarios={experiments} transport={transport} />
      </Grid>
    </Container>
  );
}
