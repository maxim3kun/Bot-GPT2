import assert from "node:assert/strict";
import test from "node:test";
import { matchSpokenTransportChoice, parseSpokenTransportResultAction, parseSpokenTransportTimeRequest } from "../src/discord/transport-voice.js";

test("Spoken choices resolve one exact or uniquely matching transport option", () => {
  const choices = [
    { label: "601 · Amiens – Gare routière → Beauvais", value: "0" },
    { label: "602 · Beauvais → Clermont", value: "1" },
  ];
  assert.equal(matchSpokenTransportChoice("ligne 601", choices), "0");
  assert.equal(matchSpokenTransportChoice("Amiens", choices), "0");
  assert.equal(matchSpokenTransportChoice("la", choices), null);
});

test("Ambiguous spoken names are not guessed", () => {
  const choices = [
    { label: "Paris · France", value: "0" },
    { label: "Paris · Canada", value: "1" },
  ];
  assert.equal(matchSpokenTransportChoice("Paris", choices), null);
});

test("Common timetable-card actions have explicit spoken aliases", () => {
  assert.equal(parseSpokenTransportResultAction("agrandir"), "more");
  assert.equal(parseSpokenTransportResultAction("voir les arrêts"), "stops");
  assert.equal(parseSpokenTransportResultAction("trajet retour"), "return");
  assert.equal(parseSpokenTransportResultAction("annule la recherche"), "cancel");
  assert.equal(parseSpokenTransportResultAction("page suivante"), "nextPage");
  assert.equal(parseSpokenTransportResultAction("page précédente"), "previousPage");
  assert.equal(parseSpokenTransportResultAction("peut-être plus tard"), null);
});

test("Spoken timetable options recognize departure, transfer and minimum-wait requests", () => {
  assert.deepEqual(parseSpokenTransportTimeRequest("Je veux partir à 8 h 30"), {
    kind: "departure", time: "08:30",
  });
  assert.deepEqual(parseSpokenTransportTimeRequest("Le deuxième train à 11 heures"), {
    kind: "connection", time: "11:00",
  });
  assert.deepEqual(parseSpokenTransportTimeRequest("Attente minimale de douze minutes"), {
    kind: "wait", minutes: 12,
  });
  assert.deepEqual(parseSpokenTransportTimeRequest("I want to leave at 9:15"), {
    kind: "departure", time: "09:15",
  });
});

test("Invalid spoken times and unsupported requests are not guessed", () => {
  assert.deepEqual(parseSpokenTransportTimeRequest("Départ à 25 h 90"), {
    kind: "departure", time: null,
  });
  assert.deepEqual(parseSpokenTransportTimeRequest("attente de 400 minutes"), {
    kind: "wait", minutes: null,
  });
  assert.equal(parseSpokenTransportTimeRequest("on prend le bus"), null);
});
