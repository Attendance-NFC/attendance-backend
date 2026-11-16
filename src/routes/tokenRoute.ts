import express from 'express'
import type {Router} from 'express'

import { generateAccessToken,  generateRefreshToken, authenticateToken, requireRole} from '../controllers/tokenController.js'


export const tokenRouter:Router = express.Router()
