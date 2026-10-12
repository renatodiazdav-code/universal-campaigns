import { withUser } from "../../../../../src/application/auth-http.mjs";
import { loadMetaConnection } from "../../../../../src/application/meta-connection-store.mjs";
import { uploadMetaAdVideo } from "../../../../../src/connectors/meta/video-upload.mjs";

export const POST = withUser(async function POST(request, { user }) {
  try {
    const connection = await loadMetaConnection(user.id);

    if (!connection?.accessToken) {
      return Response.json(
        {
          status: "NOT_CONNECTED",
          error: "Meta is not connected",
        },
        {
          status: 401,
        }
      );
    }

    const adAccountId = connection.setup?.adAccount?.id;

    if (!adAccountId) {
      return Response.json(
        {
          status: "NEEDS_SETUP",
          error: "Meta ad account is not configured",
        },
        {
          status: 400,
        }
      );
    }

    const formData = await request.formData();
    const video = formData.get("video");

    if (!video || typeof video === "string") {
      return Response.json(
        {
          status: "ERROR",
          error: "A video file is required",
        },
        {
          status: 400,
        }
      );
    }

    if (
      video.type &&
      !String(video.type).toLowerCase().startsWith("video/")
    ) {
      return Response.json(
        {
          status: "ERROR",
          error: "Uploaded file must be a video",
        },
        {
          status: 400,
        }
      );
    }

    const title =
      String(formData.get("title") || video.name || "Relay video creative")
        .trim() || "Relay video creative";

    const uploaded = await uploadMetaAdVideo({
      adAccountId,
      accessToken: connection.accessToken,
      file: video,
      title,
    });

    return Response.json({
      status: "UPLOADED",
      videoId: uploaded.id,
      fileName: video.name || null,
    });
  } catch (error) {
    console.error("Meta video upload error:", error);

    return Response.json(
      {
        status: "ERROR",
        error: error.message || "Could not upload video to Meta",
      },
      {
        status: 500,
      }
    );
  }
});
