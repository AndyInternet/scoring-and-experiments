"use client";

import { Box, Container, Flex, Grid, Heading, Text } from "@radix-ui/themes";

import { ScenarioCard } from "@/components/scenario-card";
import { ThemeToggle } from "@/components/theme-toggle";
import { scenarios } from "@/lib/scenarios";

export default function Home() {
  const scoring = scenarios.filter((s) => s.group === "scoring");
  const experiments = scenarios.filter((s) => s.group === "experiments");

  return (
    <Container size="3" p="5">
      <Flex justify="between" align="center" mb="5">
        <Box>
          <Heading size="6">Scoring &amp; Experiments</Heading>
          <Text size="2" color="gray">Fire events that trigger Inngest runs, then inspect them in the dashboard.</Text>
        </Box>
        <ThemeToggle />
      </Flex>
      <Grid columns={{ initial: "1", md: "2" }} gap="4">
        <ScenarioCard title="Scoring primitives" scenarios={scoring} />
        <ScenarioCard title="Experiments" scenarios={experiments} />
      </Grid>
    </Container>
  );
}
