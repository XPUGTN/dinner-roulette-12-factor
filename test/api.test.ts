import { test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import {startApp} from "../src/server";

const restaurants = [
  { id: "sakura", name: "Sakura", category: "japanese", votes: 0 },
  { id: "napoli", name: "Pizzeria Napoli", category: "pizza", votes: 0 },
  { id: "trattoria", name: "Trattoria da Mario", category: "italian", votes: 0 },
];

const app = startApp(
  async (id) => {
    return restaurants.find((r) => r.id === id)
  },
  async (id) => {
    const restaurant = restaurants.find((r) => r.id === id)
    if (restaurant) {
      restaurant.votes++
    }
  },
  async () => {
    const maxVotes = Math.max(...restaurants.map((r) => r.votes))
    return restaurants.filter((r) => r.votes === maxVotes)
  }
)

test("POST /votes registra un voto", async () => {
  const res = await request(app).post("/votes").send({ user: "alice", restaurantId: "sakura" });
  assert.equal(res.status, 201);
});

test("POST /votes rifiuta un ristorante sconosciuto", async () => {
  const res = await request(app).post("/votes").send({ user: "bob", restaurantId: "mcdonalds" });
  assert.equal(res.status, 404);
});

test("GET /suggestion restituisce il ristorante più votato", async () => {
  await request(app).post("/votes").send({ user: "carol", restaurantId: "sakura" });
  const res = await request(app).get("/suggestion");
  assert.equal(res.status, 200);
  assert.equal(res.body.restaurant.id, "sakura");
});
