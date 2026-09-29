import express from "express";
import fs from "fs";
import os from "os";
import { execSync } from "child_process";
import { v4 as uuid } from "uuid";

// I ristoranti disponibili per la votazione
const restaurants = [
  { id: "sakura", name: "Sakura", category: "japanese" },
  { id: "napoli", name: "Pizzeria Napoli", category: "pizza" },
  { id: "trattoria", name: "Trattoria da Mario", category: "italian" },
];

// user -> restaurantId
const votes = new Map<string, string>();

let LOG_FILE: string;
if (os.hostname().startsWith("dinner-prod")) {
  LOG_FILE = "/var/log/dinner-roulette/app.log";
} else {
  fs.mkdirSync("logs", { recursive: true });
  LOG_FILE = "logs/app.log";
}

function log(message: string) {
  fs.appendFileSync(LOG_FILE, `${new Date().toISOString()} ${message}\n`);
}

export const app = express();
app.use(express.json());

app.use((req, _res, next) => {
  log(`[${uuid()}] ${req.method} ${req.url}`);
  next();
});

app.post("/votes", (req, res) => {
  const { user, restaurantId } = req.body ?? {};
  if (!user || !restaurantId) {
    res.status(400).json({ error: "user e restaurantId sono obbligatori" });
    return;
  }
  if (!restaurants.find((r) => r.id === restaurantId)) {
    res.status(404).json({ error: `ristorante ${restaurantId} sconosciuto` });
    return;
  }
  votes.set(user, restaurantId);
  log(`voto di ${user} per ${restaurantId}`);
  res.status(201).json({ user, restaurantId });
});

app.get("/suggestion", (_req, res) => {
  const counts = new Map<string, number>();
  for (const restaurantId of votes.values()) {
    counts.set(restaurantId, (counts.get(restaurantId) ?? 0) + 1);
  }

  let candidates = restaurants;
  if (counts.size > 0) {
    const max = Math.max(...counts.values());
    candidates = restaurants.filter((r) => counts.get(r.id) === max);
  }

  const winner = candidates[Math.floor(Math.random() * candidates.length)];
  res.json({ restaurant: winner, votes: counts.get(winner.id) ?? 0 });
});

app.get("/version", (_req, res) => {
  const commit = execSync("git rev-parse HEAD").toString().trim();
  res.json({ commit });
});
