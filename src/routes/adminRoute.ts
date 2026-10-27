import express from 'express'
import type {Router} from 'express'

import { createUser, getTeachers } from '../controllers/userController.js'
import { createClassroom } from '../controllers/classroomController.js'

export const adminRouter:Router = express.Router()

adminRouter.post('/createUser', createUser)
adminRouter.post('/classrooms/createClassroom', createClassroom)
adminRouter.get('/teachers', getTeachers)