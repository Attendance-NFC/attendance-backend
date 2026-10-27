import express from 'express'
import type {Router} from 'express'

import { createUser } from '../controllers/userController.js'

export const adminRouter:Router = express.Router()

adminRouter.post('/createUser', createUser)