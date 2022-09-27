const headers = { 'Access-Control-Allow-Origin': '*' }

export const createResponse = (status: number, message: string) => ({
  statusCode: status,
  headers,
  body: message
});