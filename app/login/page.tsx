"use client";

import { Box, Button, Callout, Card, Container, Flex, Heading, Text, TextField } from "@radix-ui/themes";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.replace("/");
        router.refresh();
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Incorrect password");
      setLoading(false);
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  }

  return (
    <Container size="1" p="5" style={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        style={{ width: "100%" }}
      >
        <Card size="4">
          <form onSubmit={submit}>
            <Flex direction="column" gap="3">
              <Box>
                <Heading size="5">Scoring &amp; Experiments</Heading>
                <Text size="2" color="gray">Enter the password to continue.</Text>
              </Box>
              <TextField.Root
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                aria-label="Password"
              />
              {error && (
                <Callout.Root color="red" size="1">
                  <Callout.Text>{error}</Callout.Text>
                </Callout.Root>
              )}
              <Button type="submit" disabled={loading || password.length === 0}>
                {loading ? "Checking…" : "Unlock"}
              </Button>
            </Flex>
          </form>
        </Card>
      </motion.div>
    </Container>
  );
}
