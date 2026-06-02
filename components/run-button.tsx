"use client";

import { CheckIcon } from "@radix-ui/react-icons";
import { Button, Spinner } from "@radix-ui/themes";
import { AnimatePresence, motion } from "motion/react";

type Status = "idle" | "loading" | "success";

export function RunButton({ status, onRun }: { status: Status; onRun: () => void }) {
  return (
    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} style={{ display: "inline-block" }}>
      <Button onClick={onRun} disabled={status === "loading"} variant="solid">
        <AnimatePresence mode="wait" initial={false}>
          {status === "loading" ? (
            <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Spinner />
            </motion.span>
          ) : status === "success" ? (
            <motion.span
              key="success"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              style={{ display: "inline-flex" }}
            >
              <CheckIcon />
            </motion.span>
          ) : (
            <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              Run
            </motion.span>
          )}
        </AnimatePresence>
      </Button>
    </motion.div>
  );
}
