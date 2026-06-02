"use client";

import { CrossCircledIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import { Callout, Link } from "@radix-ui/themes";
import { AnimatePresence, motion } from "motion/react";

export type RunResult =
  | { ok: true; count: number; dashboardUrl: string }
  | { ok: false; error: string };

export function ResultCallout({ result }: { result: RunResult | null }) {
  return (
    <AnimatePresence>
      {result && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          <Callout.Root color={result.ok ? "green" : "red"} mt="3">
            <Callout.Icon>
              {result.ok ? <InfoCircledIcon /> : <CrossCircledIcon />}
            </Callout.Icon>
            <Callout.Text>
              {result.ok ? (
                <>
                  Sent {result.count} event{result.count === 1 ? "" : "s"}.{" "}
                  <Link href={result.dashboardUrl} target="_blank" rel="noreferrer">
                    View in dashboard →
                  </Link>
                </>
              ) : (
                result.error
              )}
            </Callout.Text>
          </Callout.Root>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
