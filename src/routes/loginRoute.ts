import express from 'express'
import type {Router} from 'express'

import { login } from '../controllers/loginController.js'

export const loginRouter:Router = express.Router()

loginRouter.post('/login', login)