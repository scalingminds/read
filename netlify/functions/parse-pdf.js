const pdfParse = require("pdf-parse");
const { Buffer } = require("buffer");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    const contentType = event.headers["content-type"] || "";

    let pdfBuffer;

    if (contentType.includes("application/json")) {
      const { pdf } = JSON.parse(event.body);
      if (!pdf) {
        return { statusCode: 400, body: JSON.stringify({ error: "No PDF data in request" }) };
      }
      pdfBuffer = Buffer.from(pdf, "base64");
    } else if (contentType.includes("multipart/form-data")) {
      pdfBuffer = extractFileFromMultipart(event);
    } else if (event.isBase64Encoded) {
      pdfBuffer = Buffer.from(event.body, "base64");
    } else {
      pdfBuffer = Buffer.from(event.body, "binary");
    }

    if (!pdfBuffer || pdfBuffer.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No PDF data received" }),
      };
    }

    if (pdfBuffer.length > 10 * 1024 * 1024) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "PDF too large. Max 10MB." }),
      };
    }

    const data = await pdfParse(pdfBuffer);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: data.text.trim(),
        pages: data.numpages,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};

function extractFileFromMultipart(event) {
  const boundary = event.headers["content-type"].split("boundary=")[1];
  const body = event.isBase64Encoded
    ? Buffer.from(event.body, "base64")
    : Buffer.from(event.body);

  const bodyStr = body.toString("latin1");
  const parts = bodyStr.split(`--${boundary}`);

  for (const part of parts) {
    if (part.includes("filename=")) {
      const headerEnd = part.indexOf("\r\n\r\n");
      if (headerEnd === -1) continue;
      const content = part.substring(headerEnd + 4);
      const trimmed = content.endsWith("\r\n")
        ? content.slice(0, -2)
        : content;
      return Buffer.from(trimmed, "latin1");
    }
  }

  return null;
}
