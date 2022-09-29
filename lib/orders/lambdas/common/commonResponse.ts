const headers = { "Access-Control-Allow-Origin": "*" };

const commonResponse = (status: number, message: string) => ({
  statusCode: status,
  headers,
  body: message,
});

export default commonResponse;
