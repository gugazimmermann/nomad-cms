import * as AWS from "aws-sdk";
import { DynamoDBStreamEvent } from "aws-lambda";
import { createResponse } from "./utils";
import { ItemType } from "./types";
import { Converter } from "aws-sdk/clients/dynamodb";

const TABLE_NAME = process.env.TABLE_NAME || "";
const WEBSOCKET_ENDPOINT = process.env.WEBSOCKET_ENDPOINT || "";

const db = new AWS.DynamoDB.DocumentClient();

export const handler = async (event: DynamoDBStreamEvent) => {
  console.debug(`event`, JSON.stringify(event, undefined, 2));

  const { Records } = event;
  if (!Records || !Records.length) return createResponse(400, "No records found");
  const record = Records[0];
  if (!record.dynamodb || !record.dynamodb.NewImage) return createResponse(400, "No new image found");

  const orders = event.Records.map((r) => {
    if (r.dynamodb?.NewImage) return Converter.unmarshall(r.dynamodb.NewImage);
    else return null;
  }).filter(x => x) as ItemType[];
  console.debug(`orders`, JSON.stringify(orders, undefined, 2));

  const connectionData = await db.scan({ TableName: TABLE_NAME, ProjectionExpression: 'connectionId' }).promise();
  const endpointUrl = new URL(`${WEBSOCKET_ENDPOINT}/dev`);


  const apigwManagementApi = new AWS.ApiGatewayManagementApi({ endpoint: endpointUrl.host + endpointUrl.pathname });
  console.debug(`apigwManagementApi`, JSON.stringify(apigwManagementApi, undefined, 2));

  const postCalls = (connectionData.Items ?? []).map(async ({ connectionId }) => {
    try {
      await apigwManagementApi
        .postToConnection({
          ConnectionId: connectionId,
          Data: JSON.stringify({
            action: 'stream',
            payload: orders,
          }),
        })
        .promise();
    } catch (error: any) {
      console.error(`error`, JSON.stringify(error, undefined, 2));
      if (error.statusCode === 410) {
        console.log(`Found stale connection, deleting ${connectionId}`);
        await db.delete({ TableName: TABLE_NAME, Key: { connectionId } }).promise();
      } else {
        throw error;
      }
    }
  });

  await Promise.all(postCalls);
};
