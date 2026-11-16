import assert from "node:assert/strict";
import test from "node:test";
import { matchSpokenTransportChoice, parseSpokenTransportResultAction } from "../src/discord/transport-voice.js";

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
