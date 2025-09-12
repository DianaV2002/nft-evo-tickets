import { createEventCreationTests } from "./event-creation.test";
import { createEventValidationTests } from "./event-validation.test";
import { createEventEdgeCaseTests } from "./event-edge-cases.test";

export function runAllEventTests() {
  createEventCreationTests();
  createEventValidationTests();
  createEventEdgeCaseTests();
}