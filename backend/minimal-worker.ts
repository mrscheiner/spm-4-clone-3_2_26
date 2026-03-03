export default {
  async fetch(_request: Request) {
    return new Response('ok', { status: 200 });
  },
};
