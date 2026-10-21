export async function api(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`/api${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
      signal: options.signal || controller.signal,
      ...(options.body ? { body: JSON.stringify(options.body) } : {})
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message || 'Could not load data.');
    return result;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The server did not respond in time. Please try again.');
    if (error instanceof TypeError) throw new Error('Cannot reach the server. Check your connection.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
