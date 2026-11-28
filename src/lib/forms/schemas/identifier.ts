import { z } from 'zod'

// Postgres accepts UUIDs independently of their version and variant bits.
export const identifierSchema = z.guid()
