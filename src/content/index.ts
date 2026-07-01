import { InlineAutocompleteController } from "./InlineAutocompleteController";
import { logger } from "../utils/logger";

const controller = new InlineAutocompleteController();

void controller.start().catch((error) => {
  logger.error("Failed to initialize inline autocomplete.", error);
});
