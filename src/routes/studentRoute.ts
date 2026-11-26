import express from 'express'
import type {Router} from 'express'
import { getMyProfile } from '../controllers/profileController.js'
import { authenticateToken, requireRole } from '../middleware/authenticateToken.js'




export const studentRouter:Router = express.Router()
studentRouter.get('/', authenticateToken, requireRole("student"), getMyProfile)