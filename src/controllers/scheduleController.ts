import type { Request, Response } from "express";
import { docClient } from "../db.js"
import { PutCommand, ScanCommand, BatchWriteCommand } from "@aws-sdk/lib-dynamodb"
import { randomUUID } from "crypto"
import type { AuthenticatedRequest } from "./tokenController.js";

export async function createSchedule(req: Request, res: Response){
    try{
        const { roomName, classroomId, dayOfWeek, startTime, endTime } = req.body as { roomName: string; classroomId: string; dayOfWeek: string; startTime: string; endTime: string; }

        if (!roomName || !classroomId || !dayOfWeek || !startTime || !endTime){
            return res.status(400).json({ error: "Missing required fields" });
        }

        const command = new PutCommand({
            TableName: "schedules_table",
            Item: {
                room_id: roomName,
                classroom_id: classroomId,
                day_time: dayOfWeek,
                start_time: startTime,
                end_time: endTime
            }
        })

        const response = await docClient.send(command);
        console.log("Success:", response);
        return res.status(201).json({ success: true }); 

    } catch (err){
        console.error("Create Schedule error:", err);
        return res.status(500).json({ error: "Something went wrong. Try again." });
    }
}

