export const handler = async (event: any) => {
  const NEWS_API_KEY = process.env.NEWS_API_KEY;
  if (!NEWS_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "NEWS_API_KEY is not configured." }),
    };
  }

  try {
    const response = await fetch(
      `https://newsapi.org/v2/top-headlines?country=us&pageSize=5&apiKey=${NEWS_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`NewsAPI responded with ${response.status}`);
    }

    const data = await response.json();
    const articles = data.articles.map((a: any) => ({
      title: a.title,
      source: a.source.name,
      description: a.description,
      url: a.url,
      publishedAt: a.publishedAt,
    }));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(articles),
    };
  } catch (error: any) {
    console.error("News Fetch Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch news." }),
    };
  }
};