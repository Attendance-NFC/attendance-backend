import {
  GetCommand,
  QueryCommand,
  BatchGetCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient } from "../db.js";


const USERS_TABLE = process.env.USERS_TABLE ?? "users_table";
const CARDS_TABLE = process.env.CARDS_TABLE ?? "cards_table";
const ENROLLMENTS_TABLE = process.env.ENROLLMENTS_TABLE ?? "enrollments_table";
const CLASSROOMS_TABLE = process.env.CLASSROOMS_TABLE ?? "classrooms_table";
const SCHEDULE_TABLE = process.env.SCHEDULE_TABLE ?? "schedules_table";
const ROOM_ACCESS_TABLE = process.env.ROOM_ACCESS_TABLE ?? "room_access_table";
const ROOMS_TABLE = process.env.ROOMS_TABLE ?? "rooms_table";

type CardInfo = { card_id: string; status: string };

export type UserProfileResult = {
  user: {
    user_id: string;
    name: string;
    email: string;
    role: string;
    status: string;
  };
  card: CardInfo | null;
  classrooms: {
    classroom_id: string;
    class_name: string;
    room_id: string;
    day_of_week: string;
    start_time: string;
    end_time: string;
  }[];
  roomAccess: { room_id: string; building_id: string }[];
};

/**
 * Assembles the full profile for one user — their record, card,
 * enrolled classrooms (with schedule details), and direct room access
 * grants. Used by both the admin's "view any user" endpoint and the
 * self-service "view my own profile" endpoint — same data shape either
 * way, just a different source for which userId to look up.
 */
export async function fetchUserProfile(
  userId: string
): Promise<UserProfileResult | null> {
  const userResult = await docClient.send(
    new GetCommand({ TableName: USERS_TABLE, Key: { user_id: userId } })
  );

  if (!userResult.Item) {
    return null;
  }

  const cardResult = await docClient.send(
    new QueryCommand({
      TableName: CARDS_TABLE,
      IndexName: "user_card_index",
      KeyConditionExpression: "user_id = :userId",
      ExpressionAttributeValues: { ":userId": userId },
    })
  );
  const card = (cardResult.Items?.[0] as CardInfo | undefined) ?? null;

  const enrollmentsResult = await docClient.send(
    new QueryCommand({
      TableName: ENROLLMENTS_TABLE,
      IndexName: "user_classrooms_index",
      KeyConditionExpression: "user_id = :userId",
      ExpressionAttributeValues: { ":userId": userId },
    })
  );
  const classroomIds: string[] = [
    ...new Set(enrollmentsResult.Items?.map((item) => item.classroom_id) ?? []),
  ];

  let classrooms: UserProfileResult["classrooms"] = [];

  if (classroomIds.length > 0) {
    const classroomsResult = await docClient.send(
      new BatchGetCommand({
        RequestItems: {
          [CLASSROOMS_TABLE]: { Keys: classroomIds.map((id) => ({ classroom_id: id })) },
        },
      })
    );
    const classroomsById = Object.fromEntries(
      (classroomsResult.Responses?.[CLASSROOMS_TABLE] ?? []).map((c) => [
        c.classroom_id,
        c,
      ])
    );

    const scheduleResults = await Promise.all(
      classroomIds.map((id) =>
        docClient.send(
          new QueryCommand({
            TableName: SCHEDULE_TABLE,
            IndexName: "classroom_schedule_index",
            KeyConditionExpression: "classroom_id = :id",
            ExpressionAttributeValues: { ":id": id },
          })
        )
      )
    );

    classrooms = classroomIds.flatMap((id, i) => {
      const className = classroomsById[id]?.class_name ?? "Unknown";
      const scheduleItems = scheduleResults[i]?.Items ?? [];

      return scheduleItems.map((s) => ({
        classroom_id: id,
        class_name: className,
        room_id: s.room_id,
        day_of_week: s.day_time?.split("#")[0] ?? "—",
        start_time: s.start_time ?? "—",
        end_time: s.end_time ?? "—",
      }));
    });
  }

  const roomAccessResult = await docClient.send(
    new QueryCommand({
      TableName: ROOM_ACCESS_TABLE,
      IndexName: "user_room_access_index",
      KeyConditionExpression: "user_id = :userId",
      ExpressionAttributeValues: { ":userId": userId },
    })
  );
  const roomIds: string[] = [
    ...new Set(roomAccessResult.Items?.map((item) => item.room_id) ?? []),
  ];

  let roomAccess: UserProfileResult["roomAccess"] = [];

  if (roomIds.length > 0) {
    const roomsResult = await docClient.send(
      new BatchGetCommand({
        RequestItems: {
          [ROOMS_TABLE]: { Keys: roomIds.map((id) => ({ room_id: id })) },
        },
      })
    );
    const roomsById = Object.fromEntries(
      (roomsResult.Responses?.[ROOMS_TABLE] ?? []).map((r) => [r.room_id, r])
    );

    roomAccess = roomIds.map((id) => ({
      room_id: id,
      building_id: roomsById[id]?.building_id ?? "Unknown",
    }));
  }

  return {
    user: {
      user_id: userResult.Item.user_id,
      name: userResult.Item.name,
      email: userResult.Item.email,
      role: userResult.Item.role,
      status: userResult.Item.status,
      // password_hash deliberately excluded — never sent to the frontend
    },
    card,
    classrooms,
    roomAccess,
  };
}

