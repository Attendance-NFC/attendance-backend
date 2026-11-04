import "dotenv/config";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-east-2" });
const docClient = DynamoDBDocumentClient.from(client);

export const main = async () => {
  console.log("Sending PutCommand...");
  const command = new PutCommand({
    TableName: "insert-read-testing",
    Item: {
      user_id: 1,
      user_name: "testing",
    },
  });

  const response = await docClient.send(command);
  console.log("Success:", response);
  return response;
};

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});