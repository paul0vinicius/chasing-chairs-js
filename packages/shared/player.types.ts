import { z } from 'zod'

// Basic Data Shapes
export const PlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  isSitting: z.boolean(),
  position: z.object({ x: z.number(), y: z.number() }),
  speed: z.number(),
})

export type Player = z.infer<typeof PlayerSchema>
