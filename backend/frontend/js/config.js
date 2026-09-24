const CONFIG = {
  API_BASE_URL: (() => {
    const host = window.location.hostname || "localhost";
    const port = window.location.port || "5001";
    const protocol = window.location.protocol || "http:";

    return `${protocol}//${host}:${port}/api`;
  })(),
};
