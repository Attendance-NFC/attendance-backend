import type { Request, Response } from "express";
import { docClient } from "../db.js"
import { PutCommand, ScanCommand, BatchWriteCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb"
import type { AuthenticatedRequest } from "../middleware/authenticateToken.js";

export async function createRoomAccess(req: AuthenticatedRequest, res: Response) {
  try {
    const { roomId, userIds } = req.body as { roomId?: string; userIds?: string[] };

    if (!roomId || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const chunks: string[][] = [];
    for (let i = 0; i < userIds.length; i += 25) {
      chunks.push(userIds.slice(i, i + 25));
    }

    for (const chunk of chunks) {
      await docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            ['room_access_table']: chunk.map((userId) => ({
              PutRequest: {
                Item: {
                  room_id: roomId,
                  user_id: userId,
                  granted_by: req.user?.user_id, // from authenticateToken, since this route sits behind it
                  granted_at: new Date().toISOString(),
                },
              },
            })),
          },
        })
      );
    }

    return res.status(201).json({ success: true, granted: userIds.length });
  } catch (err) {
    console.error("createRoomAccess failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getRooms(req: Request, res: Response){
    try{
        const command = new ScanCommand({
            TableName: "rooms_table"
        })

        const result = await docClient.send(command);
        console.log("Success:", result);
        return res.status(200).json(result.Items ?? []);
    } catch (err) {
        console.error("Get rooms failed:", err);
        return res.status(500).json({ error: "Something went wrong. Try again." });
    }
}

export async function deleteRoomAccess(req: AuthenticatedRequest, res: Response) {
  try {
    const { roomId, userId } = req.params;

    if (!roomId || !userId) {
      return res.status(400).json({ error: "Missing room or user id" });
    }

    await docClient.send(
      new DeleteCommand({
        TableName: 'room_access_table',
        Key: { room_id: roomId, user_id: userId },
      })
    );

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("deleteRoomAccess failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
