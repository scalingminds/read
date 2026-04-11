const { Readability } = require("@mozilla/readability");
const { JSDOM } = require("jsdom");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const { url } = JSON.parse(event.body);

  if (!url) {
    return { statusCode: 400, body: JSON.stringify({ error: "No URL provided" }) };
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: `Failed to fetch URL: ${response.status}` }),
      };
    }

    const html = await response.text();
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Could not extract article content from this URL" }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: article.title,
        text: article.textContent.trim(),
        excerpt: article.excerpt,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
