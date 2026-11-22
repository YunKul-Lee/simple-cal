import { setupWorker } from 'msw/browser'
import { createDb } from './db'
import { createHandlers } from './handlers'

export const worker = setupWorker(...createHandlers(createDb(localStorage)))
