import test from "node:test";
import assert from "node:assert/strict";

import { uploadMetaAdVideo } from "../src/connectors/meta/video-upload.mjs";

function createJsonResponse(body, { ok = true } = {}) {
  return {
    ok,
    async json() {
      return body;
    },
  };
}

test("uploads a browser video file to Meta as multipart source", async () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl = null;
  let capturedOptions = null;

  globalThis.fetch = async (url, options = {}) => {
    capturedUrl = url;
    capturedOptions = options;
    return createJsonResponse({ id: "video-upload-123" });
  };

  try {
    const file = new File(
      [new Uint8Array([0, 1, 2, 3])],
      "product-video.mp4",
      {
        type: "video/mp4",
      }
    );

    const result = await uploadMetaAdVideo({
      adAccountId: "123",
      accessToken: "fake-token",
      file,
      title: "Product Video",
    });

    assert.equal(result.id, "video-upload-123");
    assert.match(capturedUrl, /\/act_123\/advideos$/);
    assert.equal(capturedOptions.method, "POST");
    assert.equal(capturedOptions.body instanceof FormData, true);
    assert.equal(capturedOptions.headers, undefined);
    assert.equal(
      capturedOptions.body.get("access_token"),
      "fake-token"
    );
    assert.equal(
      capturedOptions.body.get("title"),
      "Product Video"
    );

    const uploadedFile = capturedOptions.body.get("source");
    assert.equal(uploadedFile.name, "product-video.mp4");
    assert.equal(uploadedFile.type, "video/mp4");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects a non-video file before contacting Meta", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;

  globalThis.fetch = async () => {
    fetchCalled = true;
    return createJsonResponse({ id: "should-not-happen" });
  };

  try {
    const file = new File(
      ["not a video"],
      "product.txt",
      {
        type: "text/plain",
      }
    );

    await assert.rejects(
      () =>
        uploadMetaAdVideo({
          adAccountId: "act_123",
          accessToken: "fake-token",
          file,
        }),
      /must be a video/
    );

    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
