import express from 'express'
import type {Router} from 'express'
import rateLimit from "express-rate-limit";

import { login, logout } from '../controllers/authController.js'
import { refresh } from '../controllers/authController.js'
import { verifyCsrf } from '../middleware/csrfMiddleware.js';

export const loginRouter:Router = express.Router()
const loginRateLimit = rateLimit({
    windowMs: 60 * 1000, // 15 minutes
	limit: 5, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
	standardHeaders: 'draft-8', // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
})

loginRouter.post('/login', loginRateLimit, login)
loginRouter.post('/refresh', verifyCsrf, refresh)
loginRouter.post('/logout', verifyCsrf, logout)