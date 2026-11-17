import express from 'express'
import type {Router} from 'express'

import { createUser, getTeachers, getUsers, getStudents, getUserById } from '../controllers/userController.js'
import { createClassroom, getClassrooms } from '../controllers/classroomController.js'
import { getRooms, createRoomAccess, deleteRoomAccess } from '../controllers/roomController.js'
import { createEnrollments } from '../controllers/enrollmentController.js'
import { createSchedule } from '../controllers/scheduleController.js'
import { authenticateToken, requireRole } from '../controllers/tokenController.js'

export const adminRouter:Router = express.Router()

//this middleware is applied to every route defined below
adminRouter.use(authenticateToken, requireRole("admin"))

adminRouter.post('/createUser', createUser)
adminRouter.post('/classrooms/createClassroom', createClassroom)
adminRouter.post('/schedule/createSchedule', createSchedule)
adminRouter.post('/enrollments/createEnrollments', createEnrollments)
adminRouter.post('/roomAccess/createRoomAccess', createRoomAccess)
adminRouter.delete('/roomAccess/:roomId/:userId', deleteRoomAccess)

adminRouter.get('/users', getUsers)
//this route might not need auth
adminRouter.get('/users/:userId', getUserById)
adminRouter.get('/students', getStudents)
adminRouter.get('/teachers', getTeachers)
adminRouter.get('/classrooms', getClassrooms)
adminRouter.get('/rooms', getRooms)
