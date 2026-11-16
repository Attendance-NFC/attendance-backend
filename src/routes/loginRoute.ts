import express from 'express'
import type {Router} from 'express'

import { login, logout } from '../controllers/loginController.js'
import { refresh } from '../controllers/tokenController.js'

export const loginRouter:Router = express.Router()

loginRouter.post('/login', login)
loginRouter.post('/refresh', refresh)
loginRouter.post('/logout', logout)