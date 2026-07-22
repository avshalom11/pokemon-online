import * as z from "zod";

export const selectStarterSchema = z.object({
  speciesId: z.string().min(1, { error: "יש לבחור פוקימון." }),
});
