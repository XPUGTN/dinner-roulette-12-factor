import { test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../src/server";

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
