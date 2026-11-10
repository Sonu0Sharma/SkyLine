// frontend/src/services/api.js
import axios from "axios";

/**
 * Small API wrapper for mock-interview endpoints.
 * Uses fallback logic: try "/api/..." then "/..."
 */

const instance = axios.create({
  timeout: 20000,
  headers: {
    "Content-Type": "application/json"
  }
});

async function _postWithFallback(paths = [], payload = {}) {
  let lastErr = null;
  for (const p of paths) {
    try {
      const res = await instance.post(p, payload);
      return res.data;
    } catch (err) {
      lastErr = err;
      // try next
    }
  }
  throw lastErr || new Error("No reachable endpoint");
}

export default {
  /**
   * Start a new session for a role.
   * returns backend response data (not wrapped)
   */
  async startSession(role, opts = { use_llm: false }) {
    const payload = { role, use_llm: opts.use_llm };
    const paths = ["/api/mock/start", "/mock/start"];
    const data = await _postWithFallback(paths, payload);
    return data;
  },

  /**
   * Get current question for a session
   */
  async getQuestion(session_id) {
    const payload = { session_id };
    const paths = ["/api/mock/question", "/mock/question"];
    const data = await _postWithFallback(paths, payload);
    return data;
  },

  /**
   * Submit answer for current question and get evaluation + next question
   * returns backend response data
   */
  async submitAnswer(session_id, answer) {
    const payload = { session_id, answer };
    const paths = ["/api/mock/answer", "/mock/answer"];
    const data = await _postWithFallback(paths, payload);
    return data;
  }
};
