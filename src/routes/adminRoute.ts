import express from 'express'
import type {Router} from 'express'

import { createUser, getTeachers } from '../controllers/userController.js'
import { createClassroom, getClassrooms, getRooms, createSchedule } from '../controllers/classroomController.js'

export const adminRouter:Router = express.Router()

adminRouter.post('/createUser', createUser)
adminRouter.post('/classrooms/createClassroom', createClassroom)
adminRouter.post('/schedule/createSchedule', createSchedule)


adminRouter.get('/teachers', getTeachers)
adminRouter.get('/classrooms', getClassrooms)
adminRouter.get('/rooms', getRooms)