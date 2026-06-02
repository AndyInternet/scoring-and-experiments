import { NextResponse } from "next/server";

import { inngest } from "@/inngest";
import { connectInngest } from "@/inngest/connect-client";
import { dashboardRunsUrl } from "@/lib/dashboard";
import { getScenario, type TriggerParams } from "@/lib/scenarios";

export async function POST(req: Request) {
  let body: { scenario?: string; params?: TriggerParams };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const scenario = body.scenario ? getScenario(body.scenario) : undefined;
  if (!scenario) {
    return NextResponse.json({ ok: false, error: "Unknown scenario" }, { status: 400 });
  }

  const params = body.params ?? {};
  const count = Math.min(Math.max(Number(params.count ?? 1) || 1, 1), 100);

  // The connect app's functions trigger on "connect/"-prefixed events and are
  // registered under a distinct app id.
  const transport = params.transport === "connect" ? "connect" : "http";
  const eventName =
    transport === "connect" ? `connect/${scenario.event}` : scenario.event;
  const appId = transport === "connect" ? connectInngest.id : inngest.id;

  const events = Array.from({ length: count }, () => ({
    name: eventName,
    data: scenario.buildData(params),
  }));

  try {
    // Sending via either client just ingests the event; the server routes it to
    // whichever app subscribes to the (possibly prefixed) event name.
    await inngest.send(events);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send events";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    count,
    transport,
    // Each scenario key matches its function id, so the link lands on that
    // function's runs (cloud) or the global runs feed (dev server).
    dashboardUrl: dashboardRunsUrl(scenario.key, appId),
  });
}
