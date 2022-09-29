import * as AWS from "aws-sdk";
import { APIGatewayProxyResult, DynamoDBStreamEvent } from "aws-lambda";
import { Converter } from "aws-sdk/clients/dynamodb";
import { URL } from "url";
import { OrderType } from "./common/types";
import commonResponse from "./common/commonResponse";

const TABLE_NAME = process.env.TABLE_NAME || "";
const WEBSOCKET_ENDPOINT = process.env.WEBSOCKET_ENDPOINT || "";

const db = new AWS.DynamoDB.DocumentClient();

export const handler = async (
  event: DynamoDBStreamEvent
): Promise<APIGatewayProxyResult> => {
  console.debug(`event`, JSON.stringify(event, undefined, 2));

  const { Records } = event;
  if (!Records || !Records.length)
    return commonResponse(400, "No records found");
  const record = Records[0];
  if (!record.dynamodb || !record.dynamodb.NewImage)
    return commonResponse(400, "No new image found");

  const orders = event.Records.map((r) => {
    if (r.dynamodb?.NewImage) return Converter.unmarshall(r.dynamodb.NewImage);
    else return null;
  }).filter((x) => x) as OrderType[];
  console.debug(`orders`, JSON.stringify(orders, undefined, 2));

  const connectionData = await db
    .scan({ TableName: TABLE_NAME, ProjectionExpression: "connectionId" })
    .promise();
  const endpointUrl = new URL(`${WEBSOCKET_ENDPOINT}/dev`);

  const apigwManagementApi = new AWS.ApiGatewayManagementApi({
    endpoint: endpointUrl.host + endpointUrl.pathname,
  });

  const postCalls = (connectionData.Items ?? []).map(
    async ({ connectionId }) => {
      try {
        await apigwManagementApi
          .postToConnection({
            ConnectionId: connectionId,
            Data: JSON.stringify({
              action: "stream",
              payload: orders,
            }),
          })
          .promise();
      } catch (error) {
        console.error(`error`, JSON.stringify(error, undefined, 2));
      }
    }
  );

  await Promise.all(postCalls);
  return commonResponse(200, JSON.stringify({ message: "Streaming." }));
};
