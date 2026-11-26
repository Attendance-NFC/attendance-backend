import type { Request, Response } from "express";
import { docClient } from "../db.js"
import { PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb"
import type { AuthenticatedRequest } from "../middleware/authenticateToken.js";

const SCHEDULE_TABLE = process.env.SCHEDULE_TABLE ?? "schedules_table";

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
                day_time: `${dayOfWeek}#${startTime}`,
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

export async function deleteSchedule(req: AuthenticatedRequest, res: Response) {
  try {
    const { roomId, day, startTime } = req.params;

    if (!roomId || !day || !startTime) {
      return res.status(400).json({ error: "Missing room, day, or start time" });
    }

    const dayTime = `${day}#${startTime}`; // reconstruct the sort key, same format used when creating it

    await docClient.send(
      new DeleteCommand({
        TableName: SCHEDULE_TABLE,
        Key: { room_id: roomId, day_time: dayTime },
      })
    );

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("deleteSchedule failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}