import express from "express";
import fs from "fs";
import os from "os";
import { execSync } from "child_process";
import { v4 as uuid } from "uuid";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

type Restaurant = { id: string; name: string; category: string; votes: number };

type FindRestaurantFn = (id: string) => Promise<Restaurant | undefined>;

export const findRestaurantBy: FindRestaurantFn = async (id) => {
  const result = await pool.query<Restaurant>(
    "SELECT * FROM restaurants WHERE id = $1",
    [id],
  );
  return result.rows[0];
}

type VoteRestaurantFn = (id: string) => Promise<void>;

export const voteRestaurantBy: VoteRestaurantFn = async (id) => {
  await pool.query(
    "UPDATE restaurants SET votes = votes + 1 WHERE id = $1",
    [id],
  );
}

type FindMostVotedRestaurantsFn = () => Promise<Restaurant[]>;

export const findMostVotedRestaurants: FindMostVotedRestaurantsFn = async () => {
  const restaurants = await pool.query<Restaurant>(
    "SELECT * FROM restaurants WHERE votes = (SELECT MAX(votes) FROM restaurants)"
  );
  return restaurants.rows
}

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

export function startApp(
    findRestaurantBy: FindRestaurantFn,
    voteRestaurant: VoteRestaurantFn,
    findMostVotedRestaurants: FindMostVotedRestaurantsFn,
) {
  const app = express();
  app.use(express.json());

  app.use((req, _res, next) => {
    log(`[${uuid()}] ${req.method} ${req.url}`);
    next();
  });

  app.post("/votes", async (req, res) => {
    const { user, restaurantId } = req.body ?? {};
    if (!user || !restaurantId) {
      res.status(400).json({ error: "user e restaurantId sono obbligatori" });
      return;
    }
    if (!await findRestaurantBy(restaurantId)) {
      res.status(404).json({ error: `ristorante ${restaurantId} sconosciuto` });
      return;
    }

    await voteRestaurant(restaurantId);
    log(`voto di ${user} per ${restaurantId}`);
    res.status(201).json({ user, restaurantId });
  });

  app.get("/suggestion", async (_req, res) => {
    const candidates = await findMostVotedRestaurants()

    const winner = candidates[Math.floor(Math.random() * candidates.length)];
    res.json({ restaurant: winner, votes: winner.votes });
  });

  app.get("/version", (_req, res) => {
    const commit = execSync("git rev-parse HEAD").toString().trim();
    res.json({ commit });
  });

  return app;
}