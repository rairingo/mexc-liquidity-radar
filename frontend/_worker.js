export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const targetUrl = `http://160.248.1.157:8000${url.pathname}${url.search}`;

    const headers = new Headers(request.headers);
    headers.set("X-Forwarded-Host", url.host);
    headers.set("X-Forwarded-Proto", "https");

    const newRequest = new Request(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.body,
      redirect: "manual",
    });

    try {
      const response = await fetch(newRequest);
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } catch (err) {
      return new Response("Gateway Connection Error", { status: 502 });
    }
  }
};
