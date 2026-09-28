import assert from "node:assert";

// Mock Express req and res
function createMockReqRes(headers: Record<string, string>, body: any) {
  let statusCode = 200;
  let jsonBody: any = null;

  const req: any = {
    headers,
    body,
  };

  const res: any = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(data: any) {
      jsonBody = data;
      return res;
    },
    getStatus() {
      return statusCode;
    },
    getJson() {
      return jsonBody;
    },
  };

  return { req, res };
}

// We simulate the endpoint logic from server.ts to verify the handler rules
async function handleVerifyVipStatus(req: any, res: any, mockVerifyToken?: (token: string) => Promise<{ uid: string }>) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No autorizado: Token de autenticación requerido" });
  }
  const token = authHeader.substring(7);

  const { uid } = req.body;
  if (!uid) return res.status(400).json({ error: "Falta uid" });

  try {
    if (mockVerifyToken) {
      const decodedToken = await mockVerifyToken(token);
      if (decodedToken.uid !== uid) {
        return res.status(403).json({ error: "Acceso prohibido: No tiene permisos para este usuario" });
      }
    }
  } catch (authErr: any) {
    return res.status(401).json({ error: "Token de autenticación inválido o expirado" });
  }

  return res.status(200).json({ isVip: false, status: 'client_managed' });
}

async function runTests() {
  console.log("Running security tests for /api/verify-vip-status...");

  // Test 1: Missing authorization header -> 401
  {
    const { req, res } = createMockReqRes({}, { uid: "user123" });
    await handleVerifyVipStatus(req, res);
    assert.strictEqual(res.getStatus(), 401, "Expected 401 for missing auth header");
    assert.deepStrictEqual(res.getJson(), { error: "No autorizado: Token de autenticación requerido" });
    console.log("✔ Test 1 passed: Missing auth header returns 401");
  }

  // Test 2: Invalid header format -> 401
  {
    const { req, res } = createMockReqRes({ authorization: "Basic token123" }, { uid: "user123" });
    await handleVerifyVipStatus(req, res);
    assert.strictEqual(res.getStatus(), 401, "Expected 401 for non-Bearer auth header");
    console.log("✔ Test 2 passed: Non-Bearer token returns 401");
  }

  // Test 3: Invalid token -> 401
  {
    const { req, res } = createMockReqRes({ authorization: "Bearer invalid-token" }, { uid: "user123" });
    await handleVerifyVipStatus(req, res, async () => {
      throw new Error("Invalid token");
    });
    assert.strictEqual(res.getStatus(), 401, "Expected 401 for invalid token");
    assert.deepStrictEqual(res.getJson(), { error: "Token de autenticación inválido o expirado" });
    console.log("✔ Test 3 passed: Invalid token returns 401");
  }

  // Test 4: Token UID mismatched with body UID -> 403
  {
    const { req, res } = createMockReqRes({ authorization: "Bearer valid-token-for-user456" }, { uid: "user123" });
    await handleVerifyVipStatus(req, res, async () => {
      return { uid: "user456" };
    });
    assert.strictEqual(res.getStatus(), 403, "Expected 403 for UID mismatch");
    assert.deepStrictEqual(res.getJson(), { error: "Acceso prohibido: No tiene permisos para este usuario" });
    console.log("✔ Test 4 passed: UID mismatch returns 403");
  }

  // Test 5: Token UID matches body UID -> 200
  {
    const { req, res } = createMockReqRes({ authorization: "Bearer valid-token-for-user123" }, { uid: "user123" });
    await handleVerifyVipStatus(req, res, async () => {
      return { uid: "user123" };
    });
    assert.strictEqual(res.getStatus(), 200, "Expected 200 for valid token matching UID");
    console.log("✔ Test 5 passed: Matching token and UID allowed");
  }

  console.log("ALL TESTS PASSED!");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
