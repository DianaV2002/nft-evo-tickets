import { createTicketCreationTests } from "./ticket-creation.test";
import { createTicketValidationTests } from "./ticket-validation.test";
import { createTicketEdgeCaseTests } from "./ticket-edge-cases.test";

export function runAllTicketTests() {
  createTicketCreationTests();
  createTicketValidationTests();
  createTicketEdgeCaseTests();
}